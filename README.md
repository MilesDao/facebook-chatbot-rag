# 🤖 OpenRouter AI Messenger Bot (RAG)

A professional, end-to-end AI Messenger Bot system featuring a high-performance Backend and a premium Admin Dashboard. Fully migrated to the **OpenRouter AI Stack**.

## 🏗️ Project Structure
* `backend/`: FastAPI server handling webhooks, RAG logic, and OpenRouter integration.
* `admin-dashboard/`: Next.js (TypeScript) management interface with a premium glassmorphic UI.
* `raw_data/`: Local storage for documents pending ingestion.

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.10+
* Node.js 18+
* Supabase Account (for Vector DB)
* OpenRouter API Key

### 2. Database Initialization (Supabase)
Execute the following SQL in your Supabase SQL Editor to support **2048-dimensional** vectors (required for NVIDIA Nemo models):

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
```

## 🧪 Testing the LLM

To verify that the LLM and RAG system are working correctly, you can use the built-in test scripts:

### 1. Interactive Chat Test (Full Pipeline)
This script tests the intent router, RAG retrieval, and chat completion in an interactive terminal loop.
```bash
# Ensure you have the virtual environment active
./venv/bin/python test_chat.py
```

### 2. Direct Embedding Test
This script tests the connection to OpenRouter and verifies that embeddings are being generated with the correct 2048 dimensions.
```bash
./venv/bin/python backend/scratch_test.py
```

### 3. Backend Direct Response Test
You can also test the raw message handler directly:
```bash
./venv/bin/python backend/testtam.py
```
