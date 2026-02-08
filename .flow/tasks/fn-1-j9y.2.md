# fn-1-j9y.2 Implement content processing and ingestion pipeline

## Description

Build `scripts/ingest.py` to process crawler output, chunk text, generate embeddings, and insert to Supabase with deduplication.

## Acceptance

- [ ] Read crawler output JSON (url, page_title, content, section)
- [ ] Split content into sentences using NLTK punkt tokenizer
- [ ] Pack sentences into chunks of ~700 tiktoken tokens (cl100k_base encoding) with 100-token overlap
- [ ] Generate SHA-256 hash of normalized content (collapse whitespace, not lowercase to preserve case sensitivity)
- [ ] Skip duplicate chunks based on content_hash
- [ ] Generate embeddings via OpenAI with explicit `dimensions: 1536`
- [ ] Batch insert to Supabase documents table with metadata: {page_title, source_url, section}
- [ ] Compute row_count, calculate lists = max(10, row_count // 1000)
- [ ] Create IVFFlat index with computed lists value: `CREATE INDEX ... WITH (lists = <computed_literal>)`
- [ ] Verify chunk sizes are 700 ± 50 tiktoken tokens (NOT NLTK tokens)

## Implementation Notes

Use tiktoken (cl100k_base) for token counting, NLTK for sentence boundaries. Batch OpenAI API calls (100 chunks/batch). Supabase batch insert for speed.

## Done summary
TBD

## Evidence
- Commits:
- Tests: Verify deduplication works, check chunk token counts
- PRs:
