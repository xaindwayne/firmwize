-- Add require_manual_approval setting to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS require_manual_approval BOOLEAN DEFAULT false;

-- Add processing status columns to documents for better tracking
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;

-- Create index for faster approved document lookups
CREATE INDEX IF NOT EXISTS idx_documents_approved_ai 
ON public.documents(user_id, document_status, ai_enabled) 
WHERE document_status = 'approved' AND ai_enabled = true;

-- Create index for processing status
CREATE INDEX IF NOT EXISTS idx_documents_processing 
ON public.documents(user_id, processing_status);

COMMENT ON COLUMN public.company_settings.require_manual_approval IS 'When true, uploaded documents require manual approval before AI can use them';
COMMENT ON COLUMN public.documents.processing_status IS 'Document processing status: pending, processing, completed, failed';
COMMENT ON COLUMN public.documents.chunk_count IS 'Number of text chunks extracted for semantic search';