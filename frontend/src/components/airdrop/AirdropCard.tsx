'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatEther } from 'viem'
import { useAccount } from 'wagmi'
import { AvailableTokens } from './components/AvailableTokens'
import { ClaimStatus as ClaimStatusComponent } from './components/ClaimStatus'
import { CurrentBalance } from './components/CurrentBalance'
import { StatusAlerts } from './components/StatusAlerts'
import { TimeRemaining } from './components/TimeRemaining'
import { TokenAllocation } from './components/TokenAllocation'
import { useAirdropData } from './hooks/useAirdropData'
import { ClaimStatus, useClaimTransaction } from './hooks/useClaimTransaction'
import { useContractEvents } from './hooks/useContractEvents'
import { useRemainingTime } from './hooks/useRemainingTime'
import { useUserClaimData } from './hooks/useUserClaimData'

export function AirdropCard() {
  const { address, isConnected } = useAccount()
  const [isEligible, setIsEligible] = useState(false)
  const [allocation, setAllocation] = useState('0')
  
  // Custom hooks for data fetching and state management
  const {
    endTimeData,
    remainingTimeData,
    refetchRemainingTime,
    pausedData,
    hasEndedData,
    availableTokensData,
    refetchAvailableTokens,
    amountPerAddressData,
  } = useAirdropData()
  
  const {
    merkleProof,
    hasClaimedData,
    refetchHasClaimed,
    balanceData,
    refetchBalance,
    eligibilityData,
    isCheckingEligibility
  } = useUserClaimData()
  
  const {
    claimStatus,
    setClaimStatus,
    isClaimPending,
    isClaimLoading,
    claimState,
    handleClaim
  } = useClaimTransaction()
  
  const {
    remainingTime,
    timeDisplay,
    airdropEnded,
    setAirdropEnded
  } = useRemainingTime(remainingTimeData, endTimeData, refetchRemainingTime)
  
  // Set up contract event listeners
  useContractEvents(
    refetchHasClaimed,
    refetchAvailableTokens, 
    refetchBalance,
    setClaimStatus
  )
  
  // Derived state
  const [airdropPaused, setAirdropPaused] = useState(false)
  
  // Update eligibility, claim status, and airdrop status
  useEffect(() => {
    // Update eligibility
    if (eligibilityData !== undefined) {
      setIsEligible(!!eligibilityData);
    }
    
    // Update claim status if already claimed
    if (hasClaimedData) {
      setClaimStatus(ClaimStatus.ALREADY_CLAIMED);
    }
    
    // Update allocation amount if eligible
    if (isEligible && amountPerAddressData) {
      try {
        setAllocation(formatEther(amountPerAddressData as bigint));
      } catch (error) {
        console.error('Error formatting token amount');
      }
    }
    
    // Check if airdrop has ended directly from contract
    if (hasEndedData !== undefined) {
      setAirdropEnded(!!hasEndedData);
    }
    // Fallback check using end time
    else if (endTimeData) {
      const currentTime = Math.floor(Date.now() / 1000);
      setAirdropEnded(Number(endTimeData) < currentTime);
    }
    
    // Check if airdrop is paused
    if (pausedData !== undefined) {
      setAirdropPaused(!!pausedData);
    }
  }, [eligibilityData, endTimeData, pausedData, hasEndedData, isEligible, amountPerAddressData, setAirdropEnded, hasClaimedData, setClaimStatus]);

  if (!isConnected) {
    return null;
  }

  // Determine the status message based on all possible states
  const getStatusMessage = () => {
    if (isCheckingEligibility) {
      return "Checking your eligibility...";
    }
    
    // Already claimed - use the message from claim state
    if (Boolean(hasClaimedData)) {
      return "You have already claimed your tokens from this airdrop.";
    }
    
    // Not eligible - not on whitelist
    if (!isEligible) {
      return "Your address is not on the airdrop whitelist.";
    }
    
    // Airdrop ended but was eligible
    if (airdropEnded) {
      return "This airdrop has ended. Unclaimed tokens have been returned to the treasury.";
    }
    
    // Airdrop paused
    if (airdropPaused) {
      return "This airdrop is temporarily paused. Please check back later.";
    }
    
    // Default - eligible and can claim
    return "You are eligible for this airdrop. Claim your tokens before the deadline.";
  };

  // Determine if the claim button should be disabled
  const isClaimingDisabled = 
    !isEligible || 
    Boolean(hasClaimedData) || 
    airdropEnded || 
    airdropPaused || 
    isClaimLoading || 
    isClaimPending ||
    claimState.isDisabled;

  const handleClaimClick = () => {
    handleClaim(merkleProof);
  };

  // Render airdrop card with improved token display
  return (
    <Card className="w-full mx-auto shadow-lg border-primary/10 hover:border-primary/30 transition-all duration-300" data-testid="airdrop-card">
      <CardHeader className="rounded-t-lg">
        <CardTitle className="text-center text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Airdrop Claim</CardTitle>
        <CardDescription className="text-center">Claim your tokens before the airdrop ends</CardDescription>
        <TimeRemaining remainingTime={remainingTime} timeDisplay={timeDisplay} />
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Token Allocation Information - Enhanced with TokenDisplay */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TokenAllocation 
            isEligible={isEligible} 
            allocation={allocation} 
            isCheckingEligibility={isCheckingEligibility} 
          />
          <CurrentBalance balanceData={balanceData} isConnected={isConnected} />
        </div>
        
        <AvailableTokens availableTokensData={availableTokensData} isConnected={isConnected} />
        
        {/* Status Information */}
        <ClaimStatusComponent
          isCheckingEligibility={isCheckingEligibility} 
          hasClaimedData={hasClaimedData} 
          isEligible={isEligible} 
        />
        
        {/* Airdrop Status Alerts */}
        <StatusAlerts 
          airdropPaused={airdropPaused} 
          airdropEnded={airdropEnded} 
          remainingTime={remainingTime} 
          hasClaimedData={hasClaimedData} 
        />
        
        {/* Claim Button */}
        <Button
          onClick={handleClaimClick}
          disabled={isClaimingDisabled}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-6"
          size="lg"
          data-testid="claim-button"
        >
          {claimState.status}
        </Button>
        
        {/* Status Message */}
        <p className="text-sm text-muted-foreground text-center">
          {getStatusMessage()}
        </p>
        
        {/* Important notice about time-based claiming */}
        <div className="mt-4 text-xs text-muted-foreground p-4 bg-muted/10 rounded-lg border border-muted/20">
          <p className="font-semibold flex items-center mb-1">
            <AlertCircle className="h-3 w-3 mr-1" />
            Important:
          </p>
          <p>Tokens must be claimed before the airdrop period ends. After that time, unclaimed tokens will be returned to the project treasury.</p>
        </div>
      </CardContent>
    </Card>
  )
} 