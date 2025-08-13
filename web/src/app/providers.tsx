'use client'
import { ReactNode } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { basecamp } from '@/lib/chain'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

const config = createConfig({
  chains: [basecamp],
  connectors: [injected()],
  transports: {
    [basecamp.id]: http(basecamp.rpcUrls.default.http[0]),
  },
})

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
