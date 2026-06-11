/**
 * Normalize a user-supplied URL to a safe, renderable http(s) link.
 *
 * Returns a normalized absolute URL only when the value is (or, for a bare
 * domain, resolves to) an `http:`/`https:` URL; otherwise returns `null`. A
 * value carrying its own scheme must be http(s) — anything else (`javascript:`,
 * `data:`, `vbscript:`, …) is rejected — while a scheme-less value is assumed
 * https so operators can paste "example.com".
 *
 * Use it on BOTH sides of a user-controlled URL: at ingestion (reject junk
 * before it is stored) and at the render sink (never emit a non-http(s) href, so
 * a stored hostile value can't execute when someone clicks it).
 */
export function safeHttpUrl(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	// A leading "scheme:" means the caller chose a scheme — it must be http(s).
	// No scheme → assume https rather than letting `new URL` reject a bare domain.
	const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

	try {
		const url = new URL(candidate);
		return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
	} catch {
		return null;
	}
}
