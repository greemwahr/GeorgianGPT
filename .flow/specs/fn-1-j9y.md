# fn-1-j9y Backend: Data Pipeline & RAG Infrastructure

## Overview

Build the complete backend infrastructure for GeorgianGPT: data ingestion pipeline (web crawler → chunking → embedding → vector storage) and RAG API endpoints that enable the frontend to query college information using retrieval-augmented generation.

## Scope

**Data Pipeline**:
- Scrapy crawler for georgiancollege.ca (respects robots.txt, 1 req/sec, depth 8)
- Content processing: 700-token chunks with 100-token overlap using NLTK
- SHA-256 deduplication to prevent duplicate content
- OpenAI embeddings (text-embedding-3-small, dimensions=1536)
- Supabase documents table with pgvector storage
- IVFFlat index creation after data load

**RAG API**:
- `/api/chat` endpoint with streaming responses
- Context-aware retrieval (last 3 user messages)
- Similarity search with threshold 0.7, top-5 results
- LLM provider abstraction (HuggingFace/Together.ai/Replicate)
- Error handling (60s timeout, 3 retries with backoff)
- Structured logging for observability

## Approach

**Phase 1: Python Environment & Crawler**
1. Set up Python venv, install requirements (Scrapy, BeautifulSoup, PyMuPDF, NLTK)
2. Download NLTK punkt tokenizer data
3. Initialize Scrapy project in scripts/crawler/
4. Implement CollegeSpider with priority URL patterns (/programs/, /admissions/, /student-life/, /services/)
5. Test crawler on subset, verify JSON output schema

**Phase 2: Content Processing & Ingestion**
1. Implement ingest.py for chunking and embedding
2. Sentence splitting with NLTK, token counting with tiktoken (cl100k_base)
3. Pack sentences into ~700 tiktoken tokens with 100-token overlap
4. Generate SHA-256 hashes for deduplication (normalize: collapse whitespace)
5. Batch insert to Supabase with metadata (page_title, source_url, content_hash)
6. Create IVFFlat index AFTER data load: compute `lists = max(10, row_count // 1000)`, then run `CREATE INDEX ... WITH (lists = <computed_value>)`

**Phase 3: Supabase Setup**
1. Create documents table: id, content, embedding vector(1536), metadata jsonb, content_hash unique, created_at
2. Create idx_content_hash index for fast lookups
3. Implement match_documents function for cosine similarity search (add `WHERE embedding IS NOT NULL`)
4. Configure RLS: Enable RLS + add read-only policy for anon key OR use service-role key server-side only

**Phase 4: LLM Provider Abstraction**
1. Define LLMProvider interface (generateStream, getModelInfo)
2. Implement adapters using plain fetch (NO Node-only SDKs for Edge compatibility):
   - HuggingFaceAdapter: Mistral instruction format, raw stream passthrough
   - TogetherAdapter: Parse SSE events, extract delta.content
   - ReplicateAdapter: Fetch-based streaming (avoid Node SDK)
3. Create factory with INFERENCE_PROVIDER env var switching

**Phase 5: RAG API Route** (depends on fn-2-5on.1 Next.js scaffold)
1. Implement app/api/chat/route.ts with Node.js runtime (NOT Edge - 60s timeout needed)
2. Extract last 3 user messages: `messages.filter(m => m.role === 'user').slice(-3)`
3. Concatenate messages, generate embedding (dimensions: 1536)
4. Retry logic: Apply retries (3x, 1s/2s/4s backoff) to pre-stream steps (embedding + retrieval)
5. Call match_documents(embedding, 0.7, 5)
6. Build RAG prompt with context + conversation history
7. Stream LLM response via createLLMProvider() (if stream fails mid-generation, send terminal error message)
8. Log: query, retrieval scores, response time, citations

## Quick commands

```bash
# Python environment setup
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt')"

# Run crawler
cd scripts/crawler && scrapy crawl college_spider -o output.json

# Run ingestion
python scripts/ingest.py

# Test API
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"What programs does Georgian College offer?"}]}'
```

## Acceptance

**Data Pipeline**:
- [ ] Crawler output includes url, page_title, content, section, crawl_timestamp
- [ ] Content chunks are 700 ± 50 tokens with 100-token overlap
- [ ] Duplicate content is filtered via SHA-256 hashing
- [ ] Embeddings stored in Supabase with dimensions=1536
- [ ] IVFFlat index created with correct lists parameter

**RAG API**:
- [ ] `/api/chat` accepts messages array, returns streaming response
- [ ] Context-aware retrieval uses last 3 user messages
- [ ] Similarity search returns top-5 chunks with similarity >0.7
- [ ] Citations formatted as `[Page Title](URL)`
- [ ] Provider switching works via INFERENCE_PROVIDER env var (no code changes)
- [ ] Error handling includes 60s timeout, 3 retries, user-friendly fallback messages
- [ ] Structured logs capture retrieval quality metrics

**Quality Gates**:
- [ ] Test queries return relevant context with >0.7 similarity
- [ ] All 3 providers (HuggingFace/Together/Replicate) stream responses correctly
- [ ] Error retries work with exponential backoff (1s, 2s, 4s)

## References

- PLAN.md: Full implementation details
- CLAUDE.md: Architecture overview and critical considerations
- Supabase pgvector docs: https://supabase.com/docs/guides/ai/vector-columns
- OpenAI embeddings API: https://platform.openai.com/docs/guides/embeddings
