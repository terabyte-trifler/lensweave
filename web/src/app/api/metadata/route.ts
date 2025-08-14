// web/src/app/api/metadata/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

/**
 * Shape of the request body for POST /api/metadata
 */
interface MetadataRequest {
  name: string
  description?: string
  imageUri: string // ipfs://... from upload/compose step
  originContentId?: string
  attributes?: Array<{ trait_type: string; value: string | number }>
}

/**
 * Shape of the metadata object that gets pinned to IPFS.
 * Based on ERC-721 metadata schema.
 */
interface ERC721Metadata {
  name: string
  description: string
  image: string
  attributes: Array<{ trait_type: string; value: string | number }>
}

/**
 * Shape of Pinata's JSON response for pinJSONToIPFS
 */
interface PinataPinJSONResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
}

function getPinataJwt(): string {
  const raw = (process.env.PINATA_JWT || '').trim()
  if (!raw) throw new Error('PINATA_JWT missing on server')
  if (!raw.startsWith('eyJ')) throw new Error('PINATA_JWT is not a JWT (should start with "eyJ")')
  return raw
}

export async function POST(req: NextRequest) {
  try {
    const jwt = getPinataJwt()

    const body: unknown = await req.json().catch(() => ({}))
    const { name, description, imageUri, attributes, originContentId } = body as MetadataRequest

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing "name"' }, { status: 400 })
    }
    if (!imageUri || typeof imageUri !== 'string' || !imageUri.startsWith('ipfs://')) {
      return NextResponse.json(
        { error: 'Invalid "imageUri" (must be ipfs://...)' },
        { status: 400 },
      )
    }

    // Build ERC-721 metadata
    const metadata: ERC721Metadata = {
      name,
      description: description || '',
      image: imageUri,
      attributes: Array.isArray(attributes) ? [...attributes] : [],
    }

    // Add Origin link if provided
    if (originContentId) {
      metadata.attributes.push({
        trait_type: 'origin_content_id',
        value: originContentId,
      })
    }

    // Pin JSON to Pinata
    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    })

    const raw = await res.text()
    let json: PinataPinJSONResponse | null = null
    try {
      json = JSON.parse(raw) as PinataPinJSONResponse
    } catch {
      // Keep json as null if parsing fails
    }

    if (!res.ok || !json) {
      const details = json ?? raw
      return NextResponse.json(
        {
          error: `pinJSONToIPFS failed (status ${res.status}): ${
            typeof details === 'string' ? details : JSON.stringify(details)
          }`,
        },
        { status: 500 },
      )
    }

    const cid = json.IpfsHash
    if (!cid) {
      return NextResponse.json({ error: `Pinata response missing IpfsHash: ${raw}` }, { status: 500 })
    }

    const uri = `ipfs://${cid}`
    return NextResponse.json({ cid, uri, metadata })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'metadata build failed'
    console.error('metadata error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
