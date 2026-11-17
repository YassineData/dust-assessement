/**
 * « Exporter vers HubSpot » sent straight to Dust (V1): the console posts the export it already built, this function
 * opens a Dust conversation with @hubspot-assessment, the message and the file attached, and returns its id.
 * The person then confirms the agent's preview in that conversation (nothing is written to HubSpot before).
 *
 * Only the Dust team: the caller's Supabase session must belong to an @dust.tt address.
 * Needs DUST_API_KEY (Vercel, sensitive). Without it the function answers 501 and the console falls back to the
 * manual flow (file + copied message). Dust API: POST /api/v1/w/{wId}/assistant/conversations.
 */
declare const process: { env: Record<string, string | undefined> };

export const config = { runtime: 'edge' };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const apiKey = process.env.DUST_API_KEY;
  const workspaceId = process.env.VITE_DUST_WORKSPACE_ID;
  const agentId = process.env.VITE_DUST_HUBSPOT_AGENT_ID;
  const dustBase = process.env.DUST_API_BASE || 'https://dust.tt';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey || !workspaceId || !agentId || !supabaseUrl || !supabaseKey) return json(501, { error: 'not_configured' });

  // Who is asking: the Supabase session sent by the console, checked against Supabase itself.
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'no_session' });
  const who = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseKey, authorization: `Bearer ${token}` } });
  if (!who.ok) return json(401, { error: 'bad_session' });
  const email = String(((await who.json()) as { email?: string }).email || '').toLowerCase();
  if (!email.endsWith('@dust.tt')) return json(403, { error: 'dust_team_only' });

  let body: { fileName?: string; message?: string; exportJson?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_body' });
  }
  const { fileName, message, exportJson, title } = body;
  if (!fileName || !message || !exportJson) return json(400, { error: 'missing_fields' });
  try {
    const parsed = JSON.parse(exportJson) as { schema_version?: number };
    if (parsed.schema_version !== 1) return json(400, { error: 'bad_schema_version' });
  } catch {
    return json(400, { error: 'bad_export' });
  }

  const res = await fetch(`${dustBase}/api/v1/w/${encodeURIComponent(workspaceId)}/assistant/conversations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      title: title || fileName,
      blocking: false,
      message: {
        content: message,
        mentions: [{ configurationId: agentId }],
        context: { username: email.split('@')[0], email, timezone: 'Europe/Paris' },
      },
      contentFragments: [{ title: fileName, contentType: 'application/json', content: exportJson }],
      // The conversation is created by the API key: share it with the person who clicked, so they can confirm.
      sharedWith: [{ email }],
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    return json(502, { error: 'dust_error', status: res.status, detail });
  }
  const created = (await res.json()) as { conversation?: { sId?: string } };
  const sId = created.conversation?.sId;
  if (!sId) return json(502, { error: 'no_conversation' });
  return json(200, { conversationId: sId, url: `https://app.dust.tt/w/${encodeURIComponent(workspaceId)}/conversation/${encodeURIComponent(sId)}` });
}
