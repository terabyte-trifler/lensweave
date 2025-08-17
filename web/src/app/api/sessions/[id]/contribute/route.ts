// src/app/api/sessions/[id]/contribute/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { addContribution } from '@/lib/sessionStore'

type ContribBody = {
  address?: string
  cid?: string
  url?: string
  displayName?: string
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const body: ContribBody = await req.json().catch(() => ({} as ContribBody))
    const { address, cid, url, displayName } = body

    if (!cid || !url) {
      return NextResponse.json({ error: 'missing cid/url' }, { status: 400 })
    }

    const session = addContribution(id, { address, cid, url, displayName })
    return NextResponse.json({ ok: true, session })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json(
      { error: err?.message || 'contribute failed' },
      { status: 500 }
    )
  }
}
