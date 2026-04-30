import { NextRequest, NextResponse } from "next/server";

import { searchPubmed } from "@/lib/pubmed/client";
import { PubmedSearchParamsSchema, type PubmedSearchResponse } from "@/lib/pubmed/schema";

// ── Rate limiting ─────────────────────────────────────────────
//
// The NCBI key is shared across our whole egress: 10 req/sec without queueing
// would torch the budget if a single visitor scripted the endpoint. The
// per-IP storefront limit below is the visitor-side throttle. The cache below
// is the egress-side throttle (most queries hit Next's data cache, never
// reaching NCBI).
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 30; // 30 searches per IP per 5 minutes

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

function jsonResponse(body: PubmedSearchResponse, status: number) {
	return NextResponse.json(body, {
		status,
		headers: {
			// PubMed metadata is technically public, but our endpoint is internal.
			"X-Robots-Tag": "noindex, nofollow",
			// We rely on Next's data-cache for the upstream fetch; the response
			// from THIS endpoint is per-request and shouldn't be CDN-cached
			// because the rate-limit decision differs per IP.
			"Cache-Control": "no-store",
		},
	});
}

export async function GET(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	if (!checkRateLimit(ip)) {
		return jsonResponse(
			{
				ok: false,
				error: "rate_limited",
				message: "Too many searches. Please wait a few minutes and try again.",
			},
			429,
		);
	}

	const { searchParams } = new URL(request.url);
	const parsed = PubmedSearchParamsSchema.safeParse({
		q: searchParams.get("q") ?? "",
		limit: searchParams.get("limit") ?? undefined,
		recent: searchParams.get("recent") ?? undefined,
	});
	if (!parsed.success) {
		return jsonResponse(
			{
				ok: false,
				error: "invalid_query",
				message: parsed.error.issues[0]?.message ?? "Invalid search query.",
			},
			400,
		);
	}

	const { q, limit, recent } = parsed.data;
	const result = await searchPubmed({ query: q, limit, recent });

	if (!result.ok) {
		return jsonResponse(
			{
				ok: false,
				error: "upstream_error",
				message: "PubMed is temporarily unavailable. Please try again shortly.",
			},
			502,
		);
	}

	return jsonResponse({ ok: true, query: q, total: result.total, results: result.results }, 200);
}
