// web/src/app/api/upload/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

/** Read and sanity-check the Pinata JWT from env */
function getPinataJwt() {
  const raw = (process.env.PINATA_JWT || '').trim()
  if (!raw) throw new Error('PINATA_JWT missing on server')
  if (!raw.startsWith('eyJ')) {
    throw new Error('PINATA_JWT does not look like a JWT (should start with "eyJ")')
  }
  return raw
}

/** Upload a Buffer to pinFileToIPFS and return a CID */
async function pinataUploadBuffer(buf: Buffer, filename: string, jwt: string) {
  const fd = new FormData()
  fd.append('file', new Blob([buf], { type: 'application/octet-stream' }), filename || 'upload')

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
    throw new Error(`Pinata upload failed (status ${res.status}): ${typeof details === 'string' ? details : JSON.stringify(details)}`)
  }

  const cid = (json || {}).IpfsHash as string
  if (!cid) throw new Error(`Pinata response missing IpfsHash: ${raw}`)
  return cid
}

export async function POST(req: NextRequest) {
  try {
    const jwt = getPinataJwt()

    const form = await req.formData()

    // Accept either single "file" or first item of "files"
    let file = form.get('file')
    if (!file) {
      const many = form.getAll('files')
      if (many?.length) file = many[0] as File
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided. Send field "file" or "files".' }, { status: 400 })
    }

    // Basic guardrails: ~20 MB max (tune as you like)
    const size = (file as File).size ?? 0
    const MAX = 20 * 1024 * 1024
    if (size > MAX) {
      return NextResponse.json({ error: `File too large (${size} bytes). Max ${MAX} bytes.` }, { status: 413 })
    }

    const filename = (file as File).name || 'upload'
    const buf = Buffer.from(await (file as File).arrayBuffer())
    const cid = await pinataUploadBuffer(buf, filename, jwt)

    return NextResponse.json({
      cid,
      url: `ipfs://${cid}`,
      gateway: `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'}/${cid}`,
    })
  } catch (e: any) {
    const msg = e?.message || 'upload failed'
    console.error('pinata upload error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
