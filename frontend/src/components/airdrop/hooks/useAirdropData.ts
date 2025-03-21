import { AIRDROP_ABI, AIRDROP_ADDRESS } from '@/lib/constants'
import { useAccount, useReadContract } from 'wagmi'

export function useAirdropData() {
  const { address } = useAccount()

  // Get airdrop end time
  const { data: endTimeData } = useReadContract({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    functionName: 'endTime',
    query: {
      enabled: Boolean(address),
    }
  })
  
  // Get remaining time directly from the contract
  const { data: remainingTimeData, refetch: refetchRemainingTime } = useReadContract({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    functionName: 'getRemainingTime',
    query: {
      enabled: Boolean(address),
    }
  })

  // Check if airdrop is paused
  const { data: pausedData } = useReadContract({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    functionName: 'paused',
    query: {
      enabled: Boolean(address),
    }
  })
  
  // Check if airdrop has ended
  const { data: hasEndedData } = useReadContract({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    functionName: 'hasEnded',
    query: {
      enabled: Boolean(address),
    }
  })

  // Get total available tokens in the airdrop contract
  const { data: availableTokensData, refetch: refetchAvailableTokens } = useReadContract({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    functionName: 'getAvailableTokens',
    query: {
      enabled: Boolean(address),
    }
  })
  
  // Get amount per address
  const { data: amountPerAddressData } = useReadContract({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    functionName: 'amountPerAddress',
    query: {
      enabled: Boolean(address),
    }
  })

  return {
    endTimeData: endTimeData as bigint | undefined,
    remainingTimeData: remainingTimeData as bigint | undefined,
    refetchRemainingTime,
    pausedData: pausedData as boolean | undefined,
    hasEndedData: hasEndedData as boolean | undefined,
    availableTokensData: availableTokensData as bigint | undefined,
    refetchAvailableTokens,
    amountPerAddressData: amountPerAddressData as bigint | undefined,
  }
} 