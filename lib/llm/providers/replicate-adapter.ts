import { ChatMessage, GenerationOptions, LLMProvider, ModelInfo } from '../provider'

interface ReplicatePredictionResponse {
  urls?: {
    stream?: string
  }
}

async function* streamReplicateOutput(streamUrl: string, token: string): AsyncGenerator<string> {
  const response = await fetch(streamUrl, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: 'text/event-stream',
    },
  })

  if (!response.ok || !response.body) {
    throw new Error(`Replicate stream failed: ${response.status} ${response.statusText}`)
  }

  const decoder = new TextDecoder()
  const reader = response.body.getReader()
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

      const payload = trimmed.slice(5).trim()
      if (!payload) continue

      try {
        const parsed = JSON.parse(payload)
        const output = parsed?.output

        if (typeof output === 'string') {
          yield output
        } else if (Array.isArray(output)) {
          for (const chunk of output) {
            if (typeof chunk === 'string') {
              yield chunk
            }
          }
        }
      } catch {
        // ignore non-JSON control frames
      }
    }
  }
}

export class ReplicateAdapter implements LLMProvider {
  private readonly apiKey = process.env.REPLICATE_API_KEY || ''
  private readonly model = process.env.REPLICATE_MODEL || 'mistralai/mistral-7b-instruct-v0.3'

  async generateStream(
    systemPrompt: string,
    messages: ChatMessage[],
    options: GenerationOptions = {}
  ): Promise<ReadableStream<Uint8Array>> {
    if (!this.apiKey) {
      throw new Error('Missing REPLICATE_API_KEY')
    }

    const prompt = [
      `System: ${systemPrompt}`,
      ...messages.map((m) => `${m.role}: ${m.content}`),
      'assistant:',
    ].join('\n')

    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: this.model,
        stream: true,
        input: {
          prompt,
          temperature: options.temperature ?? 0.2,
          max_new_tokens: options.maxTokens ?? 512,
          top_p: options.topP ?? 0.9,
        },
      }),
    })

    if (!createResponse.ok) {
      throw new Error(`Replicate request failed: ${createResponse.status} ${createResponse.statusText}`)
    }

    const prediction = (await createResponse.json()) as ReplicatePredictionResponse
    const streamUrl = prediction?.urls?.stream

    if (!streamUrl) {
      throw new Error('Replicate prediction did not return stream URL')
    }

    const iterator = streamReplicateOutput(streamUrl, this.apiKey)
    const encoder = new TextEncoder()

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        for await (const chunk of iterator) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      },
      cancel() {
        if (typeof iterator.return === 'function') {
          void iterator.return(undefined)
        }
      },
    })
  }

  getModelInfo(): ModelInfo {
    return {
      provider: 'replicate',
      modelName: this.model,
      costPer1MTokens: 0,
    }
  }
}
