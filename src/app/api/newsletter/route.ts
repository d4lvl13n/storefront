import { NextRequest, NextResponse } from "next/server";
import { getKlaviyoCompanyId, getKlaviyoNewsletterListId } from "@/config/analytics";

// ── Rate limiting ─────────────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // Max 5 submissions per window per IP

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

// ── Handler ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
	const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	if (!checkRateLimit(ip)) {
		return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const email = (body as { email?: unknown })?.email;
	if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
	}

	const normalized = email.trim().toLowerCase();

	const companyId = getKlaviyoCompanyId();
	const listId = getKlaviyoNewsletterListId();

	// Preferred path: subscribe to Klaviyo via the client subscriptions endpoint.
	// Uses the public company ID only (no private API key). For a double opt-in
	// list this triggers Klaviyo's confirmation email; consent is recorded by
	// Klaviyo. Re-subscribing an existing profile is idempotent (also 202).
	if (companyId && listId) {
		const res = await fetch(`https://a.klaviyo.com/client/subscriptions/?company_id=${companyId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				revision: "2024-10-15",
			},
			body: JSON.stringify({
				data: {
					type: "subscription",
					attributes: {
						profile: {
							data: {
								type: "profile",
								attributes: {
									email: normalized,
									subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } },
								},
							},
						},
					},
					relationships: { list: { data: { type: "list", id: listId } } },
				},
			}),
		});

		// Success is 202 Accepted with an empty body.
		if (!res.ok) {
			console.error("Klaviyo subscribe error:", res.status, await res.text());
			return NextResponse.json({ error: "Subscription failed. Please try again." }, { status: 502 });
		}
		return NextResponse.json({ success: true });
	}

	// Fallback: notify ops via email if Klaviyo isn't configured
	const resendApiKey = process.env.RESEND_API_KEY;
	const notifyTo = process.env.NEWSLETTER_NOTIFY_EMAIL ?? process.env.CONTACT_EMAIL;
	if (resendApiKey && notifyTo) {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${resendApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: `InfinityBio Newsletter <noreply@infinitybiolabs.com>`,
				to: [notifyTo],
				subject: `[Newsletter] New signup: ${normalized}`,
				text: `New newsletter signup: ${normalized}\nIP: ${ip}\nTime: ${new Date().toISOString()}`,
			}),
		});
		if (!res.ok) {
			console.error("Resend notify error:", res.status, await res.text());
			return NextResponse.json({ error: "Subscription failed. Please try again." }, { status: 502 });
		}
		return NextResponse.json({ success: true });
	}

	// No ESP configured — log and soft-fail success so the UI stays usable in dev
	console.warn("Newsletter signup dropped — no RESEND_API_KEY configured:", normalized);
	return NextResponse.json({ success: true });
}
