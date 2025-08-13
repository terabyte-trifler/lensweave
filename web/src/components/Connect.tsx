'use client'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { basecamp } from '@/lib/chain'

export default function Connect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const needSwitch = isConnected && chainId !== basecamp.id

  return (
    <div className="flex items-center gap-3">
      {!isConnected ? (
        <button
          onClick={() => connect({ connector: connectors[0] })}
          className="px-3 py-2 rounded bg-black text-white"
        >
          Connect Wallet
        </button>
      ) : needSwitch ? (
        <button
          onClick={() => switchChain({ chainId: basecamp.id })}
          className="px-3 py-2 rounded bg-amber-600 text-white"
        >
          Switch to Basecamp
        </button>
      ) : (
        <button
          onClick={() => disconnect()}
          className="px-3 py-2 rounded bg-gray-200"
          title={address}
        >
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </button>
      )}
    </div>
  )
}
