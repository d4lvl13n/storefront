"use server";

import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/affiliate/admin-auth";
import { getServerAuthClient } from "@/lib/auth/server";
import {
	createAffiliate,
	getAffiliateByCode,
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
	if (!Number.isFinite(discountPct) || discountPct <= 0 || discountPct > 100) {
		backTo(channel, { err: "Customer discount must be a percentage between 0 and 100 (e.g. 10)." });
	}

	if (await getAffiliateByCode(code)) {
		backTo(channel, { err: `Code "${code}" is already in use — pick another.` });
	}

	// Provision the Saleor voucher FIRST. If it fails, the approval aborts:
	// the application stays pending, no affiliate is activated, and no email
	// goes out advertising a code that wouldn't work at checkout. Retrying
	// after a fix is safe — an already-existing voucher counts as provisioned.
	const voucher = await createAffiliateVoucher({ code, discountPct, channelSlug: channel });
	if (!voucher.ok) {
		backTo(channel, {
			err:
				`Approval NOT completed — the Saleor voucher couldn't be created (${voucher.reason}). ` +
				`Fix the app permission (MANAGE_DISCOUNTS on SALEOR_APP_TOKEN) or create voucher "${code}" ` +
				`manually in the Dashboard (${discountPct}% entire order), then approve again with the same code.`,
		});
	}

	const application = await updateApplicationStatus(applicationId, "approved");
	if (!application) backTo(channel, { err: "Application not found." });

	const affiliate = await createAffiliate({
		code,
		name: application.name,
		email: application.email,
		commission_rate: Math.round(ratePct * 100) / 10000,
		voucher_id: voucher.voucherId,
	});

	const emailed = await notifyApplicationApproved(affiliate);

	backTo(channel, {
		ok:
			`Approved ${application.name} as "${affiliate.code}" — ${ratePct}% commission, ${discountPct}% customer discount.` +
			(voucher.alreadyExisted
				? ` Voucher "${affiliate.code}" already existed in Saleor — reused.`
				: ` Voucher "${affiliate.code}" created in Saleor.`) +
			(emailed
				? " They've been emailed their referral link — the program is live for them."
				: " ⚠ Email failed — send them their code manually."),
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
