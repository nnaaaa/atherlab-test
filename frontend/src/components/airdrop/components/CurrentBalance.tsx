import { TokenDisplay } from '@/components/ui/token-display'

type CurrentBalanceProps = {
  balanceData: bigint | undefined
  isConnected: boolean
}

export function CurrentBalance({ balanceData, isConnected }: CurrentBalanceProps) {
  return (
    <div className="bg-muted/20 rounded-lg p-4 border border-muted/30">
      <div className="text-sm font-medium text-muted-foreground mb-1">Current Balance</div>
      <TokenDisplay 
        amount={balanceData as bigint | undefined} 
        loading={balanceData === undefined && isConnected}
        size="xl"
        decimalPlaces={typeof balanceData === 'bigint' && balanceData < BigInt(10000) ? 6 : 4}
      />
    </div>
  )
} 