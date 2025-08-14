import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/origin'

// Body: { parentId: string, title: string, mediaCid: string, mediaUri: string, creators: [{wallet, shareBps}] }
export async function POST(req: NextRequest) {
  try {
    const { parentId, title, mediaCid, mediaUri, creators } = await req.json()
    const payload = {
      parentId,
      type: 'IMAGE',
      title,
      media: { uri: mediaUri, cid: mediaCid, storage: 'ipfs' },
      creators,
    }
    const { data } = await origin.post(`/remix/create`, payload)
    return NextResponse.json({ ok: true, remixId: data.id, data })
  } catch (e: unknown) {
    const msg = e?.response?.data || e?.message || 'Remix create failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
