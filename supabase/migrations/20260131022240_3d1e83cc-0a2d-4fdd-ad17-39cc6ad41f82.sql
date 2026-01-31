-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_embeddings table to store chunks with embeddings
CREATE TABLE public.document_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast vector similarity search
CREATE INDEX document_embeddings_embedding_idx 
ON public.document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for user filtering
CREATE INDEX document_embeddings_user_id_idx ON public.document_embeddings(user_id);
CREATE INDEX document_embeddings_document_id_idx ON public.document_embeddings(document_id);

-- Enable RLS
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own embeddings"
ON public.document_embeddings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embeddings"
ON public.document_embeddings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings"
ON public.document_embeddings FOR DELETE
USING (auth.uid() = user_id);

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION public.search_document_embeddings(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_match_count INTEGER DEFAULT 5,
  p_match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  similarity FLOAT,
  document_title TEXT,
  department TEXT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.document_id,
    de.chunk_text,
    1 - (de.embedding <=> p_query_embedding) as similarity,
    d.title as document_title,
    d.department
  FROM public.document_embeddings de
  JOIN public.documents d ON d.id = de.document_id
  WHERE de.user_id = p_user_id
    AND d.ai_enabled = true
    AND d.processing_status = 'completed'
    AND 1 - (de.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY de.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;