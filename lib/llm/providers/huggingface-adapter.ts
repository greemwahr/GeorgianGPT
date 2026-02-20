import { ChatMessage, GenerationOptions, LLMProvider, ModelInfo } from '../provider'

function toMistralPrompt(systemPrompt: string, messages: ChatMessage[]): string {
  const promptParts: string[] = []
  const userAssistant = messages.filter((m) => m.role !== 'system')

  for (let i = 0; i < userAssistant.length; i++) {
    const msg = userAssistant[i]

    if (msg.role === 'user') {
      const hasAssistantAfter = i + 1 < userAssistant.length && userAssistant[i + 1].role === 'assistant'

      if (promptParts.length === 0) {
        promptParts.push(
          `<s>[INST] <<SYS>>\n${systemPrompt.trim()}\n<</SYS>>\n\n${msg.content.trim()} [/INST]`
        )
      } else {
        promptParts.push(`<s>[INST] ${msg.content.trim()} [/INST]`)
      }

      if (hasAssistantAfter) {
        promptParts.push(`${userAssistant[i + 1].content.trim()}</s>`)
        i += 1
      }
    }
  }

  return promptParts.join(' ')
}

export class HuggingFaceAdapter implements LLMProvider {
  private readonly endpoint = process.env.HF_INFERENCE_ENDPOINT || ''
  private readonly apiKey = process.env.HUGGINGFACE_API_KEY || ''

  generateStream(
    systemPrompt: string,
    messages: ChatMessage[],
    options: GenerationOptions = {}
  ): Promise<ReadableStream<Uint8Array>> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error('Missing HUGGINGFACE_API_KEY or HF_INFERENCE_ENDPOINT')
    }

    const prompt = toMistralPrompt(systemPrompt, messages)

    return fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature: options.temperature ?? 0.2,
          max_new_tokens: options.maxTokens ?? 512,
          top_p: options.topP ?? 0.9,
          return_full_text: false,
        },
        stream: true,
      }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`HuggingFace request failed: ${response.status} ${response.statusText}`)
      }
      if (!response.body) {
        throw new Error('HuggingFace response body is empty')
      }
      return response.body
    })
  }

  getModelInfo(): ModelInfo {
    return {
      provider: 'huggingface',
      modelName: process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3',
      costPer1MTokens: 0,
    }
  }
}
