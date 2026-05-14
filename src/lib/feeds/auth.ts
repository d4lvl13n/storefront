import { timingSafeEqual } from "node:crypto";

const BEARER_RE = /^Bearer\s+(.+)$/i;

export interface DiagnosticsAuthHeaders {
	authorization?: string | null;
	queryToken?: string | null;
}

/**
 * Returns true only when FEED_DIAGNOSTICS_TOKEN is configured and the request
 * provides a matching token via the `Authorization: Bearer <token>` header or
 * the `?token=` query parameter. The compare is length-safe and constant-time.
 *
 * When no token is configured we always return false — the route must respond
 * 404 in that case to avoid disclosing that the endpoint exists.
 */
export function isDiagnosticsAuthorized(input: DiagnosticsAuthHeaders): boolean {
	const expected = process.env.FEED_DIAGNOSTICS_TOKEN;
	if (!expected || expected.length === 0) {
		return false;
	}

	const provided = extractToken(input);
	if (!provided) {
		return false;
	}

	return safeEqual(expected, provided);
}

function extractToken({ authorization, queryToken }: DiagnosticsAuthHeaders): string | null {
	if (authorization) {
		const match = authorization.match(BEARER_RE);
		if (match) {
			const trimmed = match[1].trim();
			if (trimmed) return trimmed;
		}
	}

	if (queryToken) {
		const trimmed = queryToken.trim();
		if (trimmed) return trimmed;
	}

	return null;
}

function safeEqual(a: string, b: string): boolean {
	const aBuf = Buffer.from(a, "utf8");
	const bBuf = Buffer.from(b, "utf8");
	if (aBuf.length !== bBuf.length) {
		// timingSafeEqual requires equal lengths; perform a dummy compare against
		// the expected buffer so the rejection path still takes constant time on
		// the configured-token branch.
		timingSafeEqual(aBuf, aBuf);
		return false;
	}
	return timingSafeEqual(aBuf, bBuf);
}
