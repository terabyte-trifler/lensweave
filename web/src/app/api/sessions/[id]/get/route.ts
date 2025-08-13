export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/sessionStore'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const s = getSession(id)
  if (!s) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ ok: true, session: s })
}
