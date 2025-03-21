'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TokenDisplay } from '@/components/ui/token-display'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, Copy, ExternalLink, Fuel, Hash } from 'lucide-react'
import { useState } from 'react'
import { formatEther } from 'viem'

type ClaimHistoryItemProps = {
  amount: bigint
  timestamp: number
  txHash: string
  blockNumber?: number
  gasUsed?: bigint
  fromAddress?: string
}

export function ClaimHistoryItem({ 
  amount, 
  timestamp, 
  txHash, 
  blockNumber, 
  gasUsed,
  fromAddress
}: ClaimHistoryItemProps) {
  const [copied, setCopied] = useState(false)
  const formattedAmount = formatEther(amount)
  const timeAgo = formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true })
  const shortTxHash = `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}`
  const date = new Date(timestamp * 1000).toLocaleString()
  
  const handleCopyTxHash = () => {
    navigator.clipboard.writeText(txHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const gasInfo = gasUsed ? `${Number(gasUsed).toLocaleString()}` : null
  
  return (
    <Card className="mb-3 overflow-hidden border border-muted/30 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-4">
        {/* Main content */}
        <div className="pl-3">
          {/* Top section with amount and time */}
          <div className="flex justify-between items-center gap-2 mb-3">
            <div className="flex flex-col">
              <TokenDisplay 
                amount={amount}
                size="lg"
                className="group-hover:scale-105 transition-transform duration-300"
                variant="accent"
              />
              <div className="text-xs text-muted-foreground">
                {date}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {blockNumber && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs bg-muted/30 px-2 py-1 rounded-md flex items-center border border-muted/50 group-hover:bg-muted/50 group-hover:border-muted/70 transition-all duration-300">
                        <Hash className="h-3 w-3 mr-1 opacity-70" />
                        <span>Block {blockNumber}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <div className="text-xs">Block Number: {blockNumber}</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <Badge variant="outline" className="text-xs py-1 px-2 bg-primary/5 group-hover:bg-primary/15 transition-colors border-primary/20 group-hover:border-primary/30">
                {timeAgo}
              </Badge>
            </div>
          </div>
          
          {/* Transaction details section with separator */}
          <div className="border-t border-muted/20 pt-2 flex justify-between items-center">
            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={handleCopyTxHash}
                    >
                      <span>Tx: {shortTxHash}</span>
                      {copied ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-70" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      {copied ? 'Copied!' : 'Click to copy transaction hash'}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center gap-3">
              {gasUsed && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Fuel className="h-3 w-3 opacity-70" />
                        <span>{gasInfo}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">Gas used: {gasInfo}</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <a 
                href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                <span>View</span>
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 