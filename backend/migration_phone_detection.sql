-- ============================================================
-- Migration: Add Vietnamese Phone Number Support
-- ============================================================
-- Adds phone number detection and storage to conversation_context table
-- This enables the Active Customers dashboard to display customer phone numbers

-- Add phone number column to conversation_context
ALTER TABLE conversation_context ADD COLUMN IF NOT EXISTS detected_phone text;
ALTER TABLE conversation_context ADD COLUMN IF NOT EXISTS phone_confidence float DEFAULT 0.0;
ALTER TABLE conversation_context ADD COLUMN IF NOT EXISTS phone_triggered_by_keyword boolean DEFAULT false;

-- Create index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_conversation_context_phone 
ON conversation_context(workspace_id, detected_phone) 
WHERE detected_phone IS NOT NULL;

-- Create index for sender lookups with phone
CREATE INDEX IF NOT EXISTS idx_conversation_context_sender_phone 
ON conversation_context(workspace_id, sender_id, detected_phone);

-- Add comment for documentation
COMMENT ON COLUMN conversation_context.detected_phone IS 'Vietnamese phone number detected in user messages. Format: +84XXXXXXXXX (international)';
COMMENT ON COLUMN conversation_context.phone_confidence IS 'Confidence score for phone detection (0.0-1.0). Higher confidence if triggered by keyword.';
COMMENT ON COLUMN conversation_context.phone_triggered_by_keyword IS 'True if phone detection was triggered by explicit keyword request';
