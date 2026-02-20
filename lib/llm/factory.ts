import { LLMProvider } from './provider'
import { HuggingFaceAdapter } from './providers/huggingface-adapter'
import { TogetherAdapter } from './providers/together-adapter'
import { ReplicateAdapter } from './providers/replicate-adapter'

export function createLLMProvider(): LLMProvider {
  const provider = (process.env.INFERENCE_PROVIDER || 'huggingface').toLowerCase()

  switch (provider) {
    case 'huggingface':
      return new HuggingFaceAdapter()
    case 'together':
      return new TogetherAdapter()
    case 'replicate':
      return new ReplicateAdapter()
    default:
      throw new Error(`Unknown INFERENCE_PROVIDER: ${provider}`)
  }
}
