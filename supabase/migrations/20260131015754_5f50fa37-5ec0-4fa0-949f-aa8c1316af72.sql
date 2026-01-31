-- Recreate search function with query preprocessing to remove question words
CREATE OR REPLACE FUNCTION public.search_user_documents(
  p_user_id uuid, 
  p_query text, 
  p_limit integer DEFAULT 8
)
RETURNS TABLE(
  id uuid, 
  title text, 
  department text, 
  knowledge_type text, 
  rank real, 
  excerpt text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cleaned_query text;
  tsq tsquery;
BEGIN
  -- Remove common question words that don't help with search
  cleaned_query := regexp_replace(
    lower(p_query),
    '\y(tell|me|about|what|is|are|how|do|does|can|could|would|should|please|help|explain|describe|show|find|give|want|need|looking|for|the|a|an|my|your|our|their|this|that|these|those|i|you|we|they|it)\y',
    '',
    'gi'
  );
  -- Clean up extra spaces
  cleaned_query := regexp_replace(trim(cleaned_query), '\s+', ' ', 'g');
  
  -- If the cleaned query is empty or too short, use original without common fillers
  IF length(cleaned_query) < 3 THEN
    cleaned_query := regexp_replace(lower(p_query), '\y(tell|me|about|please|help)\y', '', 'gi');
    cleaned_query := regexp_replace(trim(cleaned_query), '\s+', ' ', 'g');
  END IF;
  
  -- Generate tsquery
  tsq := plainto_tsquery('english', cleaned_query);
  
  RETURN QUERY
  WITH d AS (
    SELECT
      doc.id,
      doc.title,
      doc.department,
      doc.knowledge_type::text,
      doc.content_text,
      doc.questions_answered,
      doc.notes,
      to_tsvector(
        'english',
        coalesce(doc.title, '') || ' ' ||
        coalesce(doc.content_text, '') || ' ' ||
        coalesce(doc.questions_answered, '') || ' ' ||
        coalesce(doc.notes, '')
      ) AS tsv
    FROM public.documents doc
    WHERE doc.user_id = p_user_id
      AND doc.ai_enabled = true
      AND doc.processing_status = 'completed'
      AND doc.content_text IS NOT NULL
  )
  SELECT
    d.id,
    d.title,
    d.department,
    d.knowledge_type,
    ts_rank_cd(d.tsv, tsq) AS rank,
    ts_headline(
      'english',
      coalesce(d.content_text, '') || ' ' || coalesce(d.questions_answered, '') || ' ' || coalesce(d.notes, ''),
      tsq,
      'StartSel=<b>, StopSel=</b>, MaxWords=60, MinWords=15, ShortWord=3, HighlightAll=false, MaxFragments=2, FragmentDelimiter= … '
    ) AS excerpt
  FROM d
  WHERE d.tsv @@ tsq
  ORDER BY rank DESC
  LIMIT greatest(p_limit, 1);
END;
$$;