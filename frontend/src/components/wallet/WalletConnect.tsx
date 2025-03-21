'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SUPPORTED_CHAIN_ID } from '@/lib/constants'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from 'wagmi'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const isWrongNetwork = chainId !== SUPPORTED_CHAIN_ID

  const handleSwitchNetwork = () => {
    switchChain({ chainId: SUPPORTED_CHAIN_ID })
  }

  // Add max-width class for centered appearance when displayed alone
  const cardClasses = (!isConnected || isWrongNetwork) 
    ? "max-w-md mx-auto" 
    : "";

  return (
    <Card className={cardClasses} data-testid="wallet-connect">
      <CardHeader>
        <CardTitle>Wallet Connection</CardTitle>
        <CardDescription>Connect your wallet to check eligibility and claim tokens</CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="space-y-4">
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                onClick={() => connect({ connector })}
                // disabled={!connector.ready || isPending}
                className="w-full"
              >
                Connect {connector.name}
                {isPending && '...'}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm font-medium">
                  {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          navigator.clipboard.writeText(address || '');
                          toast("Wallet address copied to clipboard");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy address</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          window.open(`https://etherscan.io/address/${address}`, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View on Etherscan</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {isWrongNetwork && (
              <Alert variant="destructive">
                <AlertDescription>
                  Please switch to the correct network
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={handleSwitchNetwork}
                  >
                    Switch Network
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={() => disconnect()} className="w-full">
              Disconnect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 