// src/app/gallery/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'

type OnchainItem = {
  tokenId: string
  image?: string
  metadataUri: string
  creators?: string[]
  sharesBps?: (number | string)[]
}

type PageInfo = {
  nextCursor: string | null
  latest: string
  span: string
  chunksScanned: number
  target: number
}

function getErrMsg(e: unknown): string {
  if (e instanceof Error && typeof e.message === 'string') {
    return e.message
  }
  return 'failed to load gallery'
}

export default function GalleryPage() {
  const [items, setItems] = useState<OnchainItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState<PageInfo | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = async (cursor?: string) => {
    const url = cursor
      ? `/api/gallery/onchain?cursor=${encodeURIComponent(cursor)}`
      : '/api/gallery/onchain'
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'failed to load gallery')
    return data as { items: OnchainItem[]; page: PageInfo }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await load()
        setItems(data.items || [])
        setPage(data.page || null)
      } catch (e: unknown) {
        setError(getErrMsg(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const loadMore = async () => {
    if (!page?.nextCursor) return
    try {
      setLoadingMore(true)
      const data = await load(page.nextCursor)
      setItems(prev => [...prev, ...(data.items || [])])
      setPage(data.page || null)
    } catch (e: unknown) {
      setError(getErrMsg(e))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <main>
      <Nav />
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">On-chain Gallery</h1>

        {loading && <p className="text-gray-500">Loading your gallery…</p>}
        {error && <p className="text-red-600">Error: {error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="text-gray-500">No minted items yet. Mint from a session to see it here.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
          {items.map((item) => (
            <div
              key={item.tokenId || item.metadataUri}
              className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={`Token #${item.tokenId}`}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-500">
                  No image
                </div>
              )}
              <div className="p-4 space-y-1">
                <p className="font-medium">Token #{item.tokenId}</p>
                <p className="text-xs text-gray-600 break-all">Metadata: {item.metadataUri}</p>
                {!!item.creators?.length && (
                  <p className="text-xs text-gray-500">{item.creators.length} creators</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {page?.nextCursor && (
          <div className="mt-8">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
