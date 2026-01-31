-- Drop and recreate the search function with improved query handling
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
LANGUAGE sql
STABLE
AS $$
  WITH q AS (
    -- Use plainto_tsquery which is more forgiving than websearch_to_tsquery
    -- It treats words as OR conditions and ignores stop words like "tell", "me", "about"
    SELECT plainto_tsquery('english', p_query) AS tsq
  ),
  d AS (
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
    ts_rank_cd(d.tsv, q.tsq) AS rank,
    ts_headline(
      'english',
      coalesce(d.content_text, '') || ' ' || coalesce(d.questions_answered, '') || ' ' || coalesce(d.notes, ''),
      q.tsq,
      'StartSel=<b>, StopSel=</b>, MaxWords=60, MinWords=15, ShortWord=3, HighlightAll=false, MaxFragments=2, FragmentDelimiter= … '
    ) AS excerpt
  FROM d, q
  WHERE d.tsv @@ q.tsq
  ORDER BY rank DESC
  LIMIT greatest(p_limit, 1);
$$;