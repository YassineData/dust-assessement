export const HUBSPOT_GUIDE_HIDDEN_KEY = 'hubspot_export_guide_hidden';

/** Whether this browser asked not to see the HubSpot export explanation again. */
export const hubspotGuideHidden = () => {
  try {
    return localStorage.getItem(HUBSPOT_GUIDE_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
};
