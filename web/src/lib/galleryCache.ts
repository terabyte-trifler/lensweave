// src/lib/galleryCache.ts
export type GalleryItem = {
    tokenId: string
    metadataUri: string
    image: string
    creators: string[]
    sharesBps: string[]
    royaltyBps: string
    txHash?: `0x${string}`
    blockNumber?: string
  }
  
  class GalleryStore {
    items = new Map<string, GalleryItem>()
  
    list(): GalleryItem[] {
      return Array.from(this.items.values())
    }
  
    upsert(item: GalleryItem): void {
      this.items.set(item.tokenId, item)
    }
  }
  
  export const galleryStore = new GalleryStore()
  
  export function listGalleryItems(): GalleryItem[] {
    return galleryStore.list()
  }
  
  export function upsertGalleryItem(item: GalleryItem): void {
    galleryStore.upsert(item)
  }
  