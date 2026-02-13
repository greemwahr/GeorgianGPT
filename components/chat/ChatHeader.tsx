'use client'

import React from 'react'

export function ChatHeader() {
  return (
    <header className="border-b bg-background px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-sm">
          GC
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            GeorgianGPT
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Ask questions about Georgian College
          </p>
        </div>
      </div>
    </header>
  )
}
