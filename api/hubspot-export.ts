/**
 * Sends a file straight to a Dust conversation (V1), so nobody pastes or drops anything:
 *  - kind "hubspot": the HubSpot export to @hubspot-assessment, which then shows its preview and waits for a confirmation;
 *  - kind "analysis": the « dossier diagnostic » to @dust with the analysis instruction, which builds the results Frame.
 *
 * Only the Dust team: the caller's Supabase session must belong to an @dust.tt address.
 * Needs DUST_API_KEY (Vercel, sensitive) and, if the key belongs to another workspace, DUST_API_WORKSPACE_ID. Without it the function answers 501 and the console falls back to the
 * manual flow (file + copied message). Dust API: POST /api/v1/w/{wId}/assistant/conversations.
 */
declare const process: { env: Record<string, string | undefined> };

export const config = { runtime: 'edge' };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const apiKey = process.env.DUST_API_KEY;
  // Workspace of the API key (can differ from the one the manual button opens).
  const workspaceId = process.env.DUST_API_WORKSPACE_ID || process.env.VITE_DUST_WORKSPACE_ID;
  const agentId = process.env.VITE_DUST_HUBSPOT_AGENT_ID;
  const dustBase = process.env.DUST_API_BASE || 'https://dust.tt';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey || !workspaceId || !agentId || !supabaseUrl || !supabaseKey) return json(501, { error: 'not_configured' });

  // Who is asking: the same check as the database rules (is_dust_member on the caller's token), so whoever
  // sees the console as Dust can send. The email comes from the token itself.
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'no_session' });
  const check = await fetch(`${supabaseUrl}/rest/v1/rpc/is_dust_member`, {
    method: 'POST',
    headers: { apikey: supabaseKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  });
  if (!check.ok) return json(401, { error: 'bad_session', supabase_status: check.status });
  if ((await check.json()) !== true) return json(403, { error: 'dust_team_only' });
  let email = '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    email = String(payload.email || '').toLowerCase();
  } catch {
    return json(401, { error: 'bad_token' });
  }

  let body: { kind?: 'hubspot' | 'analysis'; fileName?: string; message?: string; exportJson?: string; title?: string; csv?: { fileName?: string; content?: string } };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_body' });
  }
  const { fileName, message, exportJson, title } = body;
  const kind = body.kind === 'analysis' ? 'analysis' : 'hubspot';
  if (!fileName || !message || !exportJson) return json(400, { error: 'missing_fields' });
  try {
    const parsed = JSON.parse(exportJson) as { schema_version?: number; schema?: string };
    // HubSpot export (schema_version 1) or « dossier diagnostic » (dust-diagnostic-pack/1) for the analysis.
    if (kind === 'hubspot' && parsed.schema_version !== 1) return json(400, { error: 'bad_schema_version' });
    if (kind === 'analysis' && parsed.schema !== 'dust-diagnostic-pack/1') return json(400, { error: 'bad_pack' });
  } catch {
    return json(400, { error: 'bad_export' });
  }
  // Analysis goes to the global @dust agent (or VITE_DUST_ANALYSIS_AGENT_ID): it builds the results Frame.
  const targetAgent = kind === 'analysis' ? process.env.VITE_DUST_ANALYSIS_AGENT_ID || 'dust' : agentId;

  const res = await fetch(`${dustBase}/api/v1/w/${encodeURIComponent(workspaceId)}/assistant/conversations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      title: title || fileName,
      blocking: false,
      message: {
        content: message,
        mentions: [{ configurationId: targetAgent }],
        context: { username: email.split('@')[0], email, timezone: 'Europe/Paris' },
      },
      contentFragments: [
        { title: fileName, contentType: 'application/json', content: exportJson },
        // Analysis: the raw answers too (one row per respondent, no email), when the console sends them.
        ...(kind === 'analysis' && body.csv?.fileName && body.csv?.content ? [{ title: body.csv.fileName, contentType: 'text/csv', content: body.csv.content }] : []),
      ],
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
