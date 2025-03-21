import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

type StatusAlertsProps = {
  airdropPaused: boolean
  airdropEnded: boolean
  remainingTime: number | null
  hasClaimedData: boolean | undefined
}

export function StatusAlerts({ airdropPaused, airdropEnded, remainingTime, hasClaimedData }: StatusAlertsProps) {
  return (
    <>
      {airdropPaused && (
        <Alert variant="destructive" className="flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Airdrop Paused</AlertTitle>
          <AlertDescription>The airdrop is currently paused by the administrators.</AlertDescription>
        </Alert>
      )}
      
      {Boolean(airdropEnded) && (
        <Alert variant="destructive" className="flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          <AlertTitle>Airdrop Ended</AlertTitle>
          <AlertDescription>
            The airdrop period has ended. Unclaimed tokens can no longer be claimed.
          </AlertDescription>
        </Alert>
      )}
      
      {!airdropEnded && remainingTime !== null && remainingTime <= 86400 && (
        <Alert variant="default" className="flex items-center bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
          <Clock className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-600 dark:text-amber-400">Ending Soon!</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-400">
            Airdrop ending soon! You have less than 24 hours to claim your tokens.
          </AlertDescription>
        </Alert>
      )}
      
      {Boolean(hasClaimedData) && (
        <Alert className="flex items-center bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-600 dark:text-green-400">Success</AlertTitle>
          <AlertDescription className="text-green-600 dark:text-green-400">
            You have successfully claimed your tokens.
          </AlertDescription>
        </Alert>
      )}
    </>
  )
} 