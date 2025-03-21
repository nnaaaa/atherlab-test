'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AIRDROP_ABI, AIRDROP_ADDRESS } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, ExternalLink, History } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { formatEther } from 'viem'
import { useAccount, usePublicClient, useWatchContractEvent } from 'wagmi'
import { ClaimHistoryItem } from './ClaimHistoryItem'

// Define the event argument types
type TokensClaimedEvent = {
  account: string
  amount: bigint
}

type ClaimEvent = {
  amount: bigint
  timestamp: number
  txHash: string
  blockNumber?: number
  gasUsed?: bigint
  fromAddress?: string
}

type AirdropStats = {
  totalClaimed: bigint
  claimCount: number
  lastClaimTime: number | null
}

export function ClaimHistory() {
  const { address, isConnected } = useAccount()
  const [claimHistory, setClaimHistory] = useState<ClaimEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [stats, setStats] = useState<AirdropStats>({
    totalClaimed: BigInt(0),
    claimCount: 0,
    lastClaimTime: null
  })
  const [error, setError] = useState<string | null>(null)
  const publicClient = usePublicClient()

  // Fetch claim events from blockchain
  const fetchClaimHistory = async (startBlock = 0) => {
    if (!address || !publicClient) return
    
    try {
      // Set appropriate loading state
      if (startBlock === 0) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      
      // Get Claimed events from contract
      const events = await publicClient.getContractEvents({
        address: AIRDROP_ADDRESS as `0x${string}`,
        abi: AIRDROP_ABI,
        eventName: 'Claimed',
        fromBlock: BigInt(startBlock),
        toBlock: 'latest'
      })
      
      // Filter events for the connected address if needed
      const filteredEvents = events.filter(event => {
        // If you want to show all events, remove this filter
        // If you want to show only current user's events, keep it
        // Access decoded logs using event.args - cast with "as any" first for type safety
        const args = (event as any).args as TokensClaimedEvent
        return args.account?.toLowerCase() === address.toLowerCase()
      })
      
      const newEvents: ClaimEvent[] = []
      
      // Process events to get full transaction data
      for (const event of filteredEvents) {
        // Access decoded logs using event.args - cast with "as any" first for type safety
        const args = (event as any).args as TokensClaimedEvent
        if (args.amount && event.transactionHash) {
          // Get the transaction for more details
          const tx = await publicClient.getTransaction({
            hash: event.transactionHash as `0x${string}`
          })
          
          // Get the transaction receipt for gas used
          const receipt = await publicClient.getTransactionReceipt({
            hash: event.transactionHash as `0x${string}`
          })
          
          // Get block to extract timestamp
          const block = await publicClient.getBlock({
            blockHash: receipt.blockHash
          })
          
          newEvents.push({
            amount: args.amount,
            timestamp: Number(block.timestamp),
            txHash: event.transactionHash,
            blockNumber: Number(receipt.blockNumber),
            gasUsed: receipt.gasUsed,
            fromAddress: tx.from
          })
        }
      }
      
      // Update state with new events
      if (startBlock === 0) {
        setClaimHistory(newEvents)
      } else {
        setClaimHistory(prev => [...prev, ...newEvents])
      }
      
      // Calculate if there might be more events to load
      setHasMore(newEvents.length >= 10)
      
      // Update stats
      const totalClaimed = newEvents.reduce(
        (sum, event) => sum + event.amount, 
        BigInt(0)
      )
      
      setStats({
        totalClaimed,
        claimCount: newEvents.length,
        lastClaimTime: newEvents.length > 0 ? 
          newEvents[0].timestamp : 
          null
      })
      
    }
    catch (error) {
      setError('Error fetching claim history')
      toast.error('Unable to fetch claim history')
    }
    finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  // Listen for new claim events
  useWatchContractEvent({
    address: AIRDROP_ADDRESS as `0x${string}`,
    abi: AIRDROP_ABI,
    eventName: 'Claimed',
    syncConnectedChain: true,
    onLogs(logs) {
      for (const log of logs) {
        // Access decoded logs using log.args - cast with "as any" first for type safety
        const args = (log as any).args as TokensClaimedEvent
        if (args.account?.toLowerCase() === address?.toLowerCase()) {
          // Refresh the claim history when a new claim is detected
          fetchClaimHistory()
          break
        }
      }
    },
    onError(error) {
      console.error('Error watching claim events:', error);
    }
  })

  // Fetch claim history when address changes
  useEffect(() => {
    if (address) {
      fetchClaimHistory()
    } else {
      setClaimHistory([])
      setIsLoading(false)
    }
  }, [address])

  const handleLoadMore = () => {
    if (claimHistory.length > 0) {
      // Get the oldest block number we've seen
      const oldestBlock = Math.min(
        ...claimHistory
          .filter(event => event.blockNumber !== undefined)
          .map(event => event.blockNumber as number)
      )
      // Load from before the oldest block we've seen
      fetchClaimHistory(Math.max(0, oldestBlock - 1))
    }
  }

  return (
    <Card className="h-min max-h-[600px]" data-testid="claim-history">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <History className="h-5 w-5" />
            Claim History
          </CardTitle>
          <CardDescription>
            Token claim transactions on the blockchain
          </CardDescription>
        </div>
      </CardHeader>
      
      {isConnected && !isLoading && stats.claimCount > 0 && (
        <div className="px-6 pb-3">
          <div className="grid grid-cols-3 gap-4 bg-muted/20 rounded-md p-3">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Total Claimed</div>
              <div className="font-semibold">{formatEther(stats.totalClaimed)} ATHER</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Transactions</div>
              <div className="font-semibold">{stats.claimCount}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Last Claim</div>
              <div className="font-semibold">
                {stats.lastClaimTime ? 
                  formatDistanceToNow(new Date(stats.lastClaimTime * 1000), { addSuffix: true }) : 
                  'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Separator />
      
      <CardContent className="pt-4">
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="space-y-2" data-testid="loading-skeleton">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : claimHistory.length > 0 ? (
            <div className="space-y-3">
              {claimHistory.map((claim, index) => (
                <ClaimHistoryItem
                  key={`${claim.txHash}-${index}`}
                  amount={claim.amount}
                  timestamp={claim.timestamp}
                  txHash={claim.txHash}
                  blockNumber={claim.blockNumber}
                  gasUsed={claim.gasUsed}
                  fromAddress={claim.fromAddress}
                />
              ))}
              
              {isLoadingMore && (
                <Skeleton className="h-24 w-full" />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-6 text-center">
              <History className="h-12 w-12 text-muted-foreground opacity-20 mb-2" />
              <p className="text-sm text-muted-foreground">
                {isConnected 
                  ? 'No claim history found for your address.'
                  : 'Connect your wallet to view claim history.'}
              </p>
              {isConnected && (
                <a 
                  href={`https://sepolia.etherscan.io/address/${AIRDROP_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary flex items-center mt-2 hover:underline"
                >
                  View contract on Etherscan
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      {hasMore && claimHistory.length > 0 && (
        <CardFooter className="pt-0">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
            {!isLoadingMore && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
} 