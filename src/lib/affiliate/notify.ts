import type { AffiliateApplication } from "./types";

/**
 * Affiliate email notifications via Resend (same rail as the contact form).
 *
 * Every function here is FAIL-SOFT: a missing API key or a Resend outage is
 * logged and swallowed — notifications must never break an application
 * submission or an admin action. Callers can inspect the boolean if they
 * want to surface "email not sent" in a response.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = "InfinityBio Labs <noreply@infinitybiolabs.com>";

function opsEmail(): string {
	return process.env.AFFILIATE_NOTIFY_EMAIL ?? process.env.CONTACT_EMAIL ?? "support@infinitybiolabs.com";
}

async function send(opts: { to: string; subject: string; text: string; replyTo?: string }): Promise<boolean> {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		console.error("[affiliate] RESEND_API_KEY is not set — notification dropped:", opts.subject);
		return false;
	}

	// `to` and `reply_to` may be comma-separated (e.g. AFFILIATE_NOTIFY_EMAIL
	// with multiple ops recipients, used as the approval email's reply-to).
	// Resend rejects a comma-joined string — both fields must be arrays.
	const splitAddrs = (value: string) =>
		value
			.split(",")
			.map((addr) => addr.trim())
			.filter(Boolean);

	const recipients = splitAddrs(opts.to);
	if (recipients.length === 0) {
		console.error("[affiliate] no valid recipient — notification dropped:", opts.subject);
		return false;
	}
	const replyTo = opts.replyTo ? splitAddrs(opts.replyTo) : [];

	try {
		const res = await fetch(RESEND_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: FROM,
				to: recipients,
				...(replyTo.length ? { reply_to: replyTo } : {}),
				subject: opts.subject,
				text: opts.text,
			}),
		});
		if (!res.ok) {
			console.error("[affiliate] Resend error:", res.status, await res.text());
			return false;
		}
		return true;
	} catch (err) {
		console.error("[affiliate] Resend network error:", err);
		return false;
	}
}

/** New application: alert ops + send the applicant a confirmation. */
export async function notifyApplicationReceived(
	app: Pick<AffiliateApplication, "id" | "name" | "email" | "website" | "social_media" | "promotion_plan">,
): Promise<{ opsNotified: boolean; applicantNotified: boolean }> {
	const [opsNotified, applicantNotified] = await Promise.all([
		send({
			to: opsEmail(),
			replyTo: app.email,
			subject: `[Affiliate] New application #${app.id} — ${app.name}`,
			text: [
				`New affiliate application:`,
				``,
				`Name: ${app.name}`,
				`Email: ${app.email}`,
				app.website ? `Website: ${app.website}` : null,
				app.social_media ? `Social: ${app.social_media}` : null,
				``,
				`Promotion plan:`,
				app.promotion_plan,
				``,
				`Review it:`,
				`  curl -H "Authorization: Bearer $AFFILIATE_ADMIN_SECRET" \\`,
				`    "https://www.infinitybiolabs.com/api/affiliate/admin?view=applications&status=pending"`,
			]
				.filter((line): line is string => line !== null)
				.join("\n"),
		}),
		send({
			to: app.email,
			replyTo: opsEmail(),
			subject: "We received your InfinityBio Labs affiliate application",
			text: [
				`Hi ${app.name},`,
				``,
				`Thanks for applying to the InfinityBio Labs affiliate program.`,
				``,
				`Every application is reviewed by a human — we'll get back to you within a few business days. If we approve your application, you'll receive your personal referral code and link in a follow-up email.`,
				``,
				`Questions in the meantime? Just reply to this email.`,
				``,
				`— InfinityBio Labs`,
			].join("\n"),
		}),
	]);
	return { opsNotified, applicantNotified };
}

/** Approval: send the affiliate their code, link, and commission rate. */
export async function notifyApplicationApproved(affiliate: {
	name: string;
	email: string;
	code: string;
	commission_rate: number;
}): Promise<boolean> {
	const ratePct = Math.round(affiliate.commission_rate * 1000) / 10;
	return send({
		to: affiliate.email,
		replyTo: opsEmail(),
		subject: "You're in — your InfinityBio Labs affiliate code",
		text: [
			`Hi ${affiliate.name},`,
			``,
			`Welcome to the InfinityBio Labs affiliate program — your application has been approved.`,
			``,
			`Your referral code: ${affiliate.code}`,
			`Your referral link: https://www.infinitybiolabs.com?ref=${encodeURIComponent(affiliate.code)}`,
			`Your commission rate: ${ratePct}% of every paid order`,
			``,
			`How it works:`,
			`- Share your link. Visitors who arrive through it get your code applied automatically at checkout (valid for 30 days).`,
			`- Customers can also type ${affiliate.code} manually in the discount-code field.`,
			`- You earn ${ratePct}% of each paid order placed with your code. We track every order and settle commissions on a regular schedule.`,
			``,
			`Questions or marketing assets? Just reply to this email.`,
			``,
			`— InfinityBio Labs`,
		].join("\n"),
	});
}

/** Rejection: courteous note to the applicant. */
export async function notifyApplicationRejected(
	app: Pick<AffiliateApplication, "name" | "email">,
	notes?: string,
): Promise<boolean> {
	return send({
		to: app.email,
		replyTo: opsEmail(),
		subject: "Your InfinityBio Labs affiliate application",
		text: [
			`Hi ${app.name},`,
			``,
			`Thank you for your interest in the InfinityBio Labs affiliate program. After review, we're not able to approve your application at this time.`,
			notes ? `` : null,
			notes ? `Reviewer note: ${notes}` : null,
			``,
			`You're welcome to apply again in the future — especially if your audience or promotion approach changes.`,
			``,
			`— InfinityBio Labs`,
		]
			.filter((line): line is string => line !== null)
			.join("\n"),
	});
}
