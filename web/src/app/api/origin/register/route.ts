// src/app/api/origin/register/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/origin'

type CreatorIn = { address: string; shareBps: number }
type RegisterBody = {
  title?: string
  mediaCid?: string
  mediaUri?: string
  creators?: unknown
}

type OriginCreator = { wallet: string; shareBps: number }

function parseCreators(input: unknown): OriginCreator[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(
      (c: unknown): c is CreatorIn =>
        !!c &&
        typeof (c as { address?: unknown }).address === 'string' &&
        typeof (c as { shareBps?: unknown }).shareBps === 'number'
    )
    .map((c) => ({ wallet: c.address, shareBps: c.shareBps }))
}

export async function POST(req: NextRequest) {
  try {
    const body: RegisterBody = await req.json().catch(() => ({} as RegisterBody))
    const { title, mediaCid, mediaUri } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "title"' }, { status: 400 })
    }
    if (!mediaUri && !mediaCid) {
      return NextResponse.json(
        { error: 'Provide at least one of "mediaUri" (ipfs://...) or "mediaCid"' },
        { status: 400 }
      )
    }
    if (mediaUri && typeof mediaUri !== 'string') {
      return NextResponse.json({ error: 'Invalid "mediaUri"' }, { status: 400 })
    }
    if (mediaCid && typeof mediaCid !== 'string') {
      return NextResponse.json({ error: 'Invalid "mediaCid"' }, { status: 400 })
    }

    const creators = parseCreators(body.creators)

    const payload = {
      type: 'IMAGE',
      title,
      media: {
        uri: mediaUri ?? (mediaCid ? `ipfs://${mediaCid}` : undefined),
        cid: mediaCid ?? (mediaUri?.startsWith('ipfs://') ? mediaUri.slice('ipfs://'.length) : undefined),
        storage: 'ipfs' as const,
      },
      creators,
    }

    const { data } = await origin.post('/onboard/register', payload)
    // assuming Origin returns { id: string, ... }
    return NextResponse.json({ ok: true, contentId: data?.id, data })
  } catch (err: unknown) {
    // Try to surface helpful info from axios-like errors
    const axiosish = err as { response?: { data?: unknown; status?: number } ; message?: string }
    const msg =
      (axiosish?.response?.data && JSON.stringify(axiosish.response.data)) ||
      axiosish?.message ||
      'Origin register failed'
    const code = axiosish?.response?.status && Number.isInteger(axiosish.response.status)
      ? axiosish.response.status
      : 500
    console.error('Origin register error:', msg)
    return NextResponse.json({ error: msg }, { status: code })
  }
}
