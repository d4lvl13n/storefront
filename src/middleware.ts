import { NextResponse, type NextRequest } from "next/server";

/**
 * Known good-bot user-agents. Used to skip the checkout auth redirect for bots
 * (which would otherwise create redirect loops on the login page for bots that
 * follow). The RUO attestation is enforced client-side via the ResearchGate
 * modal overlay and server-side at commerce mutations, so we no longer gate
 * browse routes server-side here — full HTML is served to all visitors so
 * Googlebot can index PDPs, categories, and search pages.
 */
const CRAWLER_UA = /(googlebot|bingbot|duckduckbot|yandex|baiduspider|facebot|twitterbot|slackbot)/i;

/**
 * Channel canonicalization.
 *
 * The storefront routes are organized as `/<channel>/<route>` via the
 * `[channel]` dynamic segment in App Router. Because `[channel]` accepts
 * ANY string, requests like `/waiver/peptide-calculator` resolve as
 * `channel="waiver", route="peptide-calculator"` and render duplicate
 * content under non-canonical URLs. The May 2026 SEO audit traced ~92% of
 * indexed pages to this bug (34 sets of duplicates).
 *
 * VALID_CHANNELS: the canonical channel slugs the storefront serves.
 * Sourced from NEXT_PUBLIC_DEFAULT_CHANNEL — extend if a multi-channel
 * setup ever ships.
 *
 * NON_CHANNEL_ROOTS: first-segment paths that are REAL non-channel routes
 * (e.g., the standalone `/checkout` flow and `/access-restricted` decline
 * page) and must pass through untouched. Static assets and the metadata
 * routes (`/sitemap.xml`, `/robots.txt`, `/favicon.ico`, etc.) are already
 * excluded by the `matcher` config below — they never reach this code.
 */
const VALID_CHANNELS = new Set(
	[process.env.NEXT_PUBLIC_DEFAULT_CHANNEL, "default-channel"].filter(Boolean) as string[],
);

const NON_CHANNEL_ROOTS = new Set(["checkout", "access-restricted"]);

/**
 * Authenticated-only checkout guard.
 *
 * Frier Levitt memo (April 2026), Section III.B.b — Know-Your-Customer Screening (p. 18):
 *   "Individuals should be prohibited from opening an account"
 *
 * Saleor does not expose a channel-level toggle for guest checkout. The enforcement
 * happens in the storefront, here. Any request for /checkout without a Saleor
 * refresh token cookie is redirected to the login page. We deliberately check
 * cookie PRESENCE only (not validity) — stale cookies are a small edge case and
 * the frontend will surface the real auth error on the login/checkout pages.
 *
 * Refresh-token cookie name is produced by @saleor/auth-sdk using the pattern:
 *   `{saleorApiUrl}+saleor_auth_module_refresh_token`  →  non-alphanumeric → `_`
 * (matches `encodeCookieName()` in src/lib/auth/constants.ts).
 */
const SALEOR_API_URL = process.env.NEXT_PUBLIC_SALEOR_API_URL ?? "";
const DEFAULT_CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL ?? "default-channel";

function encodeCookieName(key: string): string {
	return key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

const REFRESH_TOKEN_COOKIE = SALEOR_API_URL
	? encodeCookieName(`${SALEOR_API_URL}+saleor_auth_module_refresh_token`)
	: null;

function requiresAuth(pathname: string): boolean {
	return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

export function middleware(request: NextRequest) {
	const url = request.nextUrl;

	// ── Detect crawler UA (used by checkout auth gate to avoid redirect loops) ──
	const ua = request.headers.get("user-agent") ?? "";
	const isCrawler = CRAWLER_UA.test(ua);

	// ── 1. Channel canonicalization: collapse duplicate-content URLs to /<channel>/* ──
	//
	// Without this, `/waiver/peptide-calculator` resolves as channel="waiver" and
	// renders the calculator under a non-canonical URL. We 308-redirect any
	// first-segment that isn't a real channel or a known non-channel root, prepending
	// the default channel and preserving the rest of the path + query string.
	//
	// 308 (permanent) is used so search engines transfer ranking signals from the
	// duplicate URLs to the canonical ones and stop re-crawling the dupes.
	{
		const parts = url.pathname.split("/").filter(Boolean);
		const firstSegment = parts[0];
		const defaultChannel = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL;
		if (
			firstSegment &&
			defaultChannel &&
			!VALID_CHANNELS.has(firstSegment) &&
			!NON_CHANNEL_ROOTS.has(firstSegment)
		) {
			const canonical = url.clone();
			canonical.pathname = `/${defaultChannel}${url.pathname}`;
			return NextResponse.redirect(canonical, 308);
		}
	}

	// ── 2. Authenticated-only checkout: block guest purchase ──
	//
	// Redirects unauthenticated visitors hitting /checkout to the login page
	// with a ?next=<original-path> so they return to the same checkout after
	// signing in. Crawlers skip this check (the checkout route is noindex
	// anyway, and redirecting crawlers to login creates a redirect loop on
	// the login page for bots that follow).
	if (REFRESH_TOKEN_COOKIE && !isCrawler && requiresAuth(url.pathname)) {
		const hasRefreshToken = request.cookies.has(REFRESH_TOKEN_COOKIE);
		if (!hasRefreshToken) {
			const next = url.pathname + url.search;
			const loginUrl = url.clone();
			loginUrl.pathname = `/${DEFAULT_CHANNEL}/login`;
			loginUrl.search = "";
			loginUrl.searchParams.set("next", next);
			return NextResponse.redirect(loginUrl);
		}
	}

	// ── 3. Affiliate referral capture ──
	const ref = url.searchParams.get("ref");
	if (!ref) return NextResponse.next();

	// Sanitize: only allow alphanumeric, hyphens, underscores (max 50 chars)
	const sanitized = ref.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
	if (!sanitized) return NextResponse.next();

	// Strip the ref param from the URL for clean URLs
	const cleanUrl = url.clone();
	cleanUrl.searchParams.delete("ref");

	const response = NextResponse.redirect(cleanUrl);
	response.cookies.set("affiliate_code", sanitized, {
		maxAge: 30 * 24 * 60 * 60, // 30 days
		path: "/",
		sameSite: "lax",
		secure: url.protocol === "https:",
		httpOnly: false, // Needs to be readable by checkout JS
	});

	return response;
}

export const config = {
	// Only run on page routes, skip API/static/internal paths
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
