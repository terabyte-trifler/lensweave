export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { basecamp } from '@/lib/chain'
import { LensWeaveCollectiveABI } from '@/abi/LensWeaveCollective'
import { galleryStore, upsertGalleryItem } from '@/lib/galleryCache'

const CONTRACT = process.env.NEXT_PUBLIC_LENSWEAVE_ADDRESS as `0x${string}`
const RPC = process.env.NEXT_PUBLIC_BASECAMP_RPC as string
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'

function ipfsToHttp(u?: string) {
  if (!u) return ''
  return u.startsWith('ipfs://') ? `${GATEWAY}/${u.slice('ipfs://'.length)}` : u
}

export async function POST(req: NextRequest) {
  try {
    if (!CONTRACT || !RPC) {
      return NextResponse.json({ error: 'Missing contract address or RPC' }, { status: 500 })
    }
    const { txHash } = await req.json()
    if (!txHash) return NextResponse.json({ error: 'Missing txHash' }, { status: 400 })

    const client = createPublicClient({ chain: basecamp, transport: http(RPC) })

    // wait for tx receipt
    const receipt = await client.waitForTransactionReceipt({ hash: txHash })

    // Parse Minted event from this tx
    const mintedEvent = parseAbiItem(
      'event Minted(uint256 indexed tokenId, string uri, address[] creators, uint96[] sharesBps, uint96 royaltyBps)'
    )
    const logs = receipt.logs
      .map((log) => {
        try { return client.decodeEventLog({ abi: [mintedEvent], data: log.data, topics: log.topics }) }
        catch { return null }
      })
      .filter(Boolean) as Array<{
        eventName: string
        args: { tokenId: bigint; uri: string; creators: string[]; sharesBps: bigint[]; royaltyBps: bigint }
      }>

    if (!logs.length) {
      return NextResponse.json({ error: 'No Minted event found in tx' }, { status: 422 })
    }

    const ev = logs.find(l => l.eventName === 'Minted') || logs[0]
    const tokenId = ev.args.tokenId.toString()
    let tokenUri = ev.args.uri

    // fallback read if needed
    if (!tokenUri) {
      tokenUri = await client.readContract({
        address: CONTRACT,
        abi: LensWeaveCollectiveABI,
        functionName: 'tokenURI',
        args: [ev.args.tokenId],
      }) as string
    }

    // fetch metadata json (best effort)
    let image = ''
    try {
      const r = await fetch(ipfsToHttp(tokenUri))
      if (r.ok) {
        const meta = await r.json()
        if (meta?.image) image = ipfsToHttp(meta.image)
      }
    } catch {}

    // cache it
    upsertGalleryItem({
      tokenId,
      metadataUri: tokenUri,
      image,
      creators: ev.args.creators,
      sharesBps: ev.args.sharesBps.map(String),
      royaltyBps: ev.args.royaltyBps.toString(),
      txHash,
      blockNumber: receipt.blockNumber?.toString(),
    })

    return NextResponse.json({ ok: true, saved: galleryStore.items.get(tokenId) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'record failed' }, { status: 500 })
  }
}
