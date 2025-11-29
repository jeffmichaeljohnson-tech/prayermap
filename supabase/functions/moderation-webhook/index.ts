// moderation-webhook/index.ts
import { createHmac } from "node:crypto";
const HIVE_SECRET = Deno.env.get("HIVE_SECRET"); // Set via supabase secrets
if (!HIVE_SECRET) {
  console.error("HIVE_SECRET is not set");
}
async function verifySignature(req) {
  const headers = req.headers;
  const signature = headers.get("x-thehive-signature");
  const accessKey = headers.get("x-thehive-access-key");
  if (!signature || !accessKey) return false;
  // Read raw body as Uint8Array then to string
  const bodyArray = new Uint8Array(await req.arrayBuffer());
  const bodyString = new TextDecoder().decode(bodyArray);
  // Compute HMAC-SHA256 with secret
  const hmac = createHmac("sha256", HIVE_SECRET || "");
  hmac.update(bodyString);
  const expected = hmac.digest("hex");
  // The incoming signature may include prefix like "sha256=" - support both
  const incoming = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  // Constant-time compare
  return timingSafeEqual(expected, incoming);
}
function timingSafeEqual(a, b) {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch  {
    return false;
  }
}
async function insertModerationResult(payload, accessKey, hiveTaskId) {
  // Use Supabase REST endpoint (service role) — prefer DB direct write using SUPABASE_SERVICE_ROLE_KEY via fetch
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
    return;
  }
  const row = {
    hive_task_id: hiveTaskId,
    access_key: accessKey,
    raw_payload: payload,
    decision: payload?.decision ?? null
  };
  const res = await fetch(`${supabaseUrl}/rest/v1/moderation_results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "Prefer": "return=representation"
    },
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Failed to insert moderation result:", res.status, text);
  }
  return res;
}
Deno.serve(async (req)=>{
  // Only POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Only POST allowed"
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  // Verify signature
  const isValid = await verifySignature(req.clone());
  if (!isValid) {
    return new Response(JSON.stringify({
      error: "Invalid signature"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  // Parse JSON body
  let payload;
  try {
    payload = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Invalid JSON payload"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  // Extract hive task id if present
  const hiveTaskId = payload?.task_id ?? payload?.id ?? null;
  const accessKey = req.headers.get("x-thehive-access-key");
  // Insert into DB in background
  const insertPromise = insertModerationResult(payload, accessKey, hiveTaskId);
  // Run in background
  // @ts-ignore - EdgeRuntime.waitUntil available in Supabase Edge environment
  globalThis.EdgeRuntime?.waitUntil?.(insertPromise) ?? insertPromise;
  return new Response(JSON.stringify({
    status: "ok"
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
});
