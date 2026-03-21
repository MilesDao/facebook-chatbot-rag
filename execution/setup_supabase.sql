-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists documents (
  id bigserial primary key,
  content text not null,       -- The actual text content to be fed to the LLM
  metadata jsonb,              -- Optional metadata (e.g., source url, title)
  embedding vector(768)        -- 768 dimensions for intfloat/multilingual-e5-base
);

-- Create a function to perform similarity search via RPC
create or replace function match_documents (
  query_embedding vector(768),
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
