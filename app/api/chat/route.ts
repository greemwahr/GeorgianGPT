import { createUIMessageStreamResponse } from 'ai'

// Mock API route for frontend testing
// This will be replaced by the full RAG implementation in fn-1-j9y.5
export const runtime = 'nodejs' // Use Node.js runtime for 60s timeout support

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const lastMessage = messages?.[messages.length - 1]?.content || ''

    const mockResponse = `I'm a mock response for testing the chat interface. You asked: "${lastMessage}"

In a real implementation, this would:
1. Retrieve relevant information from Georgian College's website using RAG
2. Generate a contextual response with citations like [Programs Page](https://georgiancollege.ca/programs)
3. Stream the response back to you

This mock API route will be replaced by the full RAG pipeline in the backend task (fn-1-j9y.5).`

    // Create a simple streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const words = mockResponse.split(' ')
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i]
          const chunk = i === 0 ? word : ' ' + word
          
          // Format as data stream: 0:"text"
          const data = `0:"${chunk.replace(/"/g, '\\"')}"\n`
          controller.enqueue(encoder.encode(data))
          
          // Simulate streaming delay
          await new Promise(resolve => setTimeout(resolve, 30))
        }
        
        // End of stream
        controller.enqueue(encoder.encode('d:{"finishReason":"stop"}\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
