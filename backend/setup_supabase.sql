-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists documents (
  id bigserial primary key,
  content text not null,       -- The actual text content to be fed to the LLM
  metadata jsonb,              -- Optional metadata (e.g., source url, title)
  embedding vector(786)        -- 786 dimensions
);

-- Create a function to perform similarity search via RPC
create or replace function match_documents (
  query_embedding vector(786),
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
  -- <=> is the cosine distance operator in pgvector
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;

-- Create an index to speed up similarity searches
-- (Only necessary if you have a lot of rows, e.g., > 100,000)
create index if not exists documents_embedding_idx 
on documents 
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Table for analytics logging
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  sender_id text,
  user_message text,
  ai_reply text,
  confidence_score float,
  handoff_triggered boolean,
  created_at timestamptz default now()
);

-- Table for human handoff status
create table if not exists handoffs (
  id uuid primary key default gen_random_uuid(),
  sender_id text,
  user_message text,
  confidence_score float,
  status text default 'active', -- 'active' or 'resolved'
  created_at timestamptz default now()
);
