/**
 * Validate a `?next=` post-auth redirect target.
 *
 * Only same-origin, root-relative paths are allowed. A naive
 * `startsWith("/") && !startsWith("//")` check is NOT enough: browsers and the
 * WHATWG URL parser normalize a backslash to a slash, so `/\evil.com` (and
 * tab/newline-spliced variants like `/<TAB>/evil.com`) resolve to the
 * protocol-relative `//evil.com` → an external origin. We therefore reject
 * backslashes and C0/C1 control characters up front, then confirm the value
 * still resolves to our own origin.
 *
 * A fixed dummy base is used so the function behaves identically on the server
 * (no `window`) and the client, avoiding hydration drift.
 */
const DUMMY_ORIGIN = "https://safe.invalid";

/** True if the string contains a backslash or any C0/C1 control char. */
function hasUnsafeChar(value: string): boolean {
	for (let i = 0; i < value.length; i++) {
		if (value[i] === "\\") return true;
		const code = value.charCodeAt(i);
		// C0 controls (incl. tab 0x09 / newline 0x0a / CR 0x0d) and DEL/C1 (0x7f–0x9f).
		if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true;
	}
	return false;
}

export function isSafeNextPath(value: string | null): value is string {
	if (!value) return false;
	if (value[0] !== "/") return false; // must be root-relative
	if (value[1] === "/" || value[1] === "\\") return false; // //host or /\host
	if (hasUnsafeChar(value)) return false;
	try {
		return new URL(value, DUMMY_ORIGIN).origin === DUMMY_ORIGIN;
	} catch {
		return false;
	}
}
