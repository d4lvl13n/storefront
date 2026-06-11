/**
 * GA4 is configured INSIDE the GTM container (see getGoogleTagManagerId), not via
 * a standalone gtag.js loader — that's deliberate, to avoid double-counting. There
 * is intentionally no GA-measurement-ID getter here: do not re-add a separate
 * gtag.js loader, or events will be counted twice.
 *
 * Google Tag Manager — container ID.
 *
 * - Set `NEXT_PUBLIC_GTM_ID` to override (any environment).
 * - In production, defaults to the live container when the env var is unset.
 * - In development, GTM is off unless `NEXT_PUBLIC_GTM_ID` is set (avoids dirty dev data).
 */
const DEFAULT_PRODUCTION_GTM_ID = "GTM-55X7GSQP";

export function getGoogleTagManagerId(): string | undefined {
	const fromEnv = process.env.NEXT_PUBLIC_GTM_ID?.trim();
	if (fromEnv) {
		return fromEnv;
	}
	if (process.env.NODE_ENV === "production") {
		return DEFAULT_PRODUCTION_GTM_ID;
	}
	return undefined;
}

/**
 * Klaviyo — public company (site) ID.
 *
 * Public identifier (it appears in the onsite script URL), safe to ship to the
 * browser. Drives both the onsite tracking snippet and the server-side client
 * subscription API. Override per environment via NEXT_PUBLIC_KLAVIYO_COMPANY_ID.
 */
const DEFAULT_KLAVIYO_COMPANY_ID = "VQxsBE";

export function getKlaviyoCompanyId(): string | undefined {
	return process.env.NEXT_PUBLIC_KLAVIYO_COMPANY_ID?.trim() || DEFAULT_KLAVIYO_COMPANY_ID;
}

/**
 * Klaviyo list that newsletter / lead-magnet signups subscribe to.
 *
 * Defaults to the "Email List" (double opt-in), so subscribing sends Klaviyo's
 * confirmation email before the profile is marketable. Override via
 * KLAVIYO_NEWSLETTER_LIST_ID (server-only — no NEXT_PUBLIC prefix needed).
 */
const DEFAULT_KLAVIYO_NEWSLETTER_LIST_ID = "TUZ4vR";

export function getKlaviyoNewsletterListId(): string | undefined {
	return process.env.KLAVIYO_NEWSLETTER_LIST_ID?.trim() || DEFAULT_KLAVIYO_NEWSLETTER_LIST_ID;
}

/**
 * Klaviyo — PRIVATE API key (`pk_…`) for server-side event tracking.
 *
 * Server-only (no NEXT_PUBLIC prefix — must never reach the browser). Used by the
 * ORDER_PAID webhook to send the authoritative `Placed Order` event. No default:
 * when unset, server-side order tracking is skipped (fail-soft).
 */
export function getKlaviyoPrivateApiKey(): string | undefined {
	return process.env.KLAVIYO_PRIVATE_API_KEY?.trim() || undefined;
}
