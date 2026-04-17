create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- Ensure schema permissions are correct
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- 1. BOT SETTINGS (API Keys & Config)
create table if not exists bot_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  page_access_token text,
  openrouter_api_key text,
  page_id text,
  verify_token text,
  llm_model text default 'openai/gpt-oss-120b:free',
  app_secret text,
  updated_at timestamptz default now()
);

alter table bot_settings enable row level security;
drop policy if exists "Users can manage their own bot settings" on bot_settings;
create policy "Users can manage their own bot settings"
  on bot_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Allow internal lookup by verify_token"
  on bot_settings for select
  using (true); -- We only expose non-sensitive fields in select if needed, but here we need it for lookup.

-- 2. DOCUMENTS (Vector Data)
create table if not exists documents (
  id bigserial primary key,
  content text not null,
  metadata jsonb,
  embedding vector(1536),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade
);

alter table documents enable row level security;
drop policy if exists "Users can manage their own documents" on documents;
create policy "Users can manage their own documents"
  on documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. FAQS
create table if not exists faqs (
  id bigint primary key generated always as identity,
  keyword text not null,
  question text,
  answer text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table faqs enable row level security;
drop policy if exists "Users can manage their own faqs" on faqs;
create policy "Users can manage their own faqs"
  on faqs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. LOGS
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  sender_id text,
  user_message text,
  ai_reply text,
  confidence_score float,
  handoff_triggered boolean,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table logs enable row level security;
drop policy if exists "Users can manage their own logs" on logs;
create policy "Users can manage their own logs"
  on logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. HANDOFFS
create table if not exists handoffs (
  id uuid primary key default gen_random_uuid(),
  sender_id text,
  user_message text,
  confidence_score float,
  status text default 'active',
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table handoffs enable row level security;
drop policy if exists "Users can manage their own handoffs" on handoffs;
create policy "Users can manage their own handoffs"
  on handoffs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. APP SETTINGS (Shared/Internal)
create table if not exists app_settings (
  id bigint primary key generated always as identity,
  setting_key text unique not null,
  setting_value text not null,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table app_settings enable row level security;
drop policy if exists "Users can manage their own app settings" on app_settings;
create policy "Users can manage their own app settings"
  on app_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. SIMILARITY SEARCH FUNCTION
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid -- Pass auth.uid() from the client/backend
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
  where (documents.user_id = p_user_id) -- Filter by user
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- 8. INDEXING
-- Use HNSW for 1536-dimensional embeddings (Safe for index limits)
create index if not exists documents_embedding_idx 
on documents 
using hnsw (embedding vector_cosine_ops);

-- 9. CHAT HISTORY
create table if not exists chat_history (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Note: In multi-tenant setups, if history is tied to a specific bot (user_id),
-- ensure you add the user_id column with CASCADE as well:
-- alter table chat_history add column user_id uuid references auth.users(id) on delete cascade;


-- --- MAINTENANCE: FIX FOR DELETION ERRORS ---
-- If you experience "Database error deleting user", run these to ensure all constraints are properly cascaded:
-- 
-- ALTER TABLE bot_settings 
--   DROP CONSTRAINT IF EXISTS bot_settings_user_id_fkey,
--   ADD CONSTRAINT bot_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--
-- ALTER TABLE documents 
--   DROP CONSTRAINT IF EXISTS documents_user_id_fkey,
--   ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
--
-- ... (repeat for faqs, logs, handoffs, app_settings)