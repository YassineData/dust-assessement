/** Public email providers: never a company domain (a partner domain, or a client's HubSpot domain). */
export const PUBLIC_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.fr', 'live.com', 'live.fr', 'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'orange.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'wanadoo.fr', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.fr', 'aol.com']);

export const publicDomainsIn = (domains: string[]) => domains.filter((d) => PUBLIC_DOMAINS.has(d));
