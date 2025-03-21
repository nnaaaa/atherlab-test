import { AIRDROP_ABI, AIRDROP_ADDRESS } from '@/lib/constants';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

// Define claim status as an enum for better type safety
export enum ClaimStatus {
  READY = 'Claim Tokens',
  INITIATING = 'Initiating Transaction...',
  WAITING = 'Waiting for Confirmation...',
  PROCESSING = 'Processing Transaction...',
  SUCCESS = 'Claim Successful!',
  FAILED = 'Claim Failed',
  ALREADY_CLAIMED = 'Already Claimed'
}

// Define claim state types
export type ClaimState = {
  status: ClaimStatus;
  message: string;
  isDisabled: boolean;
  alertType?: 'success' | 'error' | 'warning' | 'info';
}

// Define claim state map as a constant outside the component
export const CLAIM_STATE_MAP: Record<ClaimStatus, ClaimState> = {
  [ClaimStatus.READY]: {
    status: ClaimStatus.READY,
    message: "You are eligible for this airdrop. Claim your tokens before the deadline.",
    isDisabled: false,
    alertType: 'info'
  },
  [ClaimStatus.INITIATING]: {
    status: ClaimStatus.INITIATING,
    message: "Initiating your claim transaction...",
    isDisabled: true,
    alertType: 'info'
  },
  [ClaimStatus.WAITING]: {
    status: ClaimStatus.WAITING,
    message: "Please confirm the transaction in your wallet...",
    isDisabled: true,
    alertType: 'info'
  },
  [ClaimStatus.PROCESSING]: {
    status: ClaimStatus.PROCESSING,
    message: "Your transaction is being processed on the blockchain...",
    isDisabled: true,
    alertType: 'info'
  },
  [ClaimStatus.SUCCESS]: {
    status: ClaimStatus.SUCCESS,
    message: "You have successfully claimed your tokens from this airdrop.",
    isDisabled: true,
    alertType: 'success'
  },
  [ClaimStatus.FAILED]: {
    status: ClaimStatus.FAILED,
    message: "Transaction failed. Please try again.",
    isDisabled: false,
    alertType: 'error'
  },
  [ClaimStatus.ALREADY_CLAIMED]: {
    status: ClaimStatus.ALREADY_CLAIMED,
    message: "You have already claimed your tokens from this airdrop.",
    isDisabled: true,
    alertType: 'success'
  }
};

export function useClaimTransaction() {
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>(ClaimStatus.READY)
  
  // Claim tokens
  const { writeContract: claim, data: hash, isPending: isClaimPending } = useWriteContract()

  // Watch claim transaction
  const { isLoading: isClaimLoading, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  
  // Handle transaction errors separately
  useEffect(() => {
    if (hash && !isClaimLoading && !isClaimSuccess) {
      setClaimStatus(ClaimStatus.FAILED)
      toast.error("Transaction failed")
    }
  }, [hash, isClaimLoading, isClaimSuccess])

  // Update claim status based on transaction state
  useEffect(() => {
    if (isClaimPending) {
      setClaimStatus(ClaimStatus.WAITING)
    } else if (isClaimLoading) {
      setClaimStatus(ClaimStatus.PROCESSING)
    } else if (isClaimSuccess) {
      setClaimStatus(ClaimStatus.SUCCESS)
    } else if (!hash && claimStatus !== ClaimStatus.ALREADY_CLAIMED) {
      // Only reset to READY if not already claimed
      setClaimStatus(ClaimStatus.READY)
    }
  }, [isClaimPending, isClaimLoading, isClaimSuccess, hash, claimStatus])

  // Handle claim success
  useEffect(() => {
    if (isClaimSuccess) {
      toast.success('Your tokens have been successfully claimed!')
    }
  }, [isClaimSuccess])

  // Get the current claim state from the map
  const claimState = useMemo(() => CLAIM_STATE_MAP[claimStatus], [claimStatus]);

  const handleClaim = (merkleProof: string[]) => {
    if (!merkleProof.length) {
      toast.error('Unable to generate Merkle proof for your address')
      return
    }
    
    setClaimStatus(ClaimStatus.INITIATING)
    
    try {
      claim({
        address: AIRDROP_ADDRESS as `0x${string}`,
        abi: AIRDROP_ABI,
        functionName: 'claim',
        args: [merkleProof],
      })
    } catch (error) {
      setClaimStatus(ClaimStatus.FAILED)
      toast.error(`Transaction error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    claimStatus,
    setClaimStatus,
    isClaimPending,
    isClaimLoading,
    claimState,
    handleClaim
  }
} 