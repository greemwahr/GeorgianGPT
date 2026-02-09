# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GeorgianGPT is a RAG (Retrieval-Augmented Generation) powered chatbot for Georgian College. It uses the college's website content to answer student questions through a ChatGPT-like interface.

**Repository**: https://github.com/greemwahr/GeorgianGPT

**Target Website**: Georgian College (https://www.georgiancollege.ca)
- Crawl scope: `*.georgiancollege.ca` with depth limit 8
- Priority sections: Programs, Admissions, Student Services, Academic Calendar

**Architecture**: Next.js frontend → RAG pipeline → Supabase pgvector (retrieval) → Mistral-7B on HuggingFace → Streaming responses

**Project Status**: Planning phase complete
- 2 epics created: Backend (fn-1-j9y) and Frontend (fn-2-5on)
- 8 tasks defined and reviewed by Codex CLI
- All critical architectural issues resolved
- Ready for implementation

## Development Commands

### Frontend (Next.js)
```bash
# Initial setup
npx create-next-app@latest georgian-gpt --typescript --tailwind --app
npm install ai @ai-sdk/openai @supabase/supabase-js openai replicate
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card scroll-area

# Development
npm run dev

# Build
npm run build

# Lint
npm run lint
```

### Data Pipeline (Python/Scrapy)
```bash
# Setup Python environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt')"

# Run crawler
cd scripts/crawler
scrapy crawl college_spider -o output.json

# Generate embeddings and index to Supabase
python scripts/ingest.py
```

**Required Python dependencies** (`requirements.txt`):
```
scrapy==2.11.0
beautifulsoup4==4.12.2
lxml==4.9.3
PyMuPDF==1.23.8
nltk==3.8.1
openai==1.6.1
python-dotenv==1.0.0
tiktoken==0.5.2
supabase==2.3.0
```

## Architecture

### RAG Pipeline Flow
1. **User query + conversation history** → API route (`app/api/chat/route.ts`)
2. **Context-aware query** → Concatenate last 3 user messages for better retrieval
3. **Query embedding** → OpenAI text-embedding-3-small with explicit `dimensions: 1536`
4. **Vector search** → Supabase pgvector similarity search (k=5, threshold=0.7, cosine distance)
5. **Context retrieval** → Top-k chunks with metadata (page_title, source_url, content_hash)
6. **Prompt construction** → RAG template with context + conversation history + citation rules
7. **LLM inference** → Mistral-7B-Instruct-v0.3 on HuggingFace (60s timeout, 3 retries)
8. **Streaming response** → Vercel AI SDK streams back to frontend
9. **Structured logging** → Log retrieval quality, response times, citations to Vercel Analytics

### Key Components

**Frontend** (`app/` and `components/chat/`):
- Chat interface uses Vercel AI SDK's `useChat` hook for streaming
- Maintains last 5 messages for conversation context
- Messages display with source citations as markdown links `[Page Title](URL)`
- Mobile-responsive design with college branding

**LLM Provider Abstraction** (`lib/llm/`):
- `provider.ts`: Interface defining standard LLM provider contract
- `factory.ts`: Creates provider instances based on `INFERENCE_PROVIDER` env variable
- `providers/`: Adapter implementations for HuggingFace, Together.ai, and Replicate
- **Stream normalization**: All adapters return `ReadableStream<Uint8Array>` with UTF-8 text chunks
  - HuggingFace: Pass through raw response stream
  - Together.ai: Parse SSE events, extract `delta.content`, encode to UTF-8
  - Replicate: Convert async iterator to ReadableStream
- **Switching providers**: Change `INFERENCE_PROVIDER` environment variable and redeploy (no code changes)

**RAG Backend** (`lib/rag/`):
- `retriever.ts`: Supabase pgvector similarity search queries with conversation-aware embedding
- `embeddings.ts`: OpenAI embedding generation with explicit `dimensions: 1536`
- `prompt-builder.ts`: Constructs RAG prompts with context, conversation history, and citation rules

**API Routes** (`app/api/chat/route.ts`):
- Receives messages array from frontend (includes conversation history)
- Orchestrates RAG pipeline (context-aware embed → retrieve → prompt → generate)
- **IMPORTANT**: Uses Node.js runtime (NOT Edge) to support 60s timeout for LLM inference
- Streams LLM responses with retry logic applied to pre-stream steps only (embedding + retrieval)
- **Error handling**: 60s timeout, 3 retries with exponential backoff (1s, 2s, 4s), fallback messages
- **Logging**: Structured metrics including retrieval quality, response times, citations

**Data Pipeline** (`scripts/`):
- Scrapy spider: Crawls `georgiancollege.ca` (1 req/sec, depth 8, respects robots.txt)
- Content processing: Extracts from HTML/PDFs
- **Chunking**: Sentence splitting with NLTK punkt tokenizer, then pack into ~700 tiktoken tokens (cl100k_base encoding) with 100-token overlap
- **IMPORTANT**: Use tiktoken for token counting (NOT NLTK tokens) to match model's tokenization
- **Deduplication**: SHA-256 hash of normalized content (collapse whitespace, preserve case), skip duplicate chunks
- Ingest script: Generates embeddings and bulk inserts to Supabase
- **Index creation**: Create IVFFlat index AFTER data load - compute `lists = max(10, row_count // 1000)` first, then run `CREATE INDEX ... WITH (lists = <computed_literal>)`

### Supabase Schema

The `documents` table stores chunked content with embeddings:
- `id`: Primary key
- `content`: Text content (fixed 700 token chunks)
- `embedding`: vector(1536) for OpenAI embeddings
- `metadata`: JSONB with `source_url`, `page_title`, `section`
- `content_hash`: SHA-256 hash for deduplication (unique constraint)
- `created_at`: Timestamp

**Index Strategy**:
- IVFFlat index created AFTER initial data load (NOT before)
- Compute lists value first: `lists = max(10, row_count // 1000)`
- Then create index with literal value: `CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = <computed_literal>)`
- Separate B-tree index on `content_hash` for fast deduplication checks
- **Row Level Security**: Enable RLS with read-only policy for anon key OR use service-role key server-side only

### RAG Prompt Structure

System prompt instructs the LLM to:
- Only answer using provided context from college website
- Say "I don't have that information in the college resources" if context insufficient
- Cite sources using exact format: `[Page Title](URL)` as markdown links
- Include conversation history for multi-turn coherence

**Citation Rules**:
- Format: `[Page Title](URL)` inline after factual statements
- Deduplicate: If 3/5 chunks from same URL, cite once
- Placement: After each factual claim, not just at end
- Example: "The Business Administration program requires 60 credits according to [Business Programs](https://georgiancollege.ca/programs/business)."

## Environment Variables

Required for deployment:
- `OPENAI_API_KEY`: For embedding generation
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `INFERENCE_PROVIDER`: LLM provider selection (`huggingface`, `together`, or `replicate`)

**HuggingFace (if using)**:
- `HUGGINGFACE_API_KEY`: HuggingFace API token
- `HF_INFERENCE_ENDPOINT`: Mistral-7B inference endpoint URL

**Together.ai (if using)**:
- `TOGETHER_API_KEY`: Together.ai API key
- `TOGETHER_MODEL`: Model identifier (default: `mistralai/Mistral-7B-Instruct-v0.3`)

**Replicate (if using)**:
- `REPLICATE_API_KEY`: Replicate API key
- `REPLICATE_MODEL`: Model identifier (default: `mistralai/mistral-7b-instruct-v0.3`)

## Deployment

- **Frontend/API**: Vercel (free tier with Node.js runtime for API routes - required for 60s timeout)
- **Vector DB**: Supabase (free tier provides 500MB DB, unlimited API calls)
- **LLM**: HuggingFace Inference Endpoint (A10G GPU, auto-scales to zero) or Together.ai (recommended for cost)

## Task Management

This project uses **Flow-Next** for task tracking. All tasks are in `.flow/` directory:
- **Backend Epic (fn-1-j9y)**: 5 tasks covering data pipeline, Supabase setup, LLM providers, and RAG API
- **Frontend Epic (fn-2-5on)**: 3 tasks covering Next.js setup, chat components, and styling

**Key Dependency**: Backend task fn-1-j9y.5 (RAG API) requires frontend task fn-2-5on.1 (Next.js scaffold) to be completed first.

Use `.flow/bin/flowctl list` to see all tasks or `/flow-next:work fn-N.M` to start implementation.

## Critical Considerations

**Conversation Context**: Multi-turn conversations require maintaining history. Store last 5 messages client-side (useChat hook handles this automatically) and use last 3 user messages for context-aware retrieval by filtering `messages.filter(m => m.role === 'user').slice(-3)` and concatenating with newlines. Generate a single embedding from the concatenated text. This prevents the chatbot from "forgetting" earlier context.

**Chunking Strategy**: Use **fixed 700 tiktoken tokens** (cl100k_base encoding) with 100-token overlap, preferring sentence boundaries (NLTK punkt tokenizer). Split text into sentences first using NLTK, then pack sentences into chunks of ~700 tiktoken tokens. This consistency improves retrieval quality compared to variable chunk sizes. **Critical**: Count tokens using tiktoken (NOT NLTK tokens) to match model's tokenization.

**Content Deduplication**: Generate SHA-256 hash of normalized content (collapse whitespace, preserve case for case sensitivity) before embedding. College websites often have duplicate content (print versions, mirrors) that wastes API calls and storage. Skip chunks with duplicate content_hash values.

**Retrieval Quality**: The similarity search threshold (0.7) and match count (k=5) directly impact answer quality. Monitor avg similarity scores in logs and adjust if queries consistently return low-quality chunks.

**Citation Format**: Use exact format `[Page Title](URL)` inline after factual statements. Deduplicate citations from same URL. This is critical for student trust and verifying information.

**Crawler Configuration**: Rate limit to 1 request/second, depth 8, respect robots.txt. Target specific URL patterns (`/programs/`, `/admissions/`, `/student-life/`, `/services/`) to avoid crawling irrelevant sections.

**Index Timing**: Create IVFFlat index AFTER initial data load, not before. Compute `lists = max(10, row_count // 1000)` based on actual row count first, then create index with the computed literal value in SQL. Cannot use formula directly in CREATE INDEX statement. Creating index on empty table or with wrong parameters degrades performance.

**Error Handling**:
- **Runtime**: Use Node.js runtime (NOT Edge) in API routes to support 60s timeout
- **Retry logic**: 3 retries with exponential backoff (1s, 2s, 4s) applied to pre-stream steps only (embedding + retrieval)
- **Stream failures**: If stream fails mid-generation, send terminal error message and close connection
- No chunks retrieved: Return "I don't have that information in the college resources"
- Always return user-friendly messages, never expose internal errors
- Log all errors to Vercel Analytics for debugging but gracefully degrade
- Circuit breaker omitted from MVP (requires stateful storage) - add post-MVP if needed

**Embedding Dimension Lock**: Always specify `dimensions: 1536` in OpenAI API calls. The text-embedding-3-small model supports configurable dimensions, but changing this breaks the entire vector DB schema.

**Cost Management**: With 10k queries/day, costs vary by provider:
- HuggingFace: $165-200/month (auto-scale) or $720/month (1 replica minimum)
- Together.ai: ~$4-8/month (no cold starts, managed service) - **Recommended for cost optimization**
- Replicate: ~$10-20/month (pay-per-second billing)

Switch providers by changing `INFERENCE_PROVIDER` environment variable - the adapter pattern requires zero code changes.

**Testing Before Launch**: Create 25-30 test questions across categories (admissions, programs, services, policies, multi-turn, out-of-scope) with expected answers and sources. Target >80% accuracy before production deployment.

<!-- BEGIN FLOW-NEXT -->
## Flow-Next

This project uses Flow-Next for task tracking. Use `.flow/bin/flowctl` instead of markdown TODOs or TodoWrite.

**Quick commands:**
```bash
.flow/bin/flowctl list                # List all epics + tasks
.flow/bin/flowctl epics               # List all epics
.flow/bin/flowctl tasks --epic fn-N   # List tasks for epic
.flow/bin/flowctl ready --epic fn-N   # What's ready
.flow/bin/flowctl show fn-N.M         # View task
.flow/bin/flowctl start fn-N.M        # Claim task
.flow/bin/flowctl done fn-N.M --summary-file s.md --evidence-json e.json
```

**Rules:**
- Use `.flow/bin/flowctl` for ALL task tracking
- Do NOT create markdown TODOs or use TodoWrite
- Re-anchor (re-read spec + status) before every task

**More info:** `.flow/bin/flowctl --help` or read `.flow/usage.md`
<!-- END FLOW-NEXT -->
