# 🤖 Gemini Messenger AI Bot (RAG)

A professional, end-to-end AI Messenger Bot system featuring a high-performance Backend and a premium Admin Dashboard. Fully migrated to the **Google Gemini 3.1 Stack**.

## 🏗️ Project Structure
* `backend/`: FastAPI server handling webhooks, RAG logic, and Gemini integration.
* `admin-dashboard/`: Next.js (TypeScript) management interface with a premium glassmorphic UI.
* `raw_data/`: Local storage for documents pending ingestion.

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.10+
* Node.js 18+
* Supabase Account (for Vector DB)
* Google AI Studio API Key (Gemini)

### 2. Database Initialization (Supabase)
Execute the following SQL in your Supabase SQL Editor to support **2048-dimensional** vectors:

```sql
-- Enable Vector Extension
create extension if not exists vector;

-- Create Documents Table
create table documents (
  id bigint primary key generated always as identity,
  content text,
  metadata jsonb,
  embedding vector(2048) 
);

-- Create Search Function
create or replace function match_documents (
  query_embedding vector(2048),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
