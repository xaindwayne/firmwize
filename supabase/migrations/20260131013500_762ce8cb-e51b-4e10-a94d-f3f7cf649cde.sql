create extension if not exists vector;

create index if not exists documents_user_id_idx
  on public.documents(user_id);

create index if not exists documents_fts_gin_idx
  on public.documents
  using gin (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(content_text, '') || ' ' ||
      coalesce(questions_answered, '') || ' ' ||
      coalesce(notes, '')
    )
  );

create or replace function public.search_user_documents(
  p_user_id uuid,
  p_query text,
  p_limit int default 8
)
returns table (
  id uuid,
  title text,
  department text,
  knowledge_type text,
  rank real,
  excerpt text
)
language sql
stable
as $$
  with q as (
    select websearch_to_tsquery('english', p_query) as tsq
  ),
  d as (
    select
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
      ) as tsv
    from public.documents doc
    where doc.user_id = p_user_id
      and doc.ai_enabled = true
      and doc.processing_status = 'completed'
      and doc.content_text is not null
  )
  select
    d.id,
    d.title,
    d.department,
    d.knowledge_type,
    ts_rank_cd(d.tsv, q.tsq) as rank,
    ts_headline(
      'english',
      coalesce(d.content_text, '') || ' ' || coalesce(d.questions_answered, '') || ' ' || coalesce(d.notes, ''),
      q.tsq,
      'StartSel=<b>, StopSel=</b>, MaxWords=60, MinWords=15, ShortWord=3, HighlightAll=false, MaxFragments=2, FragmentDelimiter= … '
    ) as excerpt
  from d, q
  where d.tsv @@ q.tsq
  order by rank desc
  limit greatest(p_limit, 1);
$$;