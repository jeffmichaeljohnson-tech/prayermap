/**
 * CORS headers for Supabase Edge Functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(
  data: unknown,
  status = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...additionalHeaders,
    },
  });
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(
  message: string,
  status = 500,
  details?: unknown
): Response {
  return jsonResponse(
    { error: message, details },
    status
  );
}

