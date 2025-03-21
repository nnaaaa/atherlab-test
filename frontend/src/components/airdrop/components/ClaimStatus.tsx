import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, CheckCircle } from 'lucide-react'

type ClaimStatusProps = {
  isCheckingEligibility: boolean
  hasClaimedData: boolean | undefined
  isEligible: boolean
}

export function ClaimStatus({ isCheckingEligibility, hasClaimedData, isEligible }: ClaimStatusProps) {
  return (
    <div className="flex items-center justify-between bg-muted/20 rounded-lg p-4 border border-muted/30">
      <span className="text-sm font-medium text-muted-foreground">Status</span>
      {isCheckingEligibility ? (
        <Skeleton className="h-6 w-24" />
      ) : (
        <div className="flex items-center gap-2">
          {Boolean(hasClaimedData) ? (
            <span className="inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium px-2.5 py-1 rounded-full">
              <CheckCircle className="h-3 w-3" />
              Claimed
            </span>
          ) : isEligible ? (
            <span className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-1 rounded-full">
              <CheckCircle className="h-3 w-3" />
              Eligible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full">
              <AlertCircle className="h-3 w-3" />
              Not Eligible
            </span>
          )}
        </div>
      )}
    </div>
  )
} 