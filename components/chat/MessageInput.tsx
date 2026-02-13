'use client'

import React, { FormEvent, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
  isLoading: boolean
}

export function MessageInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Clear input after submission
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [isLoading])

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-4xl gap-2 border-t bg-background p-4 sm:p-6">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInputChange}
        placeholder="Ask a question about Georgian College..."
        disabled={isLoading}
        className={cn(
          "flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
          "max-h-[200px] overflow-y-auto"
        )}
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (input.trim()) {
              handleSubmit(e as unknown as FormEvent<HTMLFormElement>)
            }
          }
        }}
      />
      <Button type="submit" disabled={isLoading || !input.trim()} className="self-end">
        {isLoading ? 'Sending...' : 'Send'}
      </Button>
    </form>
  )
}
