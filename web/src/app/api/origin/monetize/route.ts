import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/origin'

// Body: { contentId: string, splits: [{ wallet: "0x...", bps: number }] }
export async function POST(req: NextRequest) {
  try {
    const { contentId, splits } = await req.json()
    const { data } = await origin.post(`/monetize/splits`, { contentId, splits })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    const msg = e?.response?.data || e?.message || 'Monetize config failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
