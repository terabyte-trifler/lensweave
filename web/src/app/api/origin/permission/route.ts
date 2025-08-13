import { NextRequest, NextResponse } from 'next/server'
import { origin } from '@/lib/origin'

// Body: { contentId: "origin-content-id", policy: { commercial:true, derivatives:true, attribution:true, ... } }
export async function POST(req: NextRequest) {
  try {
    const { contentId, policy } = await req.json()
    const { data } = await origin.post(`/permission/grant`, { contentId, policy })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    const msg = e?.response?.data || e?.message || 'Permissioning failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
