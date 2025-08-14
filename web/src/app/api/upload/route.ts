// web/src/app/api/upload/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/upload
 * form-data: file=<File>
 * env: PINATA_JWT=eyJ...  (Pinata JWT)
 * returns: { cid, url }
 */

function getPinataJwt(): string {
  const raw = (process.env.PINATA_JWT || '').trim()
  if (!raw) throw new Error('PINATA_JWT missing on server')
  if (!raw.startsWith('eyJ')) throw new Error('PINATA_JWT is not a JWT (should start with "eyJ")')
  return raw
}

export async function POST(req: NextRequest) {
  try {
    const jwt = getPinataJwt()

    // 1) Read form-data and validate file
    const form = await req.formData()
    const f = form.get('file')
    if (!f || !(f instanceof File)) {
      return NextResponse.json({ error: 'No file provided (form field "file")' }, { status: 400 })
    }

    // 2) Build a new multipart body for Pinata
    // Pinata requires its own FormData with the file field name "file"
    const fd = new FormData()
    // You can pass through the original filename & type
    fd.append('file', f, (f as File).name)

    // (optional) attach pinataMetadata / pinataOptions here if you want
    // fd.append('pinataMetadata', new Blob([JSON.stringify({ name: 'lensweave-upload' })], { type: 'application/json' }))
    // fd.append('pinataOptions', new Blob([JSON.stringify({ cidVersion: 1 })], { type: 'application/json' }))

    // 3) Upload to Pinata
    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        // DO NOT set Content-Type manually; fetch will set the correct multipart boundary
      },
      body: fd, // <-- this is the fix (no stray cast)
    })

    const rawText = await res.text()
    // Pinata success: { IpfsHash, PinSize, Timestamp }
    type PinataFileResp = { IpfsHash?: string; PinSize?: number; Timestamp?: string }
    let json: PinataFileResp | null = null
    try { json = JSON.parse(rawText) as PinataFileResp } catch { /* keep rawText for error reporting */ }

    if (!res.ok || !json || !json.IpfsHash) {
      const details = json ?? rawText
      return NextResponse.json(
        { error: `pinFileToIPFS failed (status ${res.status}): ${typeof details === 'string' ? details : JSON.stringify(details)}` },
        { status: 500 }
      )
    }

    const cid = json.IpfsHash
    return NextResponse.json({ cid, url: `ipfs://${cid}` })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
