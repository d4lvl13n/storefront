import { NextRequest, NextResponse } from "next/server";

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

	const resendApiKey = process.env.RESEND_API_KEY;
	const audienceId = process.env.RESEND_AUDIENCE_ID;

	// Preferred path: add to Resend Audience
	if (resendApiKey && audienceId) {
		const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${resendApiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email: normalized, unsubscribed: false }),
		});

		if (!res.ok) {
			const errorBody = await res.text();
			// 409 = already exists — treat as success for idempotency
			if (res.status !== 409) {
				console.error("Resend audience error:", res.status, errorBody);
				return NextResponse.json({ error: "Subscription failed. Please try again." }, { status: 502 });
			}
		}
		return NextResponse.json({ success: true });
	}

	// Fallback: notify ops via email if audience isn't configured
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
