export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { listSessions } from '@/lib/sessionStore'

export async function GET() {
  return NextResponse.json({ ok: true, sessions: listSessions() })
}
