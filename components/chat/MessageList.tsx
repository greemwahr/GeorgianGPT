'use client'

import React, { useEffect, useRef } from 'react'
import { UIMessage } from '@ai-sdk/react'
import { SourceCitation } from './SourceCitation'
import { SuggestedQuestions } from './SuggestedQuestions'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MessageListProps {
  messages: UIMessage[]
  isLoading: boolean
  onQuestionClick: (question: string) => void
  error?: Error
}

export function MessageList({ messages, isLoading, onQuestionClick, error }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <p className="mb-6 text-lg text-muted-foreground">
              Start a conversation by asking a question about Georgian College.
            </p>
            <SuggestedQuestions onQuestionClick={onQuestionClick} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 pb-6 sm:gap-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex w-full ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] sm:px-5 sm:py-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
                  {message.parts
                    .filter((part) => part.type === 'text')
                    .map((part) => (part as { text: string }).text)
                    .join('')}
                </p>
              ) : (
                <div className="text-sm leading-relaxed sm:text-base">
                  <SourceCitation
                    content={message.parts
                      .filter((part) => part.type === 'text')
                      .map((part) => (part as { text: string }).text)
                      .join('')}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-gray-100 px-4 py-3 shadow-sm dark:bg-gray-800 sm:max-w-[75%] sm:px-5 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-gray-400 dark:bg-gray-500"></div>
                <div className="h-2 w-2 animate-pulse rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:0.2s]"></div>
                <div className="h-2 w-2 animate-pulse rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:bg-destructive/20 sm:max-w-[75%] sm:px-5 sm:py-4">
              <p className="font-medium">Unable to process your request.</p>
              <p className="mt-1 text-xs opacity-90">Please try again in a moment.</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
