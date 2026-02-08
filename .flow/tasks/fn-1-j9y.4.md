# fn-1-j9y.4 Implement LLM provider abstraction layer

## Description

Create LLM provider abstraction with factory pattern supporting HuggingFace, Together.ai, and Replicate for cost-flexible inference.

## Acceptance

- [ ] LLMProvider interface defined: generateStream(systemPrompt, messages, options), getModelInfo()
- [ ] GenerationOptions interface: temperature?, maxTokens?, topP?
- [ ] ModelInfo interface: provider, modelName, costPer1MTokens
- [ ] HuggingFaceAdapter: Mistral instruction format `<s>[INST]...[/INST]`, returns raw ReadableStream
- [ ] TogetherAdapter: Parse SSE events, extract delta.content, encode to Uint8Array
- [ ] ReplicateAdapter: Convert async iterator to ReadableStream with controller pattern
- [ ] createLLMProvider factory: reads INFERENCE_PROVIDER env var, returns correct adapter
- [ ] All adapters return ReadableStream<Uint8Array> with UTF-8 text chunks
- [ ] Provider switching tested: change env var, verify streaming works

## Implementation Notes

Stream normalization critical: Vercel AI SDK expects ReadableStream<Uint8Array>. Each adapter handles provider-specific format internally.

## Done summary
TBD

## Evidence
- Commits:
- Tests: Test each adapter with mock providers, verify stream format
- PRs:
