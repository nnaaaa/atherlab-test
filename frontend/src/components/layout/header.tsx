'use client'

import { ThemeToggle } from '@/components/theme/theme-toggle'

export function Header() {
  return (
    <header className="border-b py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Atherlabs</h1>
        <ThemeToggle />
      </div>
    </header>
  )
} 