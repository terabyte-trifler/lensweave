// In-memory session store (resets on server restart) — great for hackathon demos.

export type Contributor = {
    address?: string
    cid: string
    url: string
    displayName?: string
  }
  
  export type Session = {
    id: string
    host?: string
    createdAt: number
    status: 'waiting' | 'ready' | 'composed'
    contributors: Contributor[]
    final?: { cid: string; url: string }
  }
  
  type Store = {
    sessions: Map<string, Session>
  }
  
  const g = globalThis as unknown as { __LW_STORE__?: Store }
  if (!g.__LW_STORE__) {
    g.__LW_STORE__ = { sessions: new Map() }
  }
  export const store = g.__LW_STORE__!
  
  export function createSession(host?: string) {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase()
    const s: Session = {
      id,
      host,
      createdAt: Date.now(),
      status: 'waiting',
      contributors: [],
    }
    store.sessions.set(id, s)
    return s
  }
  
  export function getSession(id: string) {
    return store.sessions.get(id)
  }
  
  export function listSessions() {
    return Array.from(store.sessions.values())
  }
  
  export function addContribution(id: string, c: Contributor) {
    const s = getSession(id)
    if (!s) throw new Error('session not found')
    s.contributors.push(c)
    s.status = s.contributors.length >= 2 ? 'ready' : 'waiting'
    return s
  }
  
  export function finalizeSession(id: string, final: { cid: string; url: string }) {
    const s = getSession(id)
    if (!s) throw new Error('session not found')
    s.final = final
    s.status = 'composed'
    return s
  }
  