"use server";

import { redirect } from "next/navigation";
import { requireOperator } from "@/lib/affiliate/admin-auth";
import {
	createAffiliate,
	getAffiliateByCode,
	updateAffiliate,
	updateApplicationStatus,
	updateCommissionStatus,
} from "@/lib/affiliate/db";
import { notifyApplicationApproved, notifyApplicationRejected } from "@/lib/affiliate/notify";

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

export async function approveApplicationAction(formData: FormData): Promise<void> {
	await requireOperator();

	const channel = String(formData.get("channel") ?? "");
	const applicationId = Number(formData.get("application_id"));
	const code = String(formData.get("code") ?? "").trim();
	const ratePct = Number(String(formData.get("rate_pct") ?? "").replace(",", "."));

	if (!applicationId) backTo(channel, { err: "Missing application id." });
	if (!CODE_RE.test(code)) {
		backTo(channel, {
			err: "Code must be 2–50 chars: letters, numbers, - or _ (it becomes the voucher and ?ref= link).",
		});
	}
	if (!Number.isFinite(ratePct) || ratePct <= 0 || ratePct > 100) {
		backTo(channel, { err: "Commission must be a percentage between 0 and 100 (e.g. 10)." });
	}

	if (await getAffiliateByCode(code)) {
		backTo(channel, { err: `Code "${code}" is already in use — pick another.` });
	}

	const application = await updateApplicationStatus(applicationId, "approved");
	if (!application) backTo(channel, { err: "Application not found." });

	const affiliate = await createAffiliate({
		code,
		name: application.name,
		email: application.email,
		commission_rate: Math.round(ratePct * 100) / 10000,
	});

	const emailed = await notifyApplicationApproved(affiliate);

	backTo(channel, {
		ok:
			`Approved ${application.name} as "${affiliate.code}" at ${ratePct}%.` +
			(emailed ? " They've been emailed their referral link." : " ⚠ Email failed — contact them manually.") +
			` Next step: create voucher "${affiliate.code}" in the Saleor Dashboard (Catalog → Vouchers).`,
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
		updated > 0 ? { ok: `Commission #${id} marked ${status}.` } : { err: `Commission #${id} not found.` },
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
