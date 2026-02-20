-- fn-1-j9y.3: Supabase schema and vector search for GeorgianGPT
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).

-- Enable pgvector extension
create extension if not exists vector;

-- Documents table: chunked content with embeddings for RAG
create table if not exists public.documents (
  id bigserial primary key,
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  content_hash text unique,
  created_at timestamptz default now()
);

-- Index for fast deduplication lookups by content_hash
create index if not exists idx_content_hash on public.documents (content_hash);

-- Cosine similarity search: returns id, content, metadata, similarity.
-- similarity = 1 - cosine_distance (pgvector <=> is cosine distance).
-- IVFFlat index is created by ingest script AFTER data load (see scripts/ingest.py).
create or replace function public.match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
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
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.embedding is not null
    and (1 - (d.embedding <=> query_embedding)) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- Optional: RLS with read-only policy for anon (use if frontend calls Supabase directly).
-- For server-only RAG API, you can use service_role key and skip enabling RLS.
-- alter table public.documents enable row level security;
-- create policy "Allow read for anon" on public.documents for select using (true);
