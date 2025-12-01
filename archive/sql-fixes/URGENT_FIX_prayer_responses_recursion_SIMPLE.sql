-- SIMPLE FIX: Just create the missing get_all_prayers function
-- The function doesn't exist at all, so we need to create it from scratch

CREATE OR REPLACE FUNCTION get_all_prayers(limit_count INTEGER DEFAULT 1000)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  media_url TEXT,
  location TEXT,
  user_name TEXT,
  is_anonymous BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.user_id,
    p.title,
    p.content,
    p.content_type::TEXT,
    p.media_url,
    ST_AsText(p.location::geometry) as location,
    CASE
      WHEN p.is_anonymous THEN NULL
      ELSE p.user_name
    END as user_name,
    p.is_anonymous,
    p.created_at,
    p.updated_at,
    p.status
  FROM prayers p
  WHERE
    (p.status IS NULL OR p.status NOT IN ('hidden', 'removed'))
    OR p.user_id = auth.uid()
  ORDER BY p.created_at DESC
  LIMIT limit_count;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_prayers(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers(INTEGER) TO anon;

-- Test it works
SELECT 'Function created successfully!' as status;
SELECT COUNT(*) as prayer_count FROM get_all_prayers(5);
