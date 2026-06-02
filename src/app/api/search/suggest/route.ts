import { NextRequest, NextResponse } from "next/server";

import { suggestProducts } from "@/lib/search";

// ── Rate limiting ─────────────────────────────────────────────
// The header dropdown fires one request per debounced keystroke, so the ceiling
// is generous — it only exists to stop a scripted client from hammering the
// Saleor egress. Most repeat queries are served from Next's data cache.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 80; // 80 suggest calls per IP per minute

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

const HEADERS = {
	// Internal endpoint — keep it out of indexes and off the CDN (the rate-limit
	// decision is per-IP; the upstream GraphQL fetch is what we cache).
	"X-Robots-Tag": "noindex, nofollow",
	"Cache-Control": "no-store",
} as const;

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const query = (searchParams.get("q") ?? "").trim();
	const channel = (searchParams.get("channel") ?? "").trim();

	if (!channel) {
		return NextResponse.json({ ok: false, error: "missing_channel" }, { status: 400, headers: HEADERS });
	}

	// Too short to be meaningful — return an empty (but successful) payload so the
	// client can simply clear its dropdown without special-casing errors.
	if (query.length < 2) {
		return NextResponse.json({ ok: true, query, products: [], totalCount: 0 }, { headers: HEADERS });
	}

	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	if (!checkRateLimit(ip)) {
		return NextResponse.json(
			{ ok: false, error: "rate_limited", message: "Too many searches. Please slow down." },
			{ status: 429, headers: HEADERS },
		);
	}

	try {
		const { products, totalCount, correction } = await suggestProducts({ query, channel, limit: 6 });
		return NextResponse.json({ ok: true, query, products, totalCount, correction }, { headers: HEADERS });
	} catch {
		return NextResponse.json(
			{ ok: false, error: "upstream_error", message: "Search is temporarily unavailable." },
			{ status: 502, headers: HEADERS },
		);
	}
}
