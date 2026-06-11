/**
 * Ambient globals for the analytics tags loaded in the root layout.
 *
 * - `dataLayer`: GTM queue (the GTM bootstrap in google-tag-manager.tsx seeds it).
 * - `klaviyo` / `_klOnsite`: the Klaviyo onsite SDK queue (klaviyo.tsx). `klaviyo`
 *   is a Proxy that exposes `.push([...])` before and after the SDK finishes loading.
 *
 * Centralized so the analytics dispatcher (src/lib/analytics/track.ts) is typed
 * rather than reaching into `window` with `any`.
 */
export {};

declare global {
	interface Window {
		dataLayer: Record<string, unknown>[];
		klaviyo?: { push: (args: unknown[]) => void };
		_klOnsite?: unknown[];
	}
}
