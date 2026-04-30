/**
 * COA token format helpers.
 *
 * Tokens are 12 characters of Crockford base32 minus the visually ambiguous
 * characters (0, 1, I, L, O, U), displayed as `XXXX-XXXX-XXXX`. See
 * docs/coa-checker-spec.md §"Token format".
 *
 * Used by:
 *   - URL handlers in src/app/[channel]/(main)/coa/[token]/page.tsx
 *   - The manual entry form
 *   - The API route
 */

/** Allowed characters in the COA alphabet (Crockford base32 minus 0/1/I/L/O/U). */
const ALPHABET = new Set("23456789ABCDEFGHJKMNPQRSTVWXYZ".split(""));

/** Length of the unformatted (no-dash) token. */
const TOKEN_LENGTH = 12;

/**
 * Regex matching the canonical dashed form (`XXXX-XXXX-XXXX`, uppercase).
 *
 * Character class **must** mirror the COA alphabet exactly — i.e. exclude
 * the visually-ambiguous characters `0`, `1`, `I`, `L`, `O`, `U`. A loose
 * `[A-Z2-9]` would let a buggy registry publish records with chars that
 * `normalizeToken` then rejects, causing the page-side consistency check
 * to trip on every lookup.
 */
export const COA_TOKEN_REGEX = /^[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/;

/**
 * Normalize an input string into the canonical dashed COA token form.
 *
 * Accepts:
 *   - With or without dashes
 *   - Upper or lower case
 *   - Surrounding whitespace
 *
 * Rejects:
 *   - Wrong length
 *   - Any character outside the strict alphabet (visually ambiguous chars
 *     like O / 0 / I / L are not silently mapped — they fail validation so
 *     the customer gets a clear "not found" instead of resolving to the
 *     wrong COA)
 *
 * @returns canonical form `AAAA-BBBB-CCCC` if valid, otherwise `null`.
 */
export function normalizeToken(input: unknown): string | null {
	if (typeof input !== "string") return null;

	const cleaned = input
		.trim()
		.toUpperCase()
		.replace(/[-\s_]/g, "");

	if (cleaned.length !== TOKEN_LENGTH) return null;

	for (const char of cleaned) {
		if (!ALPHABET.has(char)) return null;
	}

	return formatToken(cleaned);
}

/**
 * Insert dashes into a 12-character unformatted token: `AAAABBBBCCCC` →
 * `AAAA-BBBB-CCCC`. Caller must ensure input is already validated; this is
 * a pure formatter.
 */
function formatToken(unformatted: string): string {
	return `${unformatted.slice(0, 4)}-${unformatted.slice(4, 8)}-${unformatted.slice(8, 12)}`;
}

/** True if the input normalizes to a valid COA token. */
export function isValidToken(input: unknown): boolean {
	return normalizeToken(input) !== null;
}
