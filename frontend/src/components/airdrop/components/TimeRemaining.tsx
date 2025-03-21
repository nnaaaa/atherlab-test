
type TimeRemainingProps = {
  remainingTime: number | null
  timeDisplay: string
}

export function TimeRemaining({ remainingTime, timeDisplay }: TimeRemainingProps) {
  if (remainingTime === null) return null
  
  return (
    <div className="mt-4 text-center">
      <div className="text-sm font-medium text-muted-foreground">Time Remaining</div>
      <div className={`text-xl font-bold ${remainingTime <= 86400 ? 'text-red-500 animate-pulse' : remainingTime <= 259200 ? 'text-amber-500' : 'text-green-500'}`}>
        {timeDisplay}
      </div>
    </div>
  )
} 