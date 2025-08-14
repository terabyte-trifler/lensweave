// src/app/api/origin/monetize/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/origin'

type HexAddress = `0x${string}`

type SplitInput = {
  wallet: HexAddress
  bps: number // basis points
}

type MonetizeBody = {
  contentId: string
  splits: SplitInput[]
}

function isHexAddress(s: unknown): s is HexAddress {
  return typeof s === 'string' && /^0x[a-fA-F0-9]{40}$/.test(s)
}

function isSplitArray(v: unknown): v is SplitInput[] {
  return Array.isArray(v) && v.every(
    (s) =>
      s &&
      typeof s === 'object' &&
      isHexAddress((s as SplitInput).wallet) &&
      Number.isInteger((s as SplitInput).bps) &&
      (s as SplitInput).bps >= 0
  )
}

function axiosishMessage(e: unknown): string {
  // Avoid `any`: narrow common shapes from axios-like clients
  if (e && typeof e === 'object') {
    const resp = (e as { response?: { data?: unknown; status?: number } }).response
    if (resp) {
      const payload = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data)
      return `Upstream error${resp.status ? ` (${resp.status})` : ''}: ${payload}`
    }
  }
  return e instanceof Error ? e.message : String(e)
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json()) as unknown
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { contentId, splits } = raw as Partial<MonetizeBody>

    if (!contentId || typeof contentId !== 'string') {
      return NextResponse.json({ error: '"contentId" is required' }, { status: 400 })
    }
    if (!isSplitArray(splits)) {
      return NextResponse.json(
        { error: '"splits" must be an array of { wallet: 0x..., bps: number }' },
        { status: 400 }
      )
    }

    // Optional sanity check: splits sum to 10000 bps (100%)
    const totalBps = splits.reduce((acc, s) => acc + s.bps, 0)
    if (totalBps !== 10_000) {
      return NextResponse.json(
        { error: 'Sum of "bps" in splits must equal 10000 (100%)' },
        { status: 400 }
      )
    }

    const { data } = await origin.post('/monetize/splits', { contentId, splits })

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    const msg = axiosishMessage(e) || 'Monetize config failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
