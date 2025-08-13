// Simple in-memory cache of recently minted items (survives until server restarts).
export type GalleryItem = {
    tokenId: string
    metadataUri: string
    image?: string
    creators?: string[]
    sharesBps?: (number | string)[]
    royaltyBps?: number | string
    txHash?: `0x${string}`
    blockNumber?: string
    ts?: number
  }
  
  type Store = {
    items: Map<string, GalleryItem> // key = tokenId
  }
  
  const g = globalThis as any
  if (!g.__LW_GALLERY__) g.__LW_GALLERY__ = { items: new Map() } as Store
  export const galleryStore: Store = g.__LW_GALLERY__
  
  export function upsertGalleryItem(item: GalleryItem) {
    item.ts = Date.now()
    galleryStore.items.set(item.tokenId, item)
  }
  
  export function listGalleryItems(): GalleryItem[] {
    return Array.from(galleryStore.items.values())
      .sort((a,b) => (Number(b.blockNumber||0) - Number(a.blockNumber||0)) || ((b.ts||0)-(a.ts||0)))
  }
  