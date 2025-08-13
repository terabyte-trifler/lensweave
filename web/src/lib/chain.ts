// src/lib/chain.ts
import { Chain } from 'viem'

export const basecamp = {
  id: 123420001114, // number OK for wagmi config; viem accepts number or bigint
  name: 'Basecamp Testnet',
  nativeCurrency: { name: 'CAMP', symbol: 'CAMP', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_BASECAMP_RPC || 'https://123420001114.rpc.thirdweb.com'] },
    public:  { http: [process.env.NEXT_PUBLIC_BASECAMP_RPC || 'https://123420001114.rpc.thirdweb.com'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: process.env.NEXT_PUBLIC_BASECAMP_EXPLORER || 'https://basecamp.cloud.blockscout.com' },
  },
  testnet: true,
} as const satisfies Chain
