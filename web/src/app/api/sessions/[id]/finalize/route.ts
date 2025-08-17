// src/app/api/sessions/[id]/finalize/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { finalizeSession } from '@/lib/sessionStore'

type FinalizeBody = {
  cid?: string
  url?: string
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const body: FinalizeBody = await req.json().catch(() => ({} as FinalizeBody))
    const { cid, url } = body

    if (!cid || !url) {
      return NextResponse.json({ error: 'missing cid/url' }, { status: 400 })
    }

    const session = finalizeSession(id, { cid, url })
    return NextResponse.json({ ok: true, session })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json(
      { error: err?.message || 'finalize failed' },
      { status: 500 }
    )
  }
}
