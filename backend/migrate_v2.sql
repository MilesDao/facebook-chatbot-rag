-- Migration: Add missing columns to conversation_context
-- Run this in the Supabase Dashboard SQL Editor to fix PGRST204 & 23502 (Session ID) errors

-- 1. Fix missing columns
ALTER TABLE conversation_context ADD COLUMN IF NOT EXISTS extracted_slots jsonb DEFAULT '{}';
ALTER TABLE conversation_context ADD COLUMN IF NOT EXISTS current_flow_id uuid REFERENCES conversation_flows(id) ON DELETE SET NULL;
ALTER TABLE conversation_context ADD COLUMN IF NOT EXISTS current_node_id uuid REFERENCES flow_nodes(id) ON DELETE SET NULL;

-- 2. Fix session_id NOT NULL constraint (if it exists)
-- This allows the current logic to work until a full session system is implemented
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversation_context' AND column_name='session_id') THEN
    ALTER TABLE conversation_context ALTER COLUMN session_id DROP NOT NULL;
  END IF;
END $$;

-- Force reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

-- Verification
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_context';
