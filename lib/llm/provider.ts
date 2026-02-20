export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface GenerationOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
}

export interface ModelInfo {
  provider: 'huggingface' | 'together' | 'replicate'
  modelName: string
  costPer1MTokens: number
}

export interface LLMProvider {
  generateStream(
    systemPrompt: string,
    messages: ChatMessage[],
    options?: GenerationOptions
  ): Promise<ReadableStream<Uint8Array>>

  getModelInfo(): ModelInfo
}
