import { ChatMessage, GenerationOptions, LLMProvider, ModelInfo } from '../provider'

export class TogetherAdapter implements LLMProvider {
  private readonly apiKey = process.env.TOGETHER_API_KEY || ''
  private readonly model = process.env.TOGETHER_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'
  private readonly endpoint = 'https://api.together.xyz/v1/chat/completions'

  async generateStream(
    systemPrompt: string,
    messages: ChatMessage[],
    options: GenerationOptions = {}
  ): Promise<ReadableStream<Uint8Array>> {
    if (!this.apiKey) {
      throw new Error('Missing TOGETHER_API_KEY')
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 512,
        top_p: options.topP ?? 0.9,
      }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`Together request failed: ${response.status} ${response.statusText}`)
    }

    const decoder = new TextDecoder()
    const encoder = new TextEncoder()
    const reader = response.body.getReader()

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue

            const data = trimmed.slice(5).trim()
            if (!data || data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta: string | undefined = parsed?.choices?.[0]?.delta?.content
              if (delta) {
                controller.enqueue(encoder.encode(delta))
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }

        controller.close()
      },
      cancel() {
        void reader.cancel()
      },
    })
  }

  getModelInfo(): ModelInfo {
    return {
      provider: 'together',
      modelName: this.model,
      costPer1MTokens: 0.2,
    }
  }
}
