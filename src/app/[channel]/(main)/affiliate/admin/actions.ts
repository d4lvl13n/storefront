"use server";

import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/affiliate/admin-auth";
import { getServerAuthClient } from "@/lib/auth/server";
import {
	createAffiliate,
	getAffiliateByCode,
	getAffiliateById,
	updateAffiliate,
	updateApplicationStatus,
	updateCommissionStatus,
} from "@/lib/affiliate/db";
import { notifyApplicationApproved, notifyApplicationRejected } from "@/lib/affiliate/notify";
import { createAffiliateVoucher } from "@/lib/affiliate/saleor-voucher";

/**
 * Server actions for the affiliate operator page. Every action re-verifies
 * the operator whitelist — the gate on the page render is not enough.
 * Outcomes are surfaced via ?ok= / ?err= query params on the redirect back.
 */

// Must match the middleware's ?ref= sanitizer ([a-zA-Z0-9_-]) or the
// affiliate's referral link would be silently mangled.
const CODE_RE = /^[a-zA-Z0-9_-]{2,50}$/;

function backTo(channel: string, params: Record<string, string>): never {
	const qs = new URLSearchParams(params).toString();
	redirect(`/${encodeURIComponent(channel)}/affiliate/admin${qs ? `?${qs}` : ""}`);
}

/**
 * Sign the current (non-operator) user out and bounce them to the login page,
 * pre-pointed back at the operator console.
 *
 * This is the escape hatch for the "not authorized" notice: an operator who
 * landed here on the wrong account can't otherwise recover, because the login
 * page redirects already-authenticated users straight back. No operator check —
 * by definition this is only reached by someone who is NOT an operator, and all
 * it does is sign the current session out.
 */
export async function signOutToOperatorLoginAction(formData: FormData): Promise<void> {
	const raw = String(formData.get("channel") ?? "").trim();
	const channel = /^[a-z0-9-]+$/i.test(raw) ? raw : "";
	await (await getServerAuthClient()).signOut();
	const base = channel ? `/${channel}` : "";
	redirect(`${base}/login?next=${encodeURIComponent(`${base}/affiliate/admin`)}`);
}

export async function approveApplicationAction(formData: FormData): Promise<void> {
	await requireOperator();

	const channel = String(formData.get("channel") ?? "");
	const applicationId = Number(formData.get("application_id"));
	// Canonical UPPERCASE end-to-end: the voucher match at checkout is
	// case-sensitive, and the ?ref= middleware capture uppercases too.
	const code = String(formData.get("code") ?? "")
		.trim()
		.toUpperCase();
	const ratePct = Number(String(formData.get("rate_pct") ?? "").replace(",", "."));
	const discountPct = Number(String(formData.get("discount_pct") ?? "").replace(",", "."));

	if (!applicationId) backTo(channel, { err: "Missing application id." });
	if (!CODE_RE.test(code)) {
		backTo(channel, {
			err: "Code must be 2–50 chars: letters, numbers, - or _ (it becomes the voucher and ?ref= link).",
		});
	}
	if (!Number.isFinite(ratePct) || ratePct <= 0 || ratePct > 100) {
		backTo(channel, { err: "Commission must be a percentage between 0 and 100 (e.g. 10)." });
	}
	// 0 is allowed: a referral code that attributes commission but gives the
	// customer no discount is a valid setup. Negatives and >100 are not.
	if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
		backTo(channel, { err: "Customer discount must be a percentage between 0 and 100 (e.g. 10)." });
	}

	if (await getAffiliateByCode(code)) {
		backTo(channel, { err: `Code "${code}" is already in use — pick another.` });
	}

	// Best-effort voucher minting. When SALEOR_APP_TOKEN is configured and the
	// mint succeeds, the code works at checkout immediately. When it isn't set
	// (or the mint fails), approval STILL completes — the operator creates the
	// voucher manually in the Saleor Dashboard, and the amber banner below tells
	// them exactly what to make. Approval is never blocked on Saleor.
	const voucher = await createAffiliateVoucher({ code, discountPct, channelSlug: channel });

	const application = await updateApplicationStatus(applicationId, "approved");
	if (!application) backTo(channel, { err: "Application not found." });

	const affiliate = await createAffiliate({
		code,
		name: application.name,
		email: application.email,
		commission_rate: Math.round(ratePct * 100) / 10000,
		voucher_id: voucher.ok ? voucher.voucherId : null,
	});

	const emailed = await notifyApplicationApproved(affiliate);
	const emailNote = emailed
		? " They've been emailed their referral link."
		: " ⚠ Email failed — send them their code manually.";
	const summary = `Approved ${application.name} as "${affiliate.code}" — ${ratePct}% commission, ${discountPct}% customer discount.`;

	if (voucher.ok) {
		backTo(channel, {
			ok:
				summary +
				(voucher.alreadyExisted
					? ` Voucher "${affiliate.code}" already existed in Saleor — reused.`
					: ` Voucher "${affiliate.code}" created in Saleor.`) +
				emailNote,
		});
	}

	// Mint didn't happen — approval is done, but the discount won't apply until
	// the operator creates the voucher by hand. Surface that prominently (amber).
	backTo(channel, {
		warn:
			summary +
			` ⚠ Now create voucher "${affiliate.code}" in the Saleor Dashboard: ${discountPct}% off the entire order, ` +
			`listed on this channel, apply once per customer. Until you do, the referral link won't apply a discount at checkout.` +
			emailNote,
	});
}

export async function rejectApplicationAction(formData: FormData): Promise<void> {
	await requireOperator();

	const channel = String(formData.get("channel") ?? "");
	const applicationId = Number(formData.get("application_id"));
	const notes = String(formData.get("notes") ?? "").trim() || undefined;

	if (!applicationId) backTo(channel, { err: "Missing application id." });

	const application = await updateApplicationStatus(applicationId, "rejected", notes);
	if (!application) backTo(channel, { err: "Application not found." });

	const emailed = await notifyApplicationRejected(application, notes);

	backTo(channel, {
		ok: `Rejected ${application.name}'s application.` + (emailed ? " They've been notified by email." : ""),
	});
}

export async function setCommissionStatusAction(formData: FormData): Promise<void> {
	await requireOperator();

	const channel = String(formData.get("channel") ?? "");
	const id = Number(formData.get("commission_id"));
	const status = String(formData.get("status") ?? "");

	if (!id || !["pending", "approved", "paid"].includes(status)) {
		backTo(channel, { err: "Invalid commission update." });
	}

	const updated = await updateCommissionStatus([id], status as "pending" | "approved" | "paid");
	backTo(
		channel,
		updated > 0
			? { ok: `Commission #${id} marked ${status}.` }
			: { err: `Commission #${id} was not updated. It may be missing or already reversed.` },
	);
}

export async function toggleAffiliateActiveAction(formData: FormData): Promise<void> {
	await requireOperator();

	const channel = String(formData.get("channel") ?? "");
	const id = Number(formData.get("affiliate_id"));
	const active = String(formData.get("active")) === "true";

	if (!id) backTo(channel, { err: "Missing affiliate id." });

	const affiliate = await updateAffiliate(id, { active });
	backTo(
		channel,
		affiliate
			? {
					ok: `${affiliate.code} is now ${active ? "active" : "paused"}.${
						active ? "" : " New orders with this code will no longer earn commissions."
					}`,
				}
			: { err: "Affiliate not found." },
	);
}

/**
 * Re-send an existing affiliate their approval email (code, referral link,
 * commission rate). Recovery for sends that failed at approval time — the
 * affiliate already exists in Neon, so nothing is re-created; we just re-fire
 * the same email. Safe to click repeatedly.
 */
export async function resendAffiliateEmailAction(formData: FormData): Promise<void> {
	await requireOperator();

	const channel = String(formData.get("channel") ?? "");
	const id = Number(formData.get("affiliate_id"));
	if (!id) backTo(channel, { err: "Missing affiliate id." });

	const affiliate = await getAffiliateById(id);
	if (!affiliate) backTo(channel, { err: "Affiliate not found." });

	const emailed = await notifyApplicationApproved(affiliate);
	backTo(
		channel,
		emailed
			? { ok: `Re-sent the code email to ${affiliate.email} (${affiliate.code}).` }
			: {
					err: `Couldn't send to ${affiliate.email} — check the email logs (Resend may be misconfigured). Their code is "${affiliate.code}".`,
				},
	);
}
