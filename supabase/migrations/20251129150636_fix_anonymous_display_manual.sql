-- Fix anonymous display logic in get_all_prayers function
-- The function was returning user_name directly instead of checking is_anonymous flag

-- Drop the existing function
DROP FUNCTION IF EXISTS get_all_prayers();

-- Create updated function with proper anonymous handling
CREATE OR REPLACE FUNCTION get_all_prayers()
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
    -- Fixed: Return NULL for user_name when anonymous
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
  ORDER BY p.created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_prayers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prayers() TO anon;