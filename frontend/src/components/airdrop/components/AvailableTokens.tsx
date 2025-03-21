import { TokenDisplay } from '@/components/ui/token-display'

type AvailableTokensProps = {
  availableTokensData: bigint | undefined
  isConnected: boolean
}

export function AvailableTokens({ availableTokensData, isConnected }: AvailableTokensProps) {
  return (
    <div className="bg-muted/20 rounded-lg p-4 border border-muted/30">
      <div className="text-sm font-medium text-muted-foreground mb-1">Available in Airdrop Contract</div>
      <TokenDisplay 
        amount={availableTokensData as bigint | undefined} 
        loading={availableTokensData === undefined && isConnected}
        size="lg"
        variant="muted"
      />
    </div>
  )
} 