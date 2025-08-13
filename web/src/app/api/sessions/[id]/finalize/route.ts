export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { finalizeSession } from '@/lib/sessionStore'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { cid, url } = await req.json()
    if (!cid || !url) return NextResponse.json({ error: 'missing cid/url' }, { status: 400 })
    const s = finalizeSession(id, { cid, url })
    return NextResponse.json({ ok: true, session: s })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'finalize failed' }, { status: 500 })
  }
}
