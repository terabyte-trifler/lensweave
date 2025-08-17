// src/app/api/origin/remix/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/origin'

type CreatorIn = { wallet: string; shareBps: number }
type RemixBody = {
  parentId?: string
  title?: string
  mediaCid?: string
  mediaUri?: string
  creators?: unknown
}

function parseCreators(input: unknown): CreatorIn[] {
  if (!Array.isArray(input)) return []
  return input.filter((c: unknown): c is CreatorIn => {
    return !!c &&
      typeof (c as CreatorIn).wallet === 'string' &&
      typeof (c as CreatorIn).shareBps === 'number'
  })
}

export async function POST(req: NextRequest) {
  try {
    const body: RemixBody = await req.json().catch(() => ({} as RemixBody))
    const { parentId, title, mediaCid, mediaUri } = body

    if (!parentId || typeof parentId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "parentId"' }, { status: 400 })
    }
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
      parentId,
      type: 'IMAGE' as const,
      title,
      media: {
        uri: mediaUri ?? (mediaCid ? `ipfs://${mediaCid}` : undefined),
        cid: mediaCid ?? (mediaUri?.startsWith('ipfs://') ? mediaUri.slice('ipfs://'.length) : undefined),
        storage: 'ipfs' as const,
      },
      creators,
    }

    const { data } = await origin.post('/remix/create', payload)
    return NextResponse.json({ ok: true, remixId: data?.id, data })
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown; status?: number }; message?: string }
    const msg =
      (err.response?.data && (typeof err.response.data === 'string'
        ? err.response.data
        : JSON.stringify(err.response.data))) ||
      err.message ||
      'Remix create failed'
    const code = Number.isInteger(err.response?.status) ? (err.response!.status as number) : 500
    return NextResponse.json({ error: msg }, { status: code })
  }
}
