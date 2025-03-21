import { AIRDROP_ABI, AIRDROP_ADDRESS } from '@/lib/constants'
import { config } from '@/lib/wagmiConfig'
import { watchContractEvent } from '@wagmi/core'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { ClaimStatus } from './useClaimTransaction'

// Define the event argument types
type TokensClaimedEvent = {
  account: string
  amount: bigint
}

export function useContractEvents(
  refetchHasClaimed: () => void,
  refetchAvailableTokens: () => void,
  refetchBalance: () => void,
  setClaimStatus: (status: ClaimStatus) => void
) {
  const { address } = useAccount()

  useEffect(() => {
    const unwatch = watchContractEvent(config, {
      address: AIRDROP_ADDRESS as `0x${string}`,
      abi: AIRDROP_ABI,
      eventName: 'Claimed',
      syncConnectedChain: true,
      onLogs(logs: any[]) {
        for (const log of logs) {
          // Access decoded logs using log.args
          const args = (log as any).args as TokensClaimedEvent
          
          // If this is our address, update our data
          if (args.account?.toLowerCase() === address?.toLowerCase()) {
            // Refresh all relevant data
            refetchHasClaimed()
            refetchAvailableTokens()
            refetchBalance()
            
            // Update claim status to successful
            if (setClaimStatus) {
              setClaimStatus(ClaimStatus.SUCCESS)
              toast.success('Your tokens have been successfully claimed!')
            }
            break
          }
        }
      },
      onError(error: Error) {
        toast.error('Failed to watch for claim events. Please refresh the page.')
      },
    })
    
    return () => unwatch()
  }, [])
} 