// Need to create a client component for dynamic rendering
'use client'

import { AirdropCard } from '@/components/airdrop/AirdropCard'
import { ClaimHistory } from '@/components/airdrop/ClaimHistory'
import { Header } from '@/components/layout/header'
import { WalletConnect } from '@/components/wallet/WalletConnect'
import { SUPPORTED_CHAIN_ID } from '@/lib/constants'
import { useAccount, useChainId } from 'wagmi'


export default function Home() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const isWrongNetwork = chainId !== SUPPORTED_CHAIN_ID
  const showOnlyWallet = !isConnected || isWrongNetwork

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Token Airdrop
        </h1>
        
        {showOnlyWallet ? (
          // When not connected or wrong network, make wallet centered
          <div className="max-w-md mx-auto">
            <WalletConnect />
          </div>
        ) : (
          // Normal layout when properly connected
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left column - spans 8 columns on md screens */}
            <div className="md:col-span-8 space-y-8">
              <WalletConnect />
              <ClaimHistory />
            </div>
            
            {/* Right column - spans 4 columns on md screens */}
            <div className="md:col-span-4">
              <AirdropCard />
            </div>
          </div>
        )}
      </main>
    </>
  )
} 