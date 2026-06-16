/**
 * UTM Parameter Capture
 *
 * Captures UTM params from the URL on landing and persists them in
 * sessionStorage so they survive multi-step form navigation.
 * On registration, these are read and sent to the server.
 */

export interface UTMParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  utmLandingPage?: string;
}

const STORAGE_KEY = "sd_utm";

/** Call this on app mount — reads URL params and saves to sessionStorage */
export function captureUTMParams(): void {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source");
  const medium = params.get("utm_medium");
  const campaign = params.get("utm_campaign");
  const content = params.get("utm_content");
  const term = params.get("utm_term");

  // Only save if at least utm_source is present (i.e. came from an ad)
  if (!source) return;

  const utm: UTMParams = {
    utmSource: source ?? undefined,
    utmMedium: medium ?? undefined,
    utmCampaign: campaign ?? undefined,
    utmContent: content ?? undefined,
    utmTerm: term ?? undefined,
    utmLandingPage: window.location.href,
  };

  // Use sessionStorage so it clears when the tab closes but survives page nav
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch {
    // sessionStorage unavailable — silently ignore
  }
}

/** Read stored UTM params (returns empty object if none) */
export function getStoredUTMParams(): UTMParams {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UTMParams;
  } catch {
    return {};
  }
}

/** Clear UTM params after successful registration */
export function clearUTMParams(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
