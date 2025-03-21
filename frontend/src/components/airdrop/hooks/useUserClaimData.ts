import { AIRDROP_ABI, AIRDROP_ADDRESS, TOKEN_ABI, TOKEN_ADDRESS } from '@/lib/constants'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAccount, useReadContract } from 'wagmi'

export function useUserClaimData() {
  const { address } = useAccount()
  const [merkleProof, setMerkleProof] = useState<string[]>([])
  
  // Check if user has already claimed
  const { data: hasClaimedData, refetch: refetchHasClaimed } = useReadContract({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    functionName: 'isClaimed',
    args: [address],
    query: {
      enabled: Boolean(address),
    }
  })

  // Get token balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: TOKEN_ADDRESS as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: Boolean(address),
    }
  })

  // Check eligibility with the fetched proof
  const { data: eligibilityData, isLoading: isCheckingEligibility } = useReadContract({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    functionName: 'isEligible',
    args: [address, merkleProof],
    query: {
      enabled: Boolean(address) && merkleProof.length > 0,
    }
  })

  // Fetch Merkle proof from API if user is connected
  useEffect(() => {
    const fetchMerkleProof = async () => {
      if (!address) return;
      
      try {
        const response = await fetch(`/api/merkle-proof?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          setMerkleProof(data.proof);
        } else {
          if (response.status === 401) {
            toast.error('You are not authorized to access this resource');
          } else {
            toast.error('Unable to fetch eligibility data');
          }
        }
      } catch (error) {
        toast.error('Unable to connect to the server');
      }
    };
    
    fetchMerkleProof();
  }, [address]);

  return {
    merkleProof,
    hasClaimedData: hasClaimedData as boolean | undefined,
    refetchHasClaimed,
    balanceData: balanceData as bigint | undefined,
    refetchBalance,
    eligibilityData: eligibilityData as boolean | undefined,
    isCheckingEligibility
  }
} 