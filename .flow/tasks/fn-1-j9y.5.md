# fn-1-j9y.5 Build RAG API route with streaming and error handling

## Description

Implement `/api/chat` endpoint with context-aware retrieval, RAG prompt construction, streaming responses, error handling, and structured logging.

**Dependency**: Requires fn-2-5on.1 (Next.js project scaffold) to be completed first.

## Acceptance

- [ ] app/api/chat/route.ts with Node.js runtime (NOT Edge - need 60s timeout)
- [ ] Accept POST with messages array: [{role: 'user'|'assistant', content: string}]
- [ ] Extract last 3 user messages: `messages.filter(m => m.role === 'user').slice(-3)`
- [ ] Concatenate messages with newlines, generate embedding (dimensions: 1536)
- [ ] Retry logic: 3 retries with 1s/2s/4s backoff applied to pre-stream steps (embedding + retrieval)
- [ ] Call match_documents with threshold 0.7, k=5
- [ ] Build RAG prompt with retrieved context + conversation history
- [ ] Cite sources as `[Page Title](URL)` (deduplicate if 3+/5 from same URL)
- [ ] Stream response via createLLMProvider() (fetch-based, no Node SDK for Edge compat)
- [ ] If stream fails mid-generation, send terminal error message and close
- [ ] Error handling: 60s timeout for LLM inference
- [ ] Fallback messages for each error type (timeout, no chunks, embedding failure)
- [ ] Structured logging: query, retrieval (scores, sources), inference (time, tokens, error), citations

## Implementation Notes

Use lib/rag/retriever.ts for Supabase queries, lib/rag/embeddings.ts for OpenAI, lib/rag/prompt-builder.ts for RAG prompt. Log to Vercel Analytics or console.log for MVP.

## Done summary
TBD

## Evidence
- Commits:
- Tests: curl test, verify streaming, test error scenarios
- PRs:
