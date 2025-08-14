'use client'

import { useState } from 'react'
import { useChainId, useAccount, useWriteContract } from 'wagmi'
import { useRouter } from 'next/navigation'
import { basecamp } from '@/lib/chain'
import { LensWeaveCollectiveABI } from '@/abi/LensWeaveCollective'

const CONTRACT = process.env.NEXT_PUBLIC_LENSWEAVE_ADDRESS as `0x${string}`

export default function MintPanel({ imageIpfsUri }: { imageIpfsUri?: string }) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { writeContractAsync, isPending } = useWriteContract()

  const [name, setName] = useState('LensWeave #1')
  const [desc, setDesc] = useState('Collaborative photograph')
  const [creatorsRaw, setCreatorsRaw] = useState('')
  const [sharesRaw, setSharesRaw] = useState('')
  const [royaltyBps, setRoyaltyBps] = useState(500)
  const [metadataUri, setMetadataUri] = useState<string | null>(null)
  const [originContentId, setOriginContentId] = useState<string>('') // optional

  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const onBuildMetadata = async () => {
    setError(null)
    setSuccess(null)

    if (!imageIpfsUri) {
      setError('Compose or upload an image first')
      return
    }
    setBuilding(true)
    try {
      const res = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: desc,
          imageUri: imageIpfsUri,
          originContentId: originContentId || undefined,
          attributes: [{ trait_type: 'app', value: 'LensWeave' }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Metadata build failed')
      setMetadataUri(data.uri)
      setSuccess('Metadata built successfully')
    } catch (e: unknown) {
      setError(e?.message || 'Metadata build failed')
    } finally {
      setBuilding(false)
    }
  }

  const onMint = async () => {
    setError(null)
    setSuccess(null)

    if (!isConnected) return setError('Connect wallet')
    if (chainId !== basecamp.id) return setError('Switch to Basecamp network')
    if (!metadataUri) return setError('Build metadata first')
    if (!CONTRACT) return setError('Contract address missing (NEXT_PUBLIC_LENSWEAVE_ADDRESS)')

    // Parse creators
    const creators = creatorsRaw
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(Boolean) as `0x${string}`[]

    // Parse shares as bigint[]
    const sharesNum = sharesRaw
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => Number(s))

    if (sharesNum.some(n => Number.isNaN(n) || !Number.isFinite(n) || n < 0))
      return setError('Shares must be non-negative integers')

    const sharesBps = sharesNum.map(n => BigInt(Math.trunc(n))) as readonly bigint[]

    if (!creators.length || creators.length !== sharesBps.length)
      return setError('Creators/shares mismatch (counts differ)')

    const sum = sharesNum.reduce((a, b) => a + b, 0)
    if (sum !== 10_000) return setError('Shares must sum to 10000 (basis points)')

    try {
      const to = address as `0x${string}`
      const txHash = await writeContractAsync({
        address: CONTRACT,
        abi: LensWeaveCollectiveABI,
        functionName: 'mintCollective',
        // args: [string uri, address[] creators, uint96[] sharesBps, uint96 royaltyBps, address to]
        args: [metadataUri, creators as readonly `0x${string}`[], sharesBps, BigInt(royaltyBps), to],
      })

      // Notify server so gallery shows it instantly
      try {
        await fetch('/api/gallery/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash }),
        })
      } catch {
        /* non-fatal */
      }

      setSuccess('Mint transaction sent!')
      router.push('/gallery')
    } catch (e: unknown) {
      setError(e?.shortMessage || e?.message || 'Mint failed')
    }
  }

  return (
    <section className="border rounded-2xl p-6 space-y-4">
      <h3 className="font-semibold">Mint Collective NFT</h3>

      <div className="grid gap-3">
        <label className="text-sm">Name</label>
        <input className="border rounded p-2" value={name} onChange={e=>setName(e.target.value)} />

        <label className="text-sm">Description</label>
        <textarea className="border rounded p-2" value={desc} onChange={e=>setDesc(e.target.value)} />

        <label className="text-sm">Origin Content ID (optional)</label>
        <input className="border rounded p-2" placeholder="origin_..." value={originContentId} onChange={e=>setOriginContentId(e.target.value)} />

        <label className="text-sm">Creators (comma or space separated)</label>
        <input className="border rounded p-2" placeholder="0xabc...,0xdef..." value={creatorsRaw} onChange={e=>setCreatorsRaw(e.target.value)} />

        <label className="text-sm">Shares in bps (sum 10000)</label>
        <input className="border rounded p-2" placeholder="5000, 5000" value={sharesRaw} onChange={e=>setSharesRaw(e.target.value)} />

        <label className="text-sm">Royalty (bps)</label>
        <input className="border rounded p-2" type="number" value={royaltyBps} onChange={e=>setRoyaltyBps(Number(e.target.value))} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBuildMetadata}
          disabled={building || !imageIpfsUri}
          className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
        >
          {building ? 'Building…' : '1) Build metadata'}
        </button>

        <button
          onClick={onMint}
          disabled={isPending || !metadataUri}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          2) {isPending ? 'Minting…' : 'Mint'}
        </button>
      </div>

      {metadataUri && (
        <p className="text-sm">
          Metadata URI: <code className="break-all">{metadataUri}</code>
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
    </section>
  )
}
