'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'

export default function SessionHome() {
  const [joinId, setJoinId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    setCreating(true); setError(null)
    try {
      const res = await fetch('/api/sessions/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'create failed')
      location.href = `/session/${data.session.id}`
    } catch (e:unknown) {
      setError(e.message)
    } finally { setCreating(false) }
  }

  const join = async () => {
    if (!joinId.trim()) return
    location.href = `/session/${joinId.trim().toUpperCase()}`
  }

  return (
    <main>
      <Nav />
      <section className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h2 className="text-2xl font-semibold">Create or Join a Collaboration</h2>
        <div className="flex gap-3 items-center">
          <button onClick={create} disabled={creating} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
            {creating ? 'Creating…' : 'Create Session'}
          </button>
          <span className="text-gray-400">or</span>
          <input className="border rounded p-2 w-40 uppercase" placeholder="ABC123" value={joinId} onChange={e=>setJoinId(e.target.value)} />
          <button onClick={join} className="px-3 py-2 rounded bg-gray-200">Join</button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-sm text-gray-600">
          After creating, share the session ID with others so they can join and upload photos.
        </p>
      </section>
    </main>
  )
}
