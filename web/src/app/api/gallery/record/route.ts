// web/src/app/api/gallery/record/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import {
  createPublicClient,
  http,
  decodeEventLog,
  type Abi,
} from 'viem'
import { basecamp } from '@/lib/chain'
import { LensWeaveCollectiveABI } from '@/abi/LensWeaveCollective'
import { galleryStore, upsertGalleryItem } from '@/lib/galleryCache'

type Hex = `0x${string}`

/** Shape of the Minted event we expect from the contract. */
type MintedDecoded = {
  eventName: 'Minted'
  args: {
    tokenId: bigint
    uri: string
    creators: readonly `0x${string}`[]
    sharesBps: readonly bigint[]
    royaltyBps: bigint
  }
}

const CONTRACT = process.env.NEXT_PUBLIC_LENSWEAVE_ADDRESS as `0x${string}`
const RPC = process.env.NEXT_PUBLIC_BASECAMP_RPC as string
const GATEWAY =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'

/** Use a single Abi-cast to keep viem happy without `as const` at callsites. */
const ABI = LensWeaveCollectiveABI as unknown as Abi

function ipfsToHttp(u?: string) {
  if (!u) return ''
  return u.startsWith('ipfs://') ? `${GATEWAY}/${u.slice('ipfs://'.length)}` : u
}

export async function POST(req: NextRequest) {
  try {
    if (!CONTRACT || !RPC) {
      return NextResponse.json(
        { error: 'Missing contract address or RPC' },
        { status: 500 },
      )
    }

    const body = (await req.json()) as unknown
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const { txHash } = body as { txHash?: string }
    if (!txHash) {
      return NextResponse.json({ error: 'Missing txHash' }, { status: 400 })
    }

    const client = createPublicClient({ chain: basecamp, transport: http(RPC) })

    // Wait for this tx to be mined
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as Hex,
    })

    // Decode only our Minted events from this receipt
    const decoded = receipt.logs.flatMap((log) => {
      try {
        const d = decodeEventLog({
          abi: ABI,
          data: log.data,
          topics: log.topics,
        })
        return d.eventName === 'Minted' ? [d as unknown as MintedDecoded] : []
      } catch {
        return []
      }
    })

    if (decoded.length === 0) {
      return NextResponse.json(
        { error: 'No Minted event found in tx' },
        { status: 422 },
      )
    }

    const ev = decoded[0]
    const tokenId = ev.args.tokenId.toString()
    let tokenUri = ev.args.uri

    // Fallback to tokenURI() if event had empty URI
    if (!tokenUri) {
      tokenUri = (await client.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: 'tokenURI',
        args: [ev.args.tokenId],
      })) as string
    }

    // Best-effort fetch of metadata to extract image
    let image = ''
    try {
      const r = await fetch(ipfsToHttp(tokenUri))
      if (r.ok) {
        const meta = (await r.json().catch(() => null)) as { image?: string } | null
        if (meta?.image) image = ipfsToHttp(meta.image)
      }
    } catch {
      // Ignore per-item fetch errors
    }

    // viem returns readonly arrays; copy to mutable arrays for our cache types
    const creators = Array.from(ev.args.creators)
    const sharesBps = Array.from(ev.args.sharesBps)

    upsertGalleryItem({
      tokenId,
      metadataUri: tokenUri,
      image,
      creators,                       // string[]
      sharesBps: sharesBps.map(String),
      royaltyBps: ev.args.royaltyBps.toString(),
      txHash: txHash as Hex,
      blockNumber: receipt.blockNumber?.toString(),
    })

    return NextResponse.json({
      ok: true,
      saved: galleryStore.items.get(tokenId),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg || 'record failed' }, { status: 500 })
  }
}
