'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Nav from '@/components/Nav'
import MultiUpload from '@/components/MultiUpload'
import MintPanel from '@/components/MintPanel'
import { useAccount } from 'wagmi'

type Session = {
  id: string
  status: 'waiting'|'ready'|'composed'
  contributors: { address?: string; cid: string; url: string; displayName?: string }[]
  final?: { cid: string; url: string }
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const { address } = useAccount()
  const [session, setSession] = useState<Session | null>(null)
  const [busy, setBusy] = useState(false)
  const [imageIpfsUri, setImageIpfsUri] = useState<string | undefined>(undefined)

  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'

  const load = async () => {
    const res = await fetch(`/api/sessions/${id}/get`)
    const data = await res.json()
    if (res.ok) setSession(data.session)
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  const equalShares = useMemo(() => {
    const n = session?.contributors?.length || 0
    if (n === 0) return ''
    const bps = Math.floor(10000 / n)
    const last = 10000 - (bps * (n - 1))
    return Array.from({ length: n }, (_, i) => i === n-1 ? last : bps).join(',')
  }, [session])

  const creatorList = useMemo(() => {
    return session?.contributors?.map(c => c.address || '0x')?.join(',') || ''
  }, [session])

  const onComposed = async (r: { cid: string; url: string }) => {
    setImageIpfsUri(r.url)
    setBusy(true)
    try {
      const res = await fetch(`/api/sessions/${id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cid: r.cid, url: r.url })
      })
      if (res.ok) await load()
    } finally { setBusy(false) }
  }

  const addContribution = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const up = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await up.json()
    if (!up.ok) throw new Error(data.error || 'upload failed')

    await fetch(`/api/sessions/${id}/contribute`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ address, cid: data.cid, url: data.url })
    })
    await load()
  }

  return (
    <main>
      <Nav />
      <section className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Session {id}</h2>
          <span className={`text-xs px-2 py-1 rounded ${session?.status==='composed'?'bg-emerald-100 text-emerald-700':session?.status==='ready'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-700'}`}>
            {session?.status || '…'}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold">Contributors</h3>
            <ul className="space-y-2">
              {session?.contributors?.map((c, i) => (
                <li key={i} className="flex items-center gap-3">
                  <img src={`${gateway}/${c.cid}`} className="w-14 h-14 object-cover rounded-lg border" />
                  <div className="text-sm">
                    <div className="font-medium">{c.displayName || c.address || 'Anon'}</div>
                    <div className="text-gray-500 break-all">{c.cid}</div>
                  </div>
                </li>
              ))}
              {(!session || session.contributors.length === 0) && (
                <li className="text-sm text-gray-500">No contributions yet.</li>
              )}
            </ul>

            <label className="text-sm font-medium">Add your photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => { const f=e.target.files?.[0]; if (f) addContribution(f).catch(err=>alert(err.message)) }}
              className="block border rounded p-2"
            />

            <p className="text-xs text-gray-500">
              Or use the composer below to blend multiple photos at once.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Compose Artwork</h3>
            <MultiUpload onComposed={(r)=>onComposed(r)} />

            {session?.final && (
              <div className="space-y-2">
                <h4 className="font-semibold">Final</h4>
                <img src={`${gateway}/${session.final.cid}`} className="rounded-xl border" />
                <div className="text-sm">IPFS: <code className="break-all">{session.final.url}</code></div>
              </div>
            )}

            <h3 className="font-semibold pt-4">Mint</h3>
            <MintPanel imageIpfsUri={imageIpfsUri || session?.final?.url} />
            <div className="text-xs text-gray-500">
              Prefill creators: {creatorList || '(enter contributors)'}<br/>
              Prefill shares (bps): {equalShares || '(e.g., 5000,5000)'}
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Share this link to invite others: <code className="break-all">{typeof window!=='undefined' ? window.location.href : ''}</code>
        </div>
      </section>
    </main>
  )
}
