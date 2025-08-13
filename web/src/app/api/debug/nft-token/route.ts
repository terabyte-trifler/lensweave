export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function GET() {
  const raw =
    (process.env.PINATA_JWT ?? process.env.NFT_STORAGE_API_KEY ?? '').trim()

  const visible = !!raw
  const length = raw.length
  const looksJWT = raw.startsWith('eyJ') // nft.storage tokens are JWTs

  // never return the token – just safe diagnostics
  return NextResponse.json({ visible, length, looksJWT })
}
