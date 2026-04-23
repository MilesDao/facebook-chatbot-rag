-- ============================================================
-- MULTI-TENANT CHATBOT PLATFORM - DATABASE SCHEMA
-- ============================================================
-- Architecture: Workspace-scoped with RLS isolation
-- ============================================================

create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- Ensure schema permissions
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;


-- ============================================================
-- 1. TABLE DEFINITIONS
-- ============================================================

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null default 'general',
  owner_id uuid not null references auth.users(id) on delete cascade,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  invited_at timestamptz default now(),
  unique(workspace_id, user_id)
);

create table if not exists industry_templates (
  id uuid primary key default gen_random_uuid(),
  industry_code text unique not null,
  display_name text not null,
  default_system_prompt text,
  default_slot_definitions jsonb default '[]',
  default_flow_templates jsonb default '[]',
  icon text,
  created_at timestamptz default now()
);

create table if not exists bot_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  page_access_token text,
  google_api_key text,
  page_id text,
  verify_token text,
  llm_model text default 'google/gemini-3.1-flash-lite-preview',
  app_secret text,
  system_prompt text,
  slot_definitions jsonb default '[]',
  updated_at timestamptz default now(),
  unique(workspace_id)
);

create table if not exists documents (
  id bigserial primary key,
  content text not null,
  metadata jsonb,
  embedding vector(768),
  workspace_id uuid references workspaces(id) on delete cascade
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  sender_id text,
  user_message text,
  ai_reply text,
  confidence_score float,
  handoff_triggered boolean,
  workspace_id uuid references workspaces(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists handoffs (
  id uuid primary key default gen_random_uuid(),
  sender_id text,
  user_message text,
  confidence_score float,
  status text default 'active',
  workspace_id uuid references workspaces(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists paused_senders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  sender_id text not null,
  paused_at timestamptz default now(),
  unique(workspace_id, sender_id)
);

create table if not exists chat_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  sender_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists conversation_flows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  trigger_keywords text[],
  is_default boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists flow_nodes (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references conversation_flows(id) on delete cascade,
  node_type text not null,
  label text,
  position_x float default 0,
  position_y float default 0,
  config jsonb not null default '{}',
  created_at timestamptz default now()
);

create table if not exists flow_edges (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references conversation_flows(id) on delete cascade,
  source_node_id uuid not null references flow_nodes(id) on delete cascade,
  target_node_id uuid not null references flow_nodes(id) on delete cascade,
  condition jsonb default '{}',
  label text,
  sort_order int default 0
);

create table if not exists conversation_context (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  sender_id text not null,
  extracted_slots jsonb default '{}',
  current_flow_id uuid references conversation_flows(id) on delete set null,
  current_node_id uuid references flow_nodes(id) on delete set null,
  updated_at timestamptz default now(),
  unique(workspace_id, sender_id)
);


-- ============================================================
-- 2. MANDATORY SCHEMA MIGRATIONS
-- ============================================================

-- Ensure workspace_id and new config columns exist
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS slot_definitions jsonb DEFAULT '[]';
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS llm_model text DEFAULT 'google/gemini-3.1-flash-lite-preview';

-- Remove legacy components (dependencies)
DROP POLICY IF EXISTS "Users can manage their own bot settings" ON bot_settings;
ALTER TABLE bot_settings DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE bot_settings DROP CONSTRAINT IF EXISTS bot_settings_workspace_id_unique;
ALTER TABLE bot_settings ADD CONSTRAINT bot_settings_workspace_id_unique UNIQUE (workspace_id);
-- Migration: Rename old column if it exists and new one doesn't (legacy support)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bot_settings' AND column_name='openrouter_api_key') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bot_settings' AND column_name='google_api_key') THEN
    ALTER TABLE bot_settings RENAME COLUMN openrouter_api_key TO google_api_key;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bot_settings' AND column_name='openrouter_api_key') THEN
    -- If both exist, just drop the old one
    ALTER TABLE bot_settings DROP COLUMN openrouter_api_key;
  END IF;
END $$;

-- Ensure new config columns exist
ALTER TABLE bot_settings ADD COLUMN IF NOT EXISTS google_api_key text;



ALTER TABLE documents DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE logs DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE handoffs DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE paused_senders DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE chat_history DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE conversation_context DROP COLUMN IF EXISTS user_id CASCADE;


-- Ensure sender_id column exists (Just in case legacy tables named it differently)
ALTER TABLE logs ADD COLUMN IF NOT EXISTS sender_id text;
ALTER TABLE handoffs ADD COLUMN IF NOT EXISTS sender_id text;
ALTER TABLE paused_senders ADD COLUMN IF NOT EXISTS sender_id text;
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS sender_id text;
ALTER TABLE conversation_context ADD COLUMN IF NOT EXISTS sender_id text;


-- ============================================================
-- 3. ENABLE RLS
-- ============================================================
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table industry_templates enable row level security;
alter table bot_settings enable row level security;
alter table documents enable row level security;
alter table logs enable row level security;
alter table handoffs enable row level security;
alter table paused_senders enable row level security;
alter table chat_history enable row level security;
alter table conversation_flows enable row level security;
alter table flow_nodes enable row level security;
alter table flow_edges enable row level security;
alter table conversation_context enable row level security;


-- ============================================================
-- 4. HELPER FUNCTIONS
-- ============================================================

create or replace function is_workspace_member(ws_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  ) or exists(
    select 1 from workspaces
    where id = ws_id and owner_id = auth.uid()
  );
$$;


-- ============================================================
-- 5. POLICIES
-- ============================================================

-- Workspaces
drop policy if exists "Owners can manage their workspaces" on workspaces;
create policy "Owners can manage their workspaces" on workspaces for all using (auth.uid() = owner_id);

drop policy if exists "Members can view their workspaces" on workspaces;
create policy "Members can view their workspaces" on workspaces for select using (is_workspace_member(id));

-- Workspace Members
drop policy if exists "Members can view their memberships" on workspace_members;
create policy "Members can view their memberships" on workspace_members for select using (is_workspace_member(workspace_id));

drop policy if exists "Owners and admins can manage members" on workspace_members;
create policy "Owners and admins can manage members" on workspace_members for all
using (
    exists (select 1 from workspace_members wm where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin'))
    or exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid())
);

-- Industry Templates (Public Read)
drop policy if exists "Anyone can read templates" on industry_templates;
create policy "Anyone can read templates" on industry_templates for select using (true);

-- Bot Settings
drop policy if exists "Workspace members can view bot settings" on bot_settings;
create policy "Workspace members can view bot settings" on bot_settings for select using (is_workspace_member(workspace_id));

drop policy if exists "Workspace admins can manage bot settings" on bot_settings;
create policy "Workspace admins can manage bot settings" on bot_settings for all using (is_workspace_member(workspace_id));

-- Documents, Logs, Handoffs, etc.
drop policy if exists "Workspace members can manage documents" on documents;
create policy "Workspace members can manage documents" on documents for all using (is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage logs" on logs;
create policy "Workspace members can manage logs" on logs for all using (is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage handoffs" on handoffs;
create policy "Workspace members can manage handoffs" on handoffs for all using (is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage paused senders" on paused_senders;
create policy "Workspace members can manage paused senders" on paused_senders for all using (is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage chat history" on chat_history;
create policy "Workspace members can manage chat history" on chat_history for all using (is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage flows" on conversation_flows;
create policy "Workspace members can manage flows" on conversation_flows for all using (is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage context" on conversation_context;
create policy "Workspace members can manage context" on conversation_context for all using (is_workspace_member(workspace_id));

-- Internal lookups
drop policy if exists "Allow internal lookup by page_id" on bot_settings;
create policy "Allow internal lookup by page_id" on bot_settings for select using (true);


-- ============================================================
-- 6. RPC & INDEXES
-- ============================================================

-- Drop old function signature
DROP FUNCTION IF EXISTS match_documents(vector, float, int, uuid);
DROP FUNCTION IF EXISTS match_documents(vector, double precision, integer, uuid);

-- Documents Similarity Search
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_workspace_id uuid
)
returns table (
  id bigint, content text, metadata jsonb, similarity float
)
language sql stable
as $$
  select
    documents.id, documents.content, documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where (documents.workspace_id = p_workspace_id)
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- Indexes
create index if not exists documents_embedding_idx on documents using hnsw (embedding vector_cosine_ops);
create index if not exists idx_documents_workspace on documents(workspace_id);
create index if not exists idx_bot_settings_page_id on bot_settings(page_id);
create index if not exists idx_bot_settings_workspace on bot_settings(workspace_id);
create index if not exists idx_paused_senders_workspace on paused_senders(workspace_id, sender_id);
create index if not exists idx_conversation_context_workspace_sender on conversation_context(workspace_id, sender_id);


-- ============================================================
-- 7. SEED DATA
-- ============================================================
insert into industry_templates (industry_code, display_name, icon, default_system_prompt, default_slot_definitions)
values
('admissions', 'Tuyển sinh', 'GraduationCap', 'Bạn là tư vấn viên tuyển sinh thân thiện...', '[{"name":"ho_ten","label":"Họ tên","type":"text","required":true}]'),
('ecommerce', 'Bán hàng', 'ShoppingBag', 'Bạn là nhân viên bán hàng thân thiện...', '[{"name":"ho_ten","label":"Tên khách hàng","type":"text","required":true}]'),
('customer_service', 'CSKH', 'Headphones', 'Bạn là nhân viên CSKH...', '[]'),
('booking', 'Đặt lịch', 'Calendar', 'Bạn là nhân viên hỗ trợ đặt lịch hẹn...', '[]'),
('general', 'Tổng quát', 'Settings', 'Bạn là trợ lý ảo tổng quát...', '[]')

on conflict (industry_code) do nothing;

-- Force reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';