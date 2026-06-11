import { NextRequest, NextResponse } from "next/server";

import { searchPubmed } from "@/lib/pubmed/client";
import { PubmedSearchParamsSchema, type PubmedSearchResponse } from "@/lib/pubmed/schema";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// ── Rate limiting ─────────────────────────────────────────────
//
// The NCBI key is shared across our whole egress: 10 req/sec without queueing
// would torch the budget if a single visitor scripted the endpoint. The
// per-IP storefront limit below is the visitor-side throttle (durable across
// instances). The cache is the egress-side throttle (most queries hit Next's
// data cache, never reaching NCBI).
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 30; // 30 searches per IP per 5 minutes

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
	const rl = await rateLimit({
		bucket: "pubmed",
		identifier: getClientIp(request),
		max: RATE_LIMIT_MAX,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!rl.ok) {
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
