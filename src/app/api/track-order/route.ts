import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL } from "@/lib/graphql";

// ── Rate limiting ─────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // Max 10 lookups per window per IP

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

// ── GraphQL ───────────────────────────────────────────────────
const ORDERS_BY_NUMBER_QUERY = /* GraphQL */ `
	query OrderLookup($number: String!) {
		orders(filter: { numbers: [$number] }, first: 1) {
			edges {
				node {
					number
					status
					statusDisplay
					paymentStatus
					created
					userEmail
					trackingClientId
					channel {
						slug
					}
					fulfillments {
						status
						created
						trackingNumber
					}
				}
			}
		}
	}
`;

interface OrderLookupResponse {
	orders: {
		edges: Array<{
			node: {
				number: string;
				status: string;
				statusDisplay: string;
				paymentStatus: string;
				created: string;
				userEmail: string | null;
				trackingClientId: string | null;
				channel: { slug: string };
				fulfillments: Array<{
					status: string;
					created: string;
					trackingNumber: string | null;
				}>;
			};
		}>;
	};
}

// ── Handler ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	if (!checkRateLimit(ip)) {
		return NextResponse.json({ error: "Too many lookups. Please try again later." }, { status: 429 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const orderNumberRaw = (body as { orderNumber?: unknown })?.orderNumber;
	const emailRaw = (body as { email?: unknown })?.email;
	const channelSlug = (body as { channel?: unknown })?.channel;

	if (typeof orderNumberRaw !== "string" || !orderNumberRaw.trim()) {
		return NextResponse.json({ error: "Order number is required" }, { status: 400 });
	}
	if (typeof emailRaw !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
		return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
	}

	// Strip optional "ORD-" prefix users might paste
	const orderNumber = orderNumberRaw.trim().replace(/^ORD-/i, "");
	const email = emailRaw.trim().toLowerCase();

	const appToken = process.env.SALEOR_APP_TOKEN;
	if (!appToken) {
		console.error("/api/track-order: SALEOR_APP_TOKEN is not configured");
		return NextResponse.json({ error: "Order tracking is unavailable right now." }, { status: 503 });
	}

	const result = await executeRawGraphQL<OrderLookupResponse>({
		query: ORDERS_BY_NUMBER_QUERY,
		variables: { number: orderNumber },
		headers: { Authorization: `Bearer ${appToken}` },
	});

	if (!result.ok) {
		console.error("/api/track-order: Saleor lookup failed:", result.error.message);
		return NextResponse.json({ error: "Order tracking is unavailable right now." }, { status: 502 });
	}

	const node = result.data.orders.edges[0]?.node;

	// Generic 404 for both "not found" and "email mismatch" — don't leak existence
	const matches = node && node.userEmail && node.userEmail.trim().toLowerCase() === email;

	// Optional channel scoping: only return the order if it's in the same channel
	// the user is browsing (so /us-us/track-order can't surface other-region orders)
	const channelMatches =
		!channelSlug || typeof channelSlug !== "string" || node?.channel?.slug === channelSlug;

	if (!matches || !channelMatches) {
		return NextResponse.json(
			{ error: "We couldn't find an order matching that number and email." },
			{ status: 404 },
		);
	}

	// Sanitize: only return what the customer needs
	return NextResponse.json({
		order: {
			number: node.number,
			status: node.status,
			statusDisplay: node.statusDisplay,
			paymentStatus: node.paymentStatus,
			created: node.created,
			fulfillments: node.fulfillments.map((f) => ({
				status: f.status,
				created: f.created,
				trackingNumber: f.trackingNumber,
			})),
		},
	});
}
