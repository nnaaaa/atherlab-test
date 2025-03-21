import { TokenDisplay } from '@/components/ui/token-display'

type TokenAllocationProps = {
  isEligible: boolean
  allocation: string
  isCheckingEligibility: boolean
}

export function TokenAllocation({ isEligible, allocation, isCheckingEligibility }: TokenAllocationProps) {
  return (
    <div className="bg-muted/20 rounded-lg p-4 border border-muted/30">
      <div className="text-sm font-medium text-muted-foreground mb-1">Your Allocation</div>
      <TokenDisplay 
        amount={isEligible ? allocation : '0'} 
        loading={isCheckingEligibility}
        size="xl"
        variant="accent"
      />
    </div>
  )
} 