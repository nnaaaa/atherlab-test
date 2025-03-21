'use client'

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import Image from "next/image"
import { ForwardedRef, forwardRef } from "react"
import { Skeleton } from "./skeleton"

// Define variant types for the token display
const tokenDisplayVariants = cva(
  "inline-flex items-center gap-1.5 font-medium rounded-md", 
  {
    variants: {
      variant: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        accent: "text-primary",
      },
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
      },
      showSymbol: {
        true: "",
        false: "",
      },
      showLogo: {
        true: "",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      showSymbol: true,
      showLogo: true,
    },
  }
)

// TokenDisplay props
export interface TokenDisplayProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tokenDisplayVariants> {
  amount: string | number | bigint | null | undefined
  symbol?: string
  loading?: boolean
  logoSrc?: string
  decimalPlaces?: number
  hideZero?: boolean
}

// Formatter for token amounts
const formatAmount = (
  amount: string | number | bigint | undefined | null,
  decimalPlaces: number = 4
): string => {
  if (amount === null || amount === undefined) return "0"
  
  // If the amount is a bigint, convert it to a string
  if (typeof amount === "bigint") {
    // Assuming 18 decimals for the token
    const fullAmountStr = amount.toString()
    if (fullAmountStr.length <= 18) {
      // Less than 1 token
      const padded = fullAmountStr.padStart(19, "0") // Add one more place for the "0."
      // Format with proper rounding
      const decPart = padded.slice(0, -18).padStart(decimalPlaces, "0")
      const roundedDecPart = decPart.substring(0, decimalPlaces)
      return `0.${roundedDecPart}`
    }
    const intPart = fullAmountStr.slice(0, -18)
    const decPart = fullAmountStr.slice(-18)
    
    // Convert to number and format with proper rounding
    const decimalNumber = parseFloat(`${intPart}.${decPart}`)
    return decimalNumber.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    })
  }

  // Handle string or number
  const floatAmount = typeof amount === "string" ? parseFloat(amount) : amount
  return floatAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  })
}

// TokenDisplay component
export const TokenDisplay = forwardRef<HTMLDivElement, TokenDisplayProps>(
  (
    {
      className,
      amount,
      symbol = "ATHER",
      loading = false,
      logoSrc = "/ather-token.svg",
      variant,
      size,
      showSymbol,
      showLogo,
      decimalPlaces = 4,
      hideZero = false,
      ...props
    }: TokenDisplayProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const formattedAmount = formatAmount(amount, decimalPlaces)
    const isZero = formattedAmount === "0" || formattedAmount === "0.0000"
    
    if (loading) {
      return (
        <div 
          className={cn(tokenDisplayVariants({ variant, size, showSymbol, showLogo }), className)}
          ref={ref}
          {...props}
        >
          {showLogo && <Skeleton className="h-4 w-4 rounded-full" />}
          <Skeleton className="h-4 w-16" />
          {showSymbol && <Skeleton className="h-4 w-6" />}
        </div>
      )
    }
    
    if (hideZero && isZero) {
      return null
    }
    
    return (
      <div
        className={cn(tokenDisplayVariants({ variant, size, showSymbol, showLogo }), className)}
        ref={ref}
        {...props}
      >
        {showLogo && (
          <div className="relative flex-shrink-0">
            <Image
              src={logoSrc}
              alt={symbol}
              width={size === "sm" ? 16 : size === "md" ? 18 : size === "lg" ? 20 : size === "xl" ? 22 : 24}
              height={size === "sm" ? 16 : size === "md" ? 18 : size === "lg" ? 20 : size === "xl" ? 22 : 24}
              className="rounded-full"
            />
          </div>
        )}
        <span className={cn("font-semibold tracking-tight", {
          "text-green-600 dark:text-green-400": amount && !isZero && variant === "default",
        })}>
          {formattedAmount}
        </span>
        {showSymbol && (
          <span className="text-muted-foreground font-normal tracking-wider">
            {symbol}
          </span>
        )}
      </div>
    )
  }
)

TokenDisplay.displayName = "TokenDisplay" 