import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/origin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, mediaCid, mediaUri, creators } = body
    // creators: array of { address: "0x...", shareBps: number } (optional on initial register)
    const payload = {
      type: 'IMAGE',
      title,
      media: { uri: mediaUri, cid: mediaCid, storage: 'ipfs' },
      creators: creators?.map((c:unknown) => ({ wallet: c.address, shareBps: c.shareBps })) ?? [],
    }
    const { data } = await origin.post('/onboard/register', payload)
    return NextResponse.json({ ok: true, contentId: data.id, data })
  } catch (e: unknown) {
    const msg = e?.response?.data || e?.message || 'Origin register failed'
    console.error(msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
