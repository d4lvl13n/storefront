import { NextResponse, type NextRequest } from "next/server";

const RUO_COOKIE = "ruo_acknowledged";

/**
 * Path segments that require a research-use affirmation before content is served.
 * Checked against the first segment after the channel prefix (e.g. /default-channel/products).
 */
const RUO_GATED_SEGMENTS = new Set(["products", "categories", "collections", "cart", "checkout", "search"]);

/**
 * Known good-bot user-agents that should be allowed past the research gate for SEO
 * indexing. They still see the page content; crawlers don't "purchase" so the risk is
 * minimal.
 */
const CRAWLER_UA = /(googlebot|bingbot|duckduckbot|yandex|baiduspider|facebot|twitterbot|slackbot)/i;

function requiresResearchGate(pathname: string): boolean {
	// Normalize: /{channel}/{segment}/... or /{segment}/...
	const parts = pathname.split("/").filter(Boolean);
	if (parts.length === 0) return false;

	// Allow our own denial / verification pages
	if (parts[0] === "access-restricted") return false;

	// Path shape 1: /segment
	if (RUO_GATED_SEGMENTS.has(parts[0] ?? "")) return true;

	// Path shape 2: /channel/segment
	if (parts.length >= 2 && RUO_GATED_SEGMENTS.has(parts[1] ?? "")) return true;

	return false;
}

export function middleware(request: NextRequest) {
	const url = request.nextUrl;

	// ── 1. Research-use gate: block sensitive routes for un-affirmed visitors ──
	const ruoAcknowledged = request.cookies.get(RUO_COOKIE)?.value === "1";
	const ua = request.headers.get("user-agent") ?? "";
	const isCrawler = CRAWLER_UA.test(ua);

	if (!ruoAcknowledged && !isCrawler && requiresResearchGate(url.pathname)) {
		const redirectUrl = url.clone();
		redirectUrl.pathname = "/";
		redirectUrl.searchParams.set("affirm", "1");
		return NextResponse.redirect(redirectUrl);
	}

	// ── 2. Affiliate referral capture ──
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
