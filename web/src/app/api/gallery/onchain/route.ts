export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { basecamp } from '@/lib/chain'
import { LensWeaveCollectiveABI } from '@/abi/LensWeaveCollective'
import { listGalleryItems, upsertGalleryItem } from '@/lib/galleryCache'

const CONTRACT = process.env.NEXT_PUBLIC_LENSWEAVE_ADDRESS as `0x${string}`
const RPC = process.env.NEXT_PUBLIC_BASECAMP_RPC as string
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'

function ipfsToHttp(u?: string) {
  if (!u) return ''
  return u.startsWith('ipfs://') ? `${GATEWAY}/${u.slice('ipfs://'.length)}` : u
}
function toBigIntish(v?: string | number): bigint | undefined {
  if (v == null) return undefined
  if (typeof v === 'number') return BigInt(v)
  const s = String(v).trim().toLowerCase()
  if (s.startsWith('0x')) return BigInt(s)
  return BigInt(s)
}

export async function GET(req: Request) {
  try {
    if (!CONTRACT || !RPC) {
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_LENSWEAVE_ADDRESS or NEXT_PUBLIC_BASECAMP_RPC' },
        { status: 500 }
      )
    }
    const url = new URL(req.url)
    const cursorHex = url.searchParams.get('cursor') ?? undefined

    const client = createPublicClient({ chain: basecamp, transport: http(RPC) })
    const mintedEvent = parseAbiItem(
      'event Minted(uint256 indexed tokenId, string uri, address[] creators, uint96[] sharesBps, uint96 royaltyBps)'
    )

    const latest = await client.getBlockNumber()
    const deployBlock = toBigIntish(process.env.LENSWEAVE_DEPLOY_BLOCK || '0') ?? 0n

    let toBlock = cursorHex ? (toBigIntish(cursorHex) as bigint) : latest
    if (toBlock > latest) toBlock = latest

    const START_CHUNK = Number(process.env.GALLERY_START_CHUNK || '900')
    const MIN_CHUNK = Number(process.env.GALLERY_MIN_CHUNK || '50')
    const MAX_CHUNKS = Number(process.env.GALLERY_MAX_CHUNKS || '200')
    const TARGET_ITEMS = Number(process.env.GALLERY_TARGET_ITEMS || '40')

    let span = BigInt(Math.max(1, Math.min(1000, START_CHUNK)))
    const minSpan = BigInt(Math.max(1, Math.min(1000, MIN_CHUNK)))

    // Start with cached items for instant UX
    const cacheItems = listGalleryItems()
    const seen = new Set(cacheItems.map(i => i.tokenId))
    const items = [...cacheItems] as any[]

    let chunks = 0
    let nextCursor: string | null = null

    // Scan chain backwards in small chunks to fill gaps
    while (chunks < MAX_CHUNKS && items.length < TARGET_ITEMS && toBlock >= deployBlock) {
      let fromBlock = toBlock >= span ? toBlock - span + 1n : deployBlock
      if (fromBlock < deployBlock) fromBlock = deployBlock

      let logs: any[] = []
      while (true) {
        try {
          logs = await client.getLogs({
            address: CONTRACT,
            event: mintedEvent,
            fromBlock,
            toBlock,
          })
          break
        } catch (e: any) {
          const msg = String(e?.message || e)
          if (span > minSpan && /max|Maximum|exceed|range|limit|1000/i.test(msg)) {
            span = span / 2n
            if (span < minSpan) span = minSpan
            fromBlock = toBlock >= span ? toBlock - span + 1n : deployBlock
            if (fromBlock < deployBlock) fromBlock = deployBlock
            continue
          }
          logs = []
          break
        }
      }

      for (const log of logs) {
        const tokenId = (log.args.tokenId as bigint).toString()
        if (seen.has(tokenId)) continue
        const uriFromEvent = (log.args.uri as string) || ''
        let tokenUri = uriFromEvent

        if (!tokenUri) {
          try {
            tokenUri = (await client.readContract({
              address: CONTRACT,
              abi: LensWeaveCollectiveABI,
              functionName: 'tokenURI',
              args: [BigInt(tokenId)],
            })) as string
          } catch {}
        }

        let image = ''
        if (tokenUri) {
          try {
            const r = await fetch(ipfsToHttp(tokenUri))
            if (r.ok) { const meta = await r.json().catch(() => null); image = ipfsToHttp(meta?.image) }
          } catch {}
        }

        const item = {
          tokenId,
          metadataUri: tokenUri,
          image,
          creators: (log.args.creators as string[]) || [],
          sharesBps: (log.args.sharesBps as (bigint|number)[]).map(String),
          royaltyBps: String(log.args.royaltyBps as bigint | number),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber?.toString(),
        }
        items.push(item)
        seen.add(tokenId)
        // also keep cache warm
        upsertGalleryItem(item)
        if (items.length >= TARGET_ITEMS) break
      }

      if (fromBlock === deployBlock) {
        nextCursor = null
        break
      }
      toBlock = fromBlock - 1n
      nextCursor = '0x' + toBlock.toString(16)
      chunks++
    }

    items.sort((a,b) => Number(b.blockNumber||0) - Number(a.blockNumber||0))

    return NextResponse.json({
      ok: true,
      items,
      page: { nextCursor, latest: latest.toString(), span: span.toString(), chunksScanned: chunks, target: TARGET_ITEMS },
      cacheCount: cacheItems.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'onchain gallery failed' }, { status: 500 })
  }
}
