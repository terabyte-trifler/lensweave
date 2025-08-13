// web/src/app/api/compose/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

/**
 * Blends 2–6 images into a single 1024×1024 PNG using soft radial masks
 * and rotating blend modes, then uploads the result to Pinata (IPFS).
 *
 * Expects multipart/form-data with fields:
 *   files: File[]  (2–6 images)
 *
 * Env:
 *   PINATA_JWT=eyJ...   (Pinata JWT token)
 *   NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs (optional, for previews)
 */

const MAX_IMAGES = 6
const SIZE = 1024

function getPinataJwt(): string {
  const raw = (process.env.PINATA_JWT || '').trim()
  if (!raw) throw new Error('PINATA_JWT missing on server')
  if (!raw.startsWith('eyJ')) throw new Error('PINATA_JWT does not look like a JWT (should start with "eyJ")')
  return raw
}

async function pinataUploadBuffer(buf: Buffer, filename: string, jwt: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type: 'image/png' }), filename || 'image.png')

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: fd as any,
  })

  const raw = await res.text()
  let json: any = null
  try { json = JSON.parse(raw) } catch { /* not JSON */ }

  if (!res.ok) {
    const details = json ?? raw
    throw new Error(
      `Pinata upload failed (status ${res.status}): ${
        typeof details === 'string' ? details : JSON.stringify(details)
      }`
    )
  }

  const cid = (json || {}).IpfsHash as string
  if (!cid) throw new Error(`Pinata response missing IpfsHash: ${raw}`)
  return cid
}

// Soft radial mask SVG used for compositing
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
    const files = form
      .getAll('files')
      .filter((f): f is File => f instanceof File)
      .slice(0, MAX_IMAGES)

    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded. Send field "files" (2–6 images).' }, { status: 400 })
    }
    if (files.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 images to compose.' }, { status: 400 })
    }

    // Normalize inputs to SIZE×SIZE PNGs
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

    // Start from first image
    let base = normalized[0]

    // Blend subsequent images using radial masks and rotating blend modes
    const modes = ['overlay', 'soft-light', 'screen', 'multiply', 'lighten', 'darken'] as const
    for (let i = 1; i < normalized.length; i++) {
      const masked = await sharp(normalized[i])
        .composite([{ input: radialMaskSVG(SIZE, i / normalized.length), blend: 'dest-in' }])
        .toBuffer()

      base = await sharp(base)
        .composite([{ input: masked, blend: modes[i % modes.length] }])
        .toBuffer()
    }

    // Subtle final grade
    const finalPng = await sharp(base)
      .modulate({ saturation: 1.05, brightness: 1.02 })
      .sharpen()
      .png()
      .toBuffer()

    const cid = await pinataUploadBuffer(finalPng, 'lensweave-composite.png', jwt)
    const url = `ipfs://${cid}`
    const gateway =
      `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'}/${cid}`

    return NextResponse.json({
      cid,
      url,
      gateway,
      size: SIZE,
      count: normalized.length,
    })
  } catch (e: any) {
    const msg = e?.message || 'compose failed'
    console.error('compose error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
