-- =====================================================================
-- MIGRATION V2: Multi-Tenant SaaS
-- FaceBook_RAG — Run ONCE in the Supabase SQL Editor
-- =====================================================================
-- STEP 0: Confirm pgvector is enabled (already done in v1)
create extension if not exists vector;


-- =====================================================================
-- STEP 1: profiles table (1:1 with auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- =====================================================================
-- STEP 2: bot_settings table (per-tenant Facebook + AI config)
-- =====================================================================
create table if not exists public.bot_settings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade not null unique,
  page_access_token  text not null default '',
  verify_token       text not null default 'my_verify_token',
  gemini_api_key     text not null default '',
  page_id            text not null default '',
  updated_at         timestamptz default now(),
  created_at         timestamptz default now()
);

alter table public.bot_settings enable row level security;

create policy "Users can read own bot_settings"
  on public.bot_settings for select
  using (auth.uid() = user_id);

create policy "Users can update own bot_settings"
  on public.bot_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert own bot_settings"
  on public.bot_settings for insert
  with check (auth.uid() = user_id);


-- =====================================================================
-- STEP 3: Add user_id to logs
-- =====================================================================
alter table public.logs
  add column if not exists user_id uuid references auth.users(id);

alter table public.logs enable row level security;

create policy "Users can read own logs"
  on public.logs for select
  using (auth.uid() = user_id);


-- =====================================================================
-- STEP 4: Add user_id to handoffs
-- =====================================================================
alter table public.handoffs
  add column if not exists user_id uuid references auth.users(id);

alter table public.handoffs enable row level security;

create policy "Users can read own handoffs"
  on public.handoffs for select
  using (auth.uid() = user_id);


-- =====================================================================
-- STEP 5: Add user_id to faqs
-- =====================================================================
alter table public.faqs
  add column if not exists user_id uuid references auth.users(id);

alter table public.faqs enable row level security;

create policy "Users can manage own faqs"
  on public.faqs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =====================================================================
-- STEP 6: Add user_id to documents (RAG knowledge base)
-- =====================================================================
alter table public.documents
  add column if not exists user_id uuid references auth.users(id);

alter table public.documents enable row level security;

create policy "Users can manage own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =====================================================================
-- STEP 7: Update match_documents RPC to filter by user_id
-- =====================================================================
create or replace function match_documents (
  query_embedding  vector(2048),
  match_threshold  float,
  match_count      int,
  p_user_id        uuid
)
returns table (
  id         bigint,
  content    text,
  metadata   jsonb,
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
  where
    documents.user_id = p_user_id
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;


-- =====================================================================
-- STEP 8: Auto-create profile + bot_settings on new user signup
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create profile row
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- Create empty bot_settings row so user can configure immediately
  insert into public.bot_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Drop old trigger if exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =====================================================================
-- STEP 9: DATA MIGRATION — assign existing data to Matthew
-- =====================================================================
-- 1. Find Matthew's UUID:
--    SELECT id, email FROM auth.users;
--
-- 2. Copy the UUID, replace 'MATTHEW_UUID_HERE', then run:
--
-- UPDATE public.logs     SET user_id = 'MATTHEW_UUID_HERE' WHERE user_id IS NULL;
-- UPDATE public.handoffs SET user_id = 'MATTHEW_UUID_HERE' WHERE user_id IS NULL;
-- UPDATE public.faqs     SET user_id = 'MATTHEW_UUID_HERE' WHERE user_id IS NULL;
-- UPDATE public.documents SET user_id = 'MATTHEW_UUID_HERE' WHERE user_id IS NULL;
--
-- 3. Also make sure Matthew has a bot_settings row:
-- INSERT INTO public.bot_settings (user_id, page_access_token, verify_token, page_id)
-- VALUES ('MATTHEW_UUID_HERE', 'YOUR_EXISTING_PAGE_TOKEN', 'tuyensinh2026', 'YOUR_PAGE_ID')
-- ON CONFLICT (user_id) DO NOTHING;
