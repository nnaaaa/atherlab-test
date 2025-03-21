import { useEffect, useState } from 'react';

// Helper function to format time remaining
const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "Ended";
  
  const days = Math.floor(seconds / (60 * 60 * 24));
  const hours = Math.floor((seconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

export function useRemainingTime(remainingTimeData: bigint | undefined, endTimeData: bigint | undefined, refetchRemainingTime: () => void) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [timeDisplay, setTimeDisplay] = useState<string>("")
  const [airdropEnded, setAirdropEnded] = useState(false)
  
  // Timer effect to update remaining time countdown
  useEffect(() => {
    if (!remainingTimeData && !endTimeData) return;
    
    // Use the contract's remaining time if available, otherwise calculate from endTime
    let seconds = remainingTimeData ? Number(remainingTimeData) : 0;
    
    if (!seconds && endTimeData) {
      const now = Math.floor(Date.now() / 1000);
      const end = Number(endTimeData);
      seconds = end > now ? end - now : 0;
    }
    
    setRemainingTime(seconds);
    setTimeDisplay(formatTimeRemaining(seconds));
    
    // Only set up interval if there's time remaining
    if (seconds > 0) {
      const interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setAirdropEnded(true);
            return 0;
          }
          const newValue = prev - 1;
          setTimeDisplay(formatTimeRemaining(newValue));
          return newValue;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [remainingTimeData, endTimeData]);
  
  // Refresh remaining time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      refetchRemainingTime();
    }, 60000); // every minute
    
    return () => clearInterval(interval);
  }, [refetchRemainingTime]);

  return {
    remainingTime,
    timeDisplay,
    airdropEnded,
    setAirdropEnded
  }
} 