import { norm, type Table } from '@/lib/import-responses';

/**
 * Actual Dust usage of a client, read from a workspace usage export (CSV or .xlsx) and stored on one campaign
 * (campaigns.usage), so the « Suivi » tab shows what the rollout produced next to what the survey measured.
 * Two shapes are accepted:
 *  - one row per agent (name, messages, users reached);
 *  - one row per message (agent name, user, date): counted here.
 * Only totals and agent names are kept, never message contents or people.
 * Health follows the Data team's deployment success metrics: breadth (people who used Dust ÷ people in scope)
 * and recurrence (came back 3 of the last 4 weeks); 70% is the provisional threshold.
 */

export interface AgentUsage {
  name: string;
  messages: number;
  users?: number;
}

export interface Usage {
  importedAt: string;
  fileName: string;
  period?: { from: string; to: string };
  agents: AgentUsage[];
  totalMessages: number;
  /** Distinct people who talked to an agent; only known from a per-message export. */
  activeUsers?: number;
  /** Active users who came back in at least 3 of the last 4 weeks of the export. */
  recurringUsers?: number;
  /** Weeks covered by the export (recurrence needs at least 3). */
  weeks?: number;
  /** Conversations with 2 people or more, out of all conversations (Multiplayer pillar). */
  sharedConversations?: number;
  conversations?: number;
  /** People in scope of the rollout (set by hand), for breadth. */
  scope?: number;
}

export const HEALTH_THRESHOLD = 0.7;
export type Health = 'healthy' | 'watch' | 'risk' | 'ramping';

export const breadthOf = (u: Usage) => (u.activeUsers && u.scope ? Math.min(1, u.activeUsers / u.scope) : null);
export const recurrenceOf = (u: Usage) => (u.activeUsers && u.recurringUsers !== undefined && (u.weeks ?? 0) >= 3 ? u.recurringUsers / u.activeUsers : null);

/** Healthy: both above 70%. Watch: one at or below. At risk: both at or below. Ramping: under 3 weeks of data. */
export const healthOf = (u: Usage): Health | null => {
  const b = breadthOf(u);
  if ((u.weeks ?? 0) < 3) return 'ramping';
  const r = recurrenceOf(u);
  if (b === null || r === null) return null;
  const ok = [b, r].filter((x) => x > HEALTH_THRESHOLD).length;
  return ok === 2 ? 'healthy' : ok === 1 ? 'watch' : 'risk';
};

const key = (h: string) => norm(h).replace(/ /g, '');
const findCol = (headers: string[], names: string[]) => {
  const keys = headers.map(key);
  for (const n of names) {
    const i = keys.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
};

const AGENT = ['assistantname', 'agentname', 'agent', 'assistant', 'name', 'nom', 'nomdelagent'];
const MESSAGES = ['messages', 'messagecount', 'nbmessages', 'totalmessages', 'agentmessages', 'messagesnumber'];
const USERS = ['distinctusersreached', 'usersreached', 'distinctusers', 'activeusers', 'users', 'utilisateurs'];
const PERSON = ['useremail', 'email', 'userid', 'usermodelid', 'userfullname', 'user', 'utilisateur'];
const DATE = ['createdat', 'date', 'timestamp', 'sentat', 'day'];
const CONVERSATION = ['conversationid', 'conversationmodelid', 'conversationsid', 'conversation'];

const toNumber = (v: string) => {
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const isoDay = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

/** Null when the file has no agent column: it is not a usage export. */
export const parseUsage = (table: Table, fileName: string): Usage | null => {
  const { headers, rows } = table;
  const agentCol = findCol(headers, AGENT);
  if (agentCol < 0) return null;
  const msgCol = findCol(headers, MESSAGES);
  const usersCol = findCol(headers, USERS);
  const personCol = findCol(headers, PERSON);
  const dateCol = findCol(headers, DATE);
  const convCol = findCol(headers, CONVERSATION);
  const userDays = new Map<string, number[]>();
  const convPeople = new Map<string, Set<string>>();

  const byAgent = new Map<string, { messages: number; users: number; people: Set<string> }>();
  const people = new Set<string>();
  const days: string[] = [];

  rows.forEach((r) => {
    const name = (r[agentCol] || '').trim();
    if (!name) return;
    const a = byAgent.get(name) ?? { messages: 0, users: 0, people: new Set<string>() };
    // Per-agent export: the row carries the count. Per-message export: each row is one message.
    a.messages += msgCol >= 0 ? toNumber(r[msgCol]) : 1;
    if (usersCol >= 0) a.users = Math.max(a.users, toNumber(r[usersCol]));
    const who = personCol >= 0 ? (r[personCol] || '').trim().toLowerCase() : '';
    if (who) {
      a.people.add(who);
      people.add(who);
    }
    if (dateCol >= 0) {
      const d = isoDay(r[dateCol]);
      if (d) {
        days.push(d);
        if (who) (userDays.get(who) ?? userDays.set(who, []).get(who)!).push(new Date(d).getTime());
      }
    }
    const conv = convCol >= 0 ? (r[convCol] || '').trim() : '';
    if (conv && who) (convPeople.get(conv) ?? convPeople.set(conv, new Set()).get(conv)!).add(who);
    byAgent.set(name, a);
  });
  if (!byAgent.size) return null;

  const agents = [...byAgent.entries()]
    .map(([name, a]) => ({ name: name.slice(0, 120), messages: Math.round(a.messages), users: a.people.size || a.users || undefined }))
    .sort((x, y) => y.messages - x.messages)
    .slice(0, 50);
  days.sort();

  // Recurrence: active in at least 3 of the 4 weeks before the last day of the export.
  const DAY = 24 * 3600 * 1000;
  const end = days.length ? new Date(days[days.length - 1]).getTime() : 0;
  const weeks = days.length ? Math.floor((end - new Date(days[0]).getTime()) / DAY / 7) + 1 : undefined;
  let recurringUsers: number | undefined;
  if (userDays.size && weeks) {
    recurringUsers = [...userDays.values()].filter((ts) => {
      const active = new Set(ts.filter((t) => t > end - 28 * DAY).map((t) => Math.min(3, Math.floor((end - t) / DAY / 7))));
      return active.size >= 3;
    }).length;
  }

  return {
    importedAt: new Date().toISOString(),
    fileName: fileName.slice(0, 120),
    period: days.length ? { from: days[0], to: days[days.length - 1] } : undefined,
    agents,
    totalMessages: [...byAgent.values()].reduce((n, a) => n + Math.round(a.messages), 0),
    activeUsers: people.size || undefined,
    recurringUsers,
    weeks,
    sharedConversations: convPeople.size ? [...convPeople.values()].filter((p) => p.size >= 2).length : undefined,
    conversations: convPeople.size || undefined,
  };
};

/** Reads campaigns.usage defensively. */
export const toUsage = (v: unknown): Usage | null => {
  if (!v || typeof v !== 'object') return null;
  const u = v as Partial<Usage>;
  if (!Array.isArray(u.agents)) return null;
  const agents = u.agents
    .filter((a) => a && typeof a.name === 'string')
    .map((a) => ({ name: a.name, messages: Number(a.messages) || 0, users: a.users ? Number(a.users) : undefined }));
  return {
    importedAt: String(u.importedAt ?? ''),
    fileName: String(u.fileName ?? ''),
    period: u.period && u.period.from && u.period.to ? { from: String(u.period.from), to: String(u.period.to) } : undefined,
    agents,
    totalMessages: Number(u.totalMessages) || agents.reduce((n, a) => n + a.messages, 0),
    activeUsers: u.activeUsers ? Number(u.activeUsers) : undefined,
    recurringUsers: u.recurringUsers !== undefined ? Number(u.recurringUsers) : undefined,
    weeks: u.weeks ? Number(u.weeks) : undefined,
    sharedConversations: u.sharedConversations !== undefined ? Number(u.sharedConversations) : undefined,
    conversations: u.conversations ? Number(u.conversations) : undefined,
    scope: u.scope ? Number(u.scope) : undefined,
  };
};
