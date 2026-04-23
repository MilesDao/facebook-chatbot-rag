-- ============================================================
-- Migration: Add Image-to-PDF Feature & Message Debouncing
-- ============================================================

-- 1. Create chat_message_buffer if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_message_buffer (
    sender_id TEXT PRIMARY KEY,
    accumulated_text TEXT DEFAULT '',
    accumulated_images JSONB DEFAULT '[]'::jsonb,
    page_id TEXT,
    last_received_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- Ensure accumulated_images column exists (in case table already existed from previous steps)
ALTER TABLE chat_message_buffer 
ADD COLUMN IF NOT EXISTS accumulated_images jsonb DEFAULT '[]'::jsonb;

-- 2. Create user_generated_pdfs table
CREATE TABLE IF NOT EXISTS user_generated_pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on user_generated_pdfs
ALTER TABLE user_generated_pdfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view PDFs" ON user_generated_pdfs;
CREATE POLICY "Workspace members can view PDFs" ON user_generated_pdfs 
FOR SELECT USING (is_workspace_member(workspace_id));

-- 4. Create the storage bucket (if not exists)
-- Note: Supabase provides an API to insert into storage.buckets. 
-- We'll try to insert safely.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user_documents', 'user_documents', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Set Storage RLS Policies (Public read, authenticated insert)
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'user_documents');

CREATE POLICY "Authenticated Insert Access" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'user_documents');
