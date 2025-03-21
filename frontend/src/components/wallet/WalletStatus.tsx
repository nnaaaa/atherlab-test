'use client'

import { SUPPORTED_CHAIN_ID } from '@/lib/constants'
import { PropsWithChildren } from 'react'
import { useAccount, useChainId } from 'wagmi'

export function WalletStatus({ children }: PropsWithChildren) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const isWrongNetwork = chainId !== SUPPORTED_CHAIN_ID

  // Only render children if wallet is connected and on the correct network
  if (!isConnected || isWrongNetwork) {
    return null
  }

  return <>{children}</>
} 