export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { addContribution } from '@/lib/sessionStore'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { address, cid, url, displayName } = await req.json()
    if (!cid || !url) return NextResponse.json({ error: 'missing cid/url' }, { status: 400 })
    const s = addContribution(id, { address, cid, url, displayName })
    return NextResponse.json({ ok: true, session: s })
  } catch (e: unknown) {
    return NextResponse.json({ error: e?.message || 'contribute failed' }, { status: 500 })
  }
}
