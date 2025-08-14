// web/src/app/api/gallery/record/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import {
  createPublicClient,
  http,
  decodeEventLog,
} from 'viem'
import { basecamp } from '@/lib/chain'
import { LensWeaveCollectiveABI } from '@/abi/LensWeaveCollective'
import { galleryStore, upsertGalleryItem } from '@/lib/galleryCache'

const CONTRACT = process.env.NEXT_PUBLIC_LENSWEAVE_ADDRESS as `0x${string}`
const RPC = process.env.NEXT_PUBLIC_BASECAMP_RPC as string
const GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'

function ipfsToHttp(u?: string) {
  if (!u) return ''
  return u.startsWith('ipfs://') ? `${GATEWAY}/${u.slice('ipfs://'.length)}` : u
}

export async function POST(req: NextRequest) {
  try {
    if (!CONTRACT || !RPC) {
      return NextResponse.json(
        { error: 'Missing contract address or RPC' },
        { status: 500 }
      )
    }

    const { txHash } = await req.json()
    if (!txHash) return NextResponse.json({ error: 'Missing txHash' }, { status: 400 })

    const client = createPublicClient({ chain: basecamp, transport: http(RPC) })

    // Wait for this tx to be mined
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    })

    // Try to decode Minted events from this receipt
    const decoded = receipt.logs.flatMap((log) => {
      try {
        const d = decodeEventLog({
          abi: LensWeaveCollectiveABI as const,
          data: log.data,
          topics: log.topics,
        })
        return d.eventName === 'Minted' ? [d] : []
      } catch {
        return []
      }
    })

    if (!decoded.length) {
      return NextResponse.json({ error: 'No Minted event found in tx' }, { status: 422 })
    }

    const ev = decoded[0] as {
      eventName: 'Minted'
      args: {
        tokenId: bigint
        uri: string
        creators: readonly `0x${string}`[]
        sharesBps: readonly bigint[]
        royaltyBps: bigint
      }
    }

    const tokenId = ev.args.tokenId.toString()
    let tokenUri = ev.args.uri

    if (!tokenUri) {
      tokenUri = (await client.readContract({
        address: CONTRACT,
        abi: LensWeaveCollectiveABI as const,
        functionName: 'tokenURI',
        args: [ev.args.tokenId],
      })) as string
    }

    // Best-effort fetch of metadata to extract image
    let image = ''
    try {
      const r = await fetch(ipfsToHttp(tokenUri))
      if (r.ok) {
        const meta = await r.json().catch(() => null as any)
        if (meta?.image) image = ipfsToHttp(meta.image)
      }
    } catch { /* ignore */ }

    // viem returns readonly arrays; copy to mutable for your cache types
    const creators = Array.from(ev.args.creators)
    const sharesBps = Array.from(ev.args.sharesBps)

    upsertGalleryItem({
      tokenId,
      metadataUri: tokenUri,
      image,
      creators,                      // string[]
      sharesBps: sharesBps.map(String),
      royaltyBps: ev.args.royaltyBps.toString(),
      txHash: txHash as `0x${string}`,
      blockNumber: receipt.blockNumber?.toString(),
    })

    return NextResponse.json({ ok: true, saved: galleryStore.items.get(tokenId) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'record failed' }, { status: 500 })
  }
}
