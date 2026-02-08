# fn-1-j9y.3 Setup Supabase schema and vector search function

## Description

Create Supabase documents table with pgvector extension and implement match_documents function for cosine similarity search.

## Acceptance

- [ ] pgvector extension enabled: `create extension if not exists vector;`
- [ ] documents table created with schema:
  - id bigserial primary key
  - content text not null
  - embedding vector(1536)
  - metadata jsonb
  - content_hash text unique
  - created_at timestamptz default now()
- [ ] idx_content_hash index created
- [ ] match_documents function implemented with signature: (query_embedding vector(1536), match_threshold float, match_count int)
- [ ] Function returns: id, content, metadata, similarity (cosine distance: 1 - embedding <=> query_embedding)
- [ ] Function filters by similarity > threshold, orders by similarity desc, limits to match_count

## Implementation Notes

IVFFlat index created by ingest script AFTER data load, not in schema creation.

## Done summary
TBD

## Evidence
- Commits:
- Tests: Query match_documents with test embedding, verify results
- PRs:
