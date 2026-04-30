import { NextRequest, NextResponse } from "next/server";

import { lookupCoa } from "@/lib/coa/registry";
import { type CoaLookupResponse, toPublicCoa } from "@/lib/coa/schema";

// ── Rate limiting ─────────────────────────────────────────────
// Same envelope as /api/track-order: 10 lookups per IP per 15-minute window.
// Random tokens already make enumeration impractical; this caps abuse from
// an attacker who has somehow gathered a list of valid tokens and wants to
// scrape them in bulk.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitStore.get(ip);
	if (!entry || entry.resetTime < now) {
		rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
		return true;
	}
	if (entry.count >= RATE_LIMIT_MAX) return false;
	entry.count++;
	return true;
}

function jsonResponse(body: CoaLookupResponse, status: number) {
	return NextResponse.json(body, {
		status,
		// COA records are public-by-token but never indexable.
		headers: {
			"X-Robots-Tag": "noindex, nofollow, noarchive",
			"Cache-Control": "no-store",
		},
	});
}

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	if (!checkRateLimit(ip)) {
		return jsonResponse(
			{ ok: false, error: "rate_limited", message: "Too many lookups. Please try again later." },
			429,
		);
	}

	const { token: rawToken } = await context.params;
	const result = await lookupCoa(rawToken);

	if (!result.ok) {
		switch (result.reason) {
			case "invalid_token":
			case "not_found":
				return jsonResponse({ ok: false, error: "not_found", message: "We couldn't find that COA." }, 404);
			case "registry_unavailable":
			case "invalid_record":
			default:
				return jsonResponse(
					{ ok: false, error: "server_error", message: "COA lookup is unavailable right now." },
					502,
				);
		}
	}

	return jsonResponse({ ok: true, coa: toPublicCoa(result.record) }, 200);
}
