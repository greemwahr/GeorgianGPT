# AGENTS.md

Instructions for AI agents working with this codebase.

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

## Project Information

**GeorgianGPT** - RAG-powered chatbot for Georgian College
- **Repository**: https://github.com/greemwahr/GeorgianGPT
- **Architecture**: Next.js + Supabase pgvector + Mistral-7B (HuggingFace/Together.ai/Replicate)
- **Status**: Planning complete, ready for implementation

See CLAUDE.md for comprehensive project documentation including architecture, development commands, and critical implementation details.

## Task Structure

**Backend Epic (fn-1-j9y)**: Data Pipeline & RAG Infrastructure
- fn-1-j9y.1: Python environment & Scrapy crawler setup
- fn-1-j9y.2: Content processing & ingestion (chunking, embeddings, deduplication)
- fn-1-j9y.3: Supabase schema & vector search function
- fn-1-j9y.4: LLM provider abstraction layer (HuggingFace, Together.ai, Replicate)
- fn-1-j9y.5: RAG API route with streaming & error handling (depends on fn-2-5on.1)

**Frontend Epic (fn-2-5on)**: Chat UI & User Experience
- fn-2-5on.1: Next.js project initialization with dependencies
- fn-2-5on.2: Chat components (ChatInterface, MessageList, MessageInput)
- fn-2-5on.3: Styling, branding, and mobile responsiveness

## Critical Implementation Notes

**For Backend Agents**:
- Use **tiktoken** (cl100k_base) for token counting, NOT NLTK tokens
- Chunk size: ~700 tiktoken tokens with 100-token overlap
- IVFFlat index: compute `lists = max(10, row_count // 1000)` first, then create with literal
- API route: Node.js runtime (NOT Edge) for 60s timeout support
- Retry logic: apply to pre-stream steps only (embedding + retrieval)
- Content deduplication: SHA-256 hash of normalized content (collapse whitespace, preserve case)

**For Frontend Agents**:
- Use Vercel AI SDK `useChat` hook for streaming
- Maintain last 5 messages for conversation context
- Display citations as markdown links: `[Page Title](URL)`
- Georgian College branding colors (blue/gold)
- Mobile-responsive (375px+ screens)

**For All Agents**:
- Read task spec with `.flow/bin/flowctl show fn-N.M` before starting
- Start task with `.flow/bin/flowctl start fn-N.M`
- Complete task with `.flow/bin/flowctl done fn-N.M --summary-file s.md --evidence-json e.json`
- Or use `/flow-next:work fn-N.M` for guided implementation
