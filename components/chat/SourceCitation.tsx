'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface SourceCitationProps {
  content: string
}

/**
 * SourceCitation component renders markdown content with clickable links.
 * Specifically handles citation format: [Page Title](URL)
 */
export function SourceCitation({ content }: SourceCitationProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Customize link rendering for citations
        a: ({ node, href, children, ...props }) => {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              {...props}
            >
              {children}
            </a>
          )
        },
        // Style paragraphs for better readability
        p: ({ node, ...props }) => (
          <p className="mb-2 last:mb-0" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
