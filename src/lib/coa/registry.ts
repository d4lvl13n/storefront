/**
 * Server-side helper to fetch a COA record from the backend registry.
 *
 * The registry is an append-only collection of static JSON files served by
 * the Hetzner backend at `${COA_REGISTRY_BASE_URL}/<token>.json`. This module
 * is shared between:
 *   - `src/app/api/coa/[token]/route.ts` (rate-limited public endpoint)
 *   - `src/app/[channel]/(main)/coa/[token]/page.tsx` (server-rendered page)
 *
 * Both call `lookupCoa(token)` and receive the same validated payload.
 *
 * NEVER import this from a client component — it intentionally reaches a
 * private host config and is not safe to bundle.
 */

import { CoaRecordSchema, type CoaRecord } from "./schema";
import { normalizeToken } from "./token";

export type CoaLookupResult =
	| { ok: true; record: CoaRecord }
	| { ok: false; reason: "invalid_token" | "not_found" | "registry_unavailable" | "invalid_record" };

/**
 * Resolve a token through the registry. Returns the validated record on
 * success, or a tagged error code on any failure path so the caller can
 * decide the HTTP status / UI response.
 *
 * - `invalid_token`     → caller-supplied token doesn't match the alphabet.
 *                         404 the customer.
 * - `not_found`         → registry returned 404. 404 the customer.
 * - `registry_unavailable` → network / 5xx talking to the registry. 502.
 * - `invalid_record`    → record exists but failed Zod validation (corrupt
 *                         JSON or a backend-side schema drift). 502 + log.
 */
export async function lookupCoa(rawToken: unknown): Promise<CoaLookupResult> {
	const token = normalizeToken(rawToken);
	if (!token) {
		return { ok: false, reason: "invalid_token" };
	}

	const baseUrl = process.env.COA_REGISTRY_BASE_URL;
	if (!baseUrl) {
		console.error("[coa] COA_REGISTRY_BASE_URL is not configured");
		return { ok: false, reason: "registry_unavailable" };
	}

	const url = `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(token)}.json`;

	let response: Response;
	try {
		response = await fetch(url, {
			// COA records are append-only: once published, the JSON for status
			// fields may flip (active → recalled). Cache briefly to avoid
			// hammering the registry while still picking recall flips up within
			// ~60 seconds.
			next: { revalidate: 60 },
			// SSRF hardening: refuse to follow redirects. The registry URL is
			// operator-configured and should serve the JSON directly; a
			// redirect almost certainly indicates misconfiguration or
			// compromise.
			redirect: "error",
			headers: { Accept: "application/json" },
		});
	} catch (err) {
		console.error(`[coa] Registry network error for ${token}:`, err);
		return { ok: false, reason: "registry_unavailable" };
	}

	if (response.status === 404) {
		return { ok: false, reason: "not_found" };
	}

	if (!response.ok) {
		console.error(`[coa] Registry returned ${response.status} for ${token}`);
		return { ok: false, reason: "registry_unavailable" };
	}

	let json: unknown;
	try {
		json = await response.json();
	} catch (err) {
		console.error(`[coa] Registry JSON parse failed for ${token}:`, err);
		return { ok: false, reason: "invalid_record" };
	}

	const parsed = CoaRecordSchema.safeParse(json);
	if (!parsed.success) {
		console.error(`[coa] Registry record failed validation for ${token}:`, parsed.error.flatten());
		return { ok: false, reason: "invalid_record" };
	}

	// Defence in depth: ensure the record's own token matches the token we
	// looked up. Catches accidental file copies / mis-uploads on the registry
	// side (a record under A.json that claims it's token B).
	if (parsed.data.token !== token) {
		console.error(`[coa] Token mismatch — file ${token} contains record ${parsed.data.token}`);
		return { ok: false, reason: "invalid_record" };
	}

	return { ok: true, record: parsed.data };
}
