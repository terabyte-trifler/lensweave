// src/app/api/origin/permission/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/origin'

type PermissionPolicy = {
  // Common fields – extend as Origin’s spec evolves.
  commercial?: boolean
  derivatives?: boolean
  attribution?: boolean
  // Allow additional custom flags:
  [key: string]: unknown
}

type PermissionBody = {
  contentId: string
  policy: PermissionPolicy
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function isPermissionPolicy(v: unknown): v is PermissionPolicy {
  if (!isPlainObject(v)) return false
  // Minimal validation: ensure keys map to JSON-serializable primitives
  for (const [k, val] of Object.entries(v)) {
    const t = typeof val
    if (!['boolean', 'number', 'string', 'object'].includes(t) && val !== null) return false
    // You can tighten this if Origin requires booleans only:
    // if (!['commercial','derivatives','attribution'].includes(k) || typeof val !== 'boolean') return false
  }
  return true
}

function axiosishMessage(e: unknown): string {
  if (e && typeof e === 'object') {
    const resp = (e as { response?: { data?: unknown; status?: number } }).response
    if (resp) {
      const payload =
        typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data)
      return `Upstream error${resp.status ? ` (${resp.status})` : ''}: ${payload}`
    }
  }
  return e instanceof Error ? e.message : String(e)
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json()) as unknown
    if (!isPlainObject(raw)) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { contentId, policy } = raw as Partial<PermissionBody>

    if (!contentId || typeof contentId !== 'string') {
      return NextResponse.json({ error: '"contentId" is required' }, { status: 400 })
    }
    if (!isPermissionPolicy(policy)) {
      return NextResponse.json(
        { error: '"policy" must be an object of permission flags' },
        { status: 400 },
      )
    }

    const { data } = await origin.post('/permission/grant', { contentId, policy })
    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    const msg = axiosishMessage(e) || 'Permissioning failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
