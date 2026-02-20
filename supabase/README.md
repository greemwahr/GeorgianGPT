# Supabase schema for GeorgianGPT

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the Dashboard, go to **SQL Editor** → **New query**.
3. Paste and run the contents of `migrations/20260220000000_create_documents_and_match.sql`.

## What it creates

- **pgvector** extension
- **documents** table: `id`, `content`, `embedding vector(1536)`, `metadata`, `content_hash` (unique), `created_at`
- **idx_content_hash** index for deduplication lookups
- **match_documents(query_embedding, match_threshold, match_count)** – cosine similarity search returning `id`, `content`, `metadata`, `similarity`

## IVFFlat index

The IVFFlat index on `embedding` is **not** created here. It is created by the ingest script **after** loading data, with `lists = max(10, row_count // 1000)`. See `scripts/ingest.py` (fn-1-j9y.2).

## RLS

The migration leaves RLS commented. Use either:

- **Service-role key** in the RAG API only (recommended for this app), or
- Uncomment the RLS statements and use a read-only policy for the anon key if the frontend queries Supabase directly.
