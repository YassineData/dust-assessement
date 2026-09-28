// Helpers for the virtual "Global" campaign that aggregates all real campaigns
// of a single client (matched by company_name) for admin viewers.

export const GLOBAL_CAMPAIGN_PREFIX = 'global:';

export const buildGlobalCampaignId = (companyName: string): string =>
  `${GLOBAL_CAMPAIGN_PREFIX}${companyName.trim().toLowerCase()}`;

export const isGlobalCampaignId = (id: string | null | undefined): boolean =>
  typeof id === 'string' && id.startsWith(GLOBAL_CAMPAIGN_PREFIX);

export const GLOBAL_CAMPAIGN_CODE = 'GLOBAL';
