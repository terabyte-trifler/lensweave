// web/src/app/api/compose/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

/**
 * Blends 2–6 images into a single 1024×1024 PNG using soft radial masks
 * and rotating blend modes, then uploads the result to Pinata (IPFS).
 *
 * POST multipart/form-data:
 *   files: File[]  (2–6 images)
 *
 * Env (Server):
 *   PINATA_JWT=eyJ...  (Pinata JWT token)
 *   NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs (optional)
 */

const MAX_IMAGES = 6
const SIZE = 1024

function getPinataJwt(): string {
  const raw = (process.env.PINATA_JWT || '').trim()
  if (!raw) throw new Error('PINATA_JWT missing on server')
  if (!raw.startsWith('eyJ')) throw new Error('PINATA_JWT does not look like a JWT (should start with "eyJ")')
  return raw
}

/** Convert Node Buffer/Uint8Array to ArrayBuffer for Blob/FormData typing */
function toArrayBuffer(input: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (input instanceof ArrayBuffer) return input
  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
}

/** Upload a PNG buffer to Pinata and return CID */
async function pinataUploadBuffer(
  buf: Uint8Array | ArrayBuffer,
  filename: string,
  jwt: string
): Promise<string> {
  const ab = toArrayBuffer(buf)
  const fd = new FormData()
  // Use Blob (portable in Node’s Web API typings)
  fd.append('file', new Blob([ab], { type: 'image/png' }), filename || 'image.png')

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd,
  })

  const raw = await res.text()
  type PinataFileResp = { IpfsHash?: string; PinSize?: number; Timestamp?: string }
  let json: PinataFileResp | null = null
  try { json = JSON.parse(raw) as PinataFileResp } catch { /* raw not JSON */ }

  if (!res.ok || !json?.IpfsHash) {
    throw new Error(`pinFileToIPFS failed (${res.status}): ${raw}`)
  }
  return json.IpfsHash
}

/** Soft radial mask SVG used for compositing */
function radialMaskSVG(size: number, offsetPct = 0) {
  const r = size * 0.55
  const cx = size / 2 + size * 0.18 * Math.sin(offsetPct * Math.PI * 2)
  const cy = size / 2 + size * 0.18 * Math.cos(offsetPct * Math.PI * 2)
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">
          <stop offset="60%" stop-color="white" stop-opacity="1"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="black"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g)"/>
    </svg>`
  )
}

export async function POST(req: NextRequest) {
  try {
    const jwt = getPinataJwt()

    const form = await req.formData()
    const files = form.getAll('files').filter((f): f is File => f instanceof File).slice(0, MAX_IMAGES)

    if (!files.length) {
      return NextResponse.json(
        { error: 'No files uploaded. Send field "files" (2–6 images).' },
        { status: 400 }
      )
    }
    if (files.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 images to compose.' },
        { status: 400 }
      )
    }

    // 1) Normalize inputs to SIZE×SIZE PNGs
    const normalized: Buffer[] = []
    for (const f of files) {
      const buf = Buffer.from(await f.arrayBuffer())
      if (buf.byteLength > 25 * 1024 * 1024) {
        return NextResponse.json({ error: 'One of the files is too large (>25MB).' }, { status: 413 })
      }
      const out = await sharp(buf)
        .rotate() // auto-orient by EXIF
        .resize(SIZE, SIZE, { fit: 'cover' })
        .png()
        .toBuffer()
      normalized.push(out)
    }

    // 2) Start from first image
    let base = normalized[0]

    // 3) Blend subsequent images using radial masks and rotating blend modes
    const modes = ['overlay', 'soft-light', 'screen', 'multiply', 'lighten', 'darken'] as const
    for (let i = 1; i < normalized.length; i++) {
      const masked = await sharp(normalized[i])
        .composite([{ input: radialMaskSVG(SIZE, i / normalized.length), blend: 'dest-in' }])
        .toBuffer()

      base = await sharp(base)
        .composite([{ input: masked, blend: modes[i % modes.length] }])
        .toBuffer()
    }

    // 4) Subtle final grade
    const finalPng = await sharp(base)
      .modulate({ saturation: 1.05, brightness: 1.02 })
      .sharpen()
      .png()
      .toBuffer()

    // 5) Upload to IPFS via Pinata
    const cid = await pinataUploadBuffer(finalPng, 'lensweave-composite.png', jwt)
    const url = `ipfs://${cid}`
    const gateway = `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'}/${cid}`

    return NextResponse.json({
      cid,
      url,
      gateway,
      size: SIZE,
      count: normalized.length,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'compose failed'
    console.error('compose error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
