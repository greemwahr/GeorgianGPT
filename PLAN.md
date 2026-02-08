# GeorgianGPT - College Chatbot Implementation Plan

## Overview
A ChatGPT-like web application for a Canadian college that uses RAG (Retrieval-Augmented Generation) to answer student questions using the college's website content.

**Target Website**: Georgian College (https://www.georgiancollege.ca)
- Main site scope: `*.georgiancollege.ca`
- Priority sections: Programs, Admissions, Student Services, Academic Calendar
- Exclude: News archives, events older than 6 months

## Architecture Summary

```
User → Next.js (Vercel) → RAG Pipeline → Supabase pgvector (retrieval) → Mistral-7B (HuggingFace) → Streaming Response
                                ↑
        College Website → Scrapy Crawler → Embeddings → Supabase pgvector (indexing)
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router) + Vercel AI SDK |
| Styling | Tailwind CSS + shadcn/ui |
| LLM | Mistral-7B-Instruct-v0.3 (HuggingFace Inference Endpoints) |
| Vector DB | Supabase pgvector (Free tier) |
| Embeddings | OpenAI text-embedding-3-small |
| Scraping | Scrapy (Python) + BeautifulSoup + PyMuPDF |
| Deployment | Vercel (frontend/API) + HuggingFace (LLM) + Supabase |

## Implementation Phases

### Phase 1: Project Setup & Data Pipeline

**1.1 Initialize Next.js Project**
```bash
npx create-next-app@latest georgian-gpt --typescript --tailwind --app
cd georgian-gpt
npm install ai @ai-sdk/openai @supabase/supabase-js openai replicate
npx shadcn-ui@latest init
# Install specific shadcn/ui components
npx shadcn-ui@latest add button input card scroll-area
```

**1.1b Initialize Python Environment**
```bash
# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
scrapy==2.11.0
beautifulsoup4==4.12.2
lxml==4.9.3
PyMuPDF==1.23.8
nltk==3.8.1
openai==1.6.1
python-dotenv==1.0.0
tiktoken==0.5.2
supabase==2.3.0
EOF

# Install dependencies
pip install -r requirements.txt

# Download NLTK data for sentence tokenization
python -c "import nltk; nltk.download('punkt')"
```

**1.2 Build Web Crawler (Python)**

Initialize Scrapy project:
```bash
mkdir scripts
cd scripts
scrapy startproject crawler
cd crawler
```

Create spider (`scripts/crawler/crawler/spiders/college_spider.py`):
```python
import scrapy
from bs4 import BeautifulSoup
import hashlib

class CollegeSpider(scrapy.Spider):
    name = 'college_spider'
    allowed_domains = ['georgiancollege.ca']
    start_urls = ['https://www.georgiancollege.ca/']

    custom_settings = {
        'DEPTH_LIMIT': 8,
        'DOWNLOAD_DELAY': 1,  # 1 req/sec rate limiting
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS': 1,
        'FEED_FORMAT': 'json',
        'FEED_URI': 'output.json',
    }

    # Priority URL patterns
    priority_patterns = ['/programs/', '/admissions/', '/student-life/', '/services/']

    def parse(self, response):
        # Extract main content
        soup = BeautifulSoup(response.text, 'lxml')

        # Remove navigation, footer, scripts
        for element in soup(['nav', 'footer', 'script', 'style', 'header']):
            element.decompose()

        # Extract text from main content area (adjust selector based on site structure)
        main_content = soup.find('main') or soup.find('article') or soup.find(id='content') or soup.body
        page_title = soup.find('h1').get_text(strip=True) if soup.find('h1') else response.css('title::text').get()
        content = main_content.get_text(separator='\n', strip=True) if main_content else ''

        # Determine section from URL
        section = 'General'
        for pattern in self.priority_patterns:
            if pattern in response.url:
                section = pattern.strip('/').title()
                break

        yield {
            'url': response.url,
            'page_title': page_title,
            'content': content,
            'section': section,
            'crawl_timestamp': scrapy.utils.misc.load_object('datetime').datetime.now().isoformat(),
        }

        # Follow links
        for href in response.css('a::attr(href)').getall():
            yield response.follow(href, self.parse)
```

Configure settings (`scripts/crawler/crawler/settings.py`):
```python
BOT_NAME = 'georgian_crawler'
SPIDER_MODULES = ['crawler.spiders']
NEWSPIDER_MODULE = 'crawler.spiders'
ROBOTSTXT_OBEY = True
USER_AGENT = 'GeorgianGPT-Crawler (Educational Project)'
```

Run crawler:
```bash
cd scripts/crawler
scrapy crawl college_spider -o output.json
```

Expected output format (`output.json`):
```json
{
  "url": "https://www.georgiancollege.ca/programs/computer-science/",
  "page_title": "Computer Science Program",
  "content": "Program overview text...",
  "section": "Programs",
  "crawl_timestamp": "2024-01-15T10:30:00.000000"
}
```

**1.3 Content Processing**
- HTML: BeautifulSoup to extract main content, remove nav/footer
- PDFs: PyMuPDF to extract text from calendars, handbooks
- **Content Deduplication**: Generate SHA-256 hash of normalized content (lowercase, whitespace-stripped), skip chunks with duplicate hashes
- **Chunking**: Fixed 700 tokens with 100-token overlap, prefer sentence boundaries using NLTK sentence tokenizer
- Preserve metadata: source URL, page title, section, content_hash

**1.4 Embedding & Indexing**
- Create Supabase project and enable pgvector extension
- Create `documents` table with vector column (1536 dimensions)
- Generate embeddings via OpenAI API with explicit `dimensions: 1536` parameter
- Batch insert chunks with metadata to Supabase
- **Important**: Create IVFFlat index AFTER initial data load with appropriate `lists` parameter based on row count (rule: lists = rows / 1000, minimum 10)

**Supabase Setup SQL:**
```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Create documents table
create table documents (
  id bigserial primary key,
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  content_hash text unique,  -- For deduplication
  created_at timestamptz default now()
);

-- Create index for content hash lookups
create index idx_content_hash on documents(content_hash);

-- NOTE: Create IVFFlat index AFTER data load
-- Run this after initial embedding insertion:
-- create index on documents using ivfflat (embedding vector_cosine_ops)
--   with (lists = GREATEST(10, (SELECT COUNT(*) / 1000 FROM documents)::int));
```

### Phase 2: RAG Backend

**2.1 API Route Structure**
```
app/api/chat/route.ts
├── Receive messages array from frontend (includes conversation history)
├── Build context-aware query from last 3-5 messages
├── Generate query embedding (OpenAI with dimensions: 1536)
├── Retrieve top-k chunks (Supabase pgvector similarity search, k=5, threshold=0.7)
├── Build RAG prompt with context + citations + conversation history
├── Stream response (HuggingFace via Vercel AI SDK)
├── Log structured metrics (see 2.1b below)
└── Error handling: timeout (60s), retry (3x with exponential backoff), fallback messages
```

**2.1b Structured Logging & Observability**

Log to Vercel Analytics and/or Axiom on every request:
```typescript
{
  timestamp: Date.now(),
  query: userMessage,
  conversationLength: messages.length,
  retrieval: {
    chunksRetrieved: 5,
    topSimilarityScore: 0.89,
    avgSimilarityScore: 0.76,
    chunkSources: ["url1", "url2", ...],
  },
  inference: {
    model: "mistral-7b-instruct",
    responseTimeMs: 1234,
    tokensGenerated: 150,
    error: null | "timeout" | "rate_limit",
  },
  citations: {
    count: 2,
    urls: ["url1", "url2"],
  },
  userFeedback: null, // populated later if user provides thumbs up/down
}
```

**Key Metrics to Track**:
- P50/P95/P99 response times
- Retrieval quality: avg similarity score distribution
- Answer rate: % queries with chunks above threshold
- Error rate by type (timeout, embedding failure, etc.)
- Most common queries (for content gap analysis)
- Citation coverage: % responses with citations

**2.1a Conversation History Management**
- Store last 5 messages in client state (useChat hook automatically handles this)
- Include conversation context in retrieval query:
  - Extract last 3 user messages: `messages.filter(m => m.role === 'user').slice(-3)`
  - Concatenate with newlines: `userMessages.map(m => m.content).join('\n')`
  - Generate single embedding from concatenated text (no weighting - keeps it simple)
- Pass full conversation history (all 5 messages) to LLM for coherent multi-turn responses

**Supabase Similarity Search Function:**
```sql
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

**2.2 RAG Prompt Template**
```
SYSTEM: You are GeorgianGPT, an AI assistant for Georgian College.
Answer questions using ONLY the provided context from the college website.
If the information isn't in the context, say "I don't have that information in the college resources."
Always cite sources using this exact format: [Page Title](URL)

Citation Rules:
- Cite after each factual claim from the context
- If multiple chunks from same URL, cite once with the most relevant page title
- Deduplicate citations - don't repeat the same source multiple times
- Format: "According to [Page Title](URL), ..." or "The [Page Title](URL) states that..."

CONTEXT:
{retrieved_chunks_with_sources}

CONVERSATION HISTORY:
{previous_messages}

Answer the user's question accurately and helpfully with proper citations.
```

**2.2a Citation Format Specification**
- **Format**: `[Page Title](URL)` as markdown links
- **Deduplication**: If 3/5 chunks are from same URL, cite once with best matching page title
- **Placement**: Inline after factual statements, not just at the end
- **Example**: "The Business Administration program requires 60 credits according to [Business Programs](https://georgiancollege.ca/programs/business)."
- **Metadata Required**: Store `page_title` and `source_url` in metadata JSONB for each chunk

**2.3 LLM Provider Architecture (Swappable Inference)**

To enable easy switching between inference providers for cost optimization, implement an adapter pattern:

**Provider Interface** (`lib/llm/provider.ts`):
```typescript
export interface LLMProvider {
  generateStream(systemPrompt: string, messages: Message[], options?: GenerationOptions): Promise<ReadableStream>
  getModelInfo(): ModelInfo
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
```

**Provider Adapters** (`lib/llm/providers/`):
- `huggingface-adapter.ts` - HuggingFace Inference Endpoints (Mistral-7B)
  - Custom endpoint authentication
  - Handles Mistral instruction format: `<s>[INST] ... [/INST]`
  - Returns raw response.body ReadableStream (already text chunks)
- `together-adapter.ts` - Together.ai API (Mistral-7B, $0.20/1M tokens)
  - OpenAI-compatible chat completions API
  - Streams SSE events, parse `data: {"choices":[{"delta":{"content":"..."}}]}`
  - Transform to text-only stream by extracting `delta.content`
- `replicate-adapter.ts` - Replicate API (Mistral-7B)
  - Returns async iterator of text chunks
  - Convert to ReadableStream using `new ReadableStream()` controller pattern
  - Each chunk is already plaintext (no parsing needed)

**Stream Normalization**:
All adapters must return `ReadableStream<Uint8Array>` where chunks are UTF-8 encoded text. The Vercel AI SDK expects this format for streaming responses. Each adapter handles its provider's format internally:
- HuggingFace: Pass through (already correct format)
- Together.ai: Parse SSE → extract content → encode to Uint8Array
- Replicate: Iterate async chunks → encode each → enqueue to stream controller

**Provider Factory** (`lib/llm/factory.ts`):
```typescript
export function createLLMProvider(): LLMProvider {
  const provider = process.env.INFERENCE_PROVIDER || 'huggingface'

  switch (provider) {
    case 'huggingface': return new HuggingFaceAdapter()
    case 'together': return new TogetherAdapter()
    case 'replicate': return new ReplicateAdapter()
    default: throw new Error(`Unknown provider: ${provider}`)
  }
}
```

**Environment Configuration**:
```bash
# Provider selection (switch by changing this one variable)
INFERENCE_PROVIDER=huggingface  # or 'together' or 'replicate'

# HuggingFace
HUGGINGFACE_API_KEY=xxx
HF_INFERENCE_ENDPOINT=https://xxx.aws.endpoints.huggingface.cloud

# Together.ai
TOGETHER_API_KEY=xxx
TOGETHER_MODEL=mistralai/Mistral-7B-Instruct-v0.3

# Replicate
REPLICATE_API_KEY=xxx
REPLICATE_MODEL=mistralai/mistral-7b-instruct-v0.3
```

**API Route Integration**:
```typescript
// app/api/chat/route.ts
const llmProvider = createLLMProvider()  // Single line change!
const stream = await llmProvider.generateStream(systemPrompt, messages, options)
```

**Switching Providers**: Change `INFERENCE_PROVIDER` environment variable and redeploy. No code changes needed.

**2.3a Error Handling & Resilience**
- **Timeouts**: 60s for LLM inference (accounts for HuggingFace cold starts)
- **Retries**: 3 attempts with exponential backoff (1s, 2s, 4s) for transient failures
- **Fallback Messages**:
  - LLM timeout: "The assistant is warming up. Please try again in a moment."
  - Supabase query failure: "Unable to retrieve information right now. Please try again."
  - No chunks retrieved: "I don't have that information in the college resources."
  - OpenAI embedding failure: "Unable to process your question. Please try again."
- **Graceful Degradation**: Log all errors to Vercel Analytics but always return user-friendly messages (never expose internal errors)
- **Note**: Circuit breaker pattern omitted from MVP (requires stateful storage like Vercel KV or Redis). Add in post-MVP if needed.

### Phase 3: Chat Frontend

**3.1 Components**
- `ChatInterface`: Main chat container with useChat hook
- `MessageList`: Display messages with streaming support
- `MessageInput`: Text input with send button
- `SourceCitation`: Clickable links to college pages

**3.2 Features**
- Streaming text display
- Source citations in responses
- Suggested starter questions
- Mobile responsive layout
- College branding (logo, colors)

### Phase 4: Deployment

**4.1 Environment Variables**
```
# Core services
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=

# LLM Provider (choose one)
INFERENCE_PROVIDER=huggingface  # or 'together' or 'replicate'

# HuggingFace (if using)
HUGGINGFACE_API_KEY=
HF_INFERENCE_ENDPOINT=

# Together.ai (if using)
TOGETHER_API_KEY=
TOGETHER_MODEL=mistralai/Mistral-7B-Instruct-v0.3

# Replicate (if using)
REPLICATE_API_KEY=
REPLICATE_MODEL=mistralai/mistral-7b-instruct-v0.3
```

**4.2 Deploy to Vercel**
- Connect GitHub repo
- Configure environment variables
- Deploy with Edge runtime for API routes

## Project Structure

```
georgian-gpt/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       └── chat/
│           └── route.ts
├── components/
│   ├── chat/
│   │   ├── chat-interface.tsx
│   │   ├── message-list.tsx
│   │   ├── message-input.tsx
│   │   └── source-citation.tsx
│   └── ui/ (shadcn components)
├── lib/
│   ├── llm/                   # LLM Provider abstraction
│   │   ├── provider.ts        # Interface & types
│   │   ├── factory.ts         # Provider factory
│   │   └── providers/
│   │       ├── huggingface-adapter.ts
│   │       ├── together-adapter.ts
│   │       └── replicate-adapter.ts
│   ├── rag/
│   │   ├── retriever.ts       # Supabase pgvector queries
│   │   ├── embeddings.ts
│   │   └── prompt-builder.ts
│   ├── supabase.ts            # Supabase client
│   └── config.ts
├── scripts/
│   ├── crawler/ (Scrapy project)
│   │   ├── spiders/
│   │   │   └── college_spider.py
│   │   └── scrapy.cfg
│   └── ingest.py (embedding & indexing)
└── package.json
```

## Estimated Costs (MVP)

**Assumptions for Cost Calculation**:
- Student usage: 1000 active users × 10 queries/day = 10,000 queries/day
- Average inference time: 2 seconds per query
- Initial crawl: 2000 pages × 3 chunks/page = 6,000 chunks
- Weekly re-crawl for content freshness

| Service | Monthly Cost | Calculation |
|---------|-------------|-------------|
| Vercel | $0 | Free tier (sufficient for MVP) |
| Supabase | $0 | Free tier: 500MB DB (using ~18MB), unlimited API |
| **HuggingFace Inference** | **$165-200** | A10G GPU (~$1/hr) × 5.5 hrs/day × 30 days = $165<br/>**With 1 replica minimum**: ~$720/month (24/7)<br/>**Recommendation**: Use auto-scale to zero + 60s timeout |
| OpenAI Embeddings | $1-2 | Initial: 6M tokens × $0.02/1M = $0.12<br/>Weekly re-crawl: 6M × 4 = $0.48/month<br/>Query embeddings: 10k queries × 50 tokens × 30 days = 15M tokens = $0.30/month<br/>**Total**: ~$1/month |
| **Total (auto-scale)** | **$166-202/month** | |
| **Total (1 replica min)** | **$721-722/month** | Better UX, no cold starts |

**Cost Optimization Strategies**:
1. **Use cheaper LLM provider**: Switch to Together.ai ($0.20/1M tokens) or Replicate via `INFERENCE_PROVIDER` env variable
2. **Reduce usage**: Implement aggressive rate limiting (5 queries/user/hour)
3. **Hybrid approach**: Keep 1 replica during peak hours (8am-10pm), auto-scale off-peak
4. **Provider comparison**:
   - HuggingFace: $165-720/month (depends on auto-scale config), full control over infrastructure
   - Together.ai: ~$4-8/month (10k queries × 200 tokens avg × $0.20/1M), no cold starts, managed service
   - Replicate: ~$10-20/month, pay-per-second billing, scales automatically

**Revised Recommendation**: Start with HuggingFace auto-scale ($166/month) for MVP. If cold starts are problematic, switch to Together.ai ($4-8/month) using the provider adapter - just change `INFERENCE_PROVIDER=together` and redeploy. This saves $160/month with better latency.

## Verification Plan

**Pre-Implementation: Create Evaluation Test Set**
- Create 25-30 test questions across categories:
  - **Admissions** (5 questions): "What's the application deadline?", "What GPA do I need?"
  - **Programs** (8 questions): "What programs offer co-op?", "How long is the Computer Science program?"
  - **Student Services** (5 questions): "Where is the library?", "How do I get a student card?"
  - **Academic Policies** (5 questions): "What's the withdrawal deadline?", "How is GPA calculated?"
  - **Multi-turn** (4 questions): Follow-up questions requiring conversation context
  - **Out-of-scope** (3 questions): Questions with no answer in college website
- For each question, document:
  - Expected answer (1-2 sentences)
  - Expected source URL(s)
  - Success criteria (must include X information, must cite Y page)

**Implementation Testing**
1. **Data Pipeline**: Run crawler on test subset, verify chunks in Supabase, check deduplication works
2. **RAG Quality**: Run all 25 test questions, measure:
   - Retrieval precision@5: Are retrieved chunks relevant?
   - Answer accuracy: Does response match expected answer?
   - Citation accuracy: Are citations present and correct?
   - Target: >80% accuracy before moving to Phase 3
3. **API**: Test `/api/chat` endpoint with curl, verify streaming works, test error handling
4. **Frontend**: Test chat UI in browser, verify streaming display, test conversation history
5. **End-to-end**: Run full test set, collect metrics, iterate on retrieval thresholds and prompt

## Next Steps After MVP

- ~~Add conversation history/memory~~ (now included in Phase 2)
- Implement rate limiting (Upstash Redis)
- Add circuit breaker for error handling (requires Vercel KV or Redis for state)
- Add feedback mechanism (thumbs up/down)
- Analytics dashboard with observability metrics
- Scheduled re-crawling for content freshness
