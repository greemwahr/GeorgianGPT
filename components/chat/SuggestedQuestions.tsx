'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void
  disabled?: boolean
}

const suggestedQuestions = [
  "What programs does Georgian College offer?",
  "How do I apply for admission?",
  "What student services are available?",
  "Tell me about co-op programs",
  "Where is the campus located?",
]

export function SuggestedQuestions({ onQuestionClick, disabled }: SuggestedQuestionsProps) {
  if (disabled) return null

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm font-medium text-muted-foreground">
        Suggested questions:
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestedQuestions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onQuestionClick(question)}
            className="text-left text-xs sm:text-sm"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  )
}
