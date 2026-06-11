import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { buildPageMetadata, noIndexRobots } from "@/lib/seo";
import { getOperatorGate } from "@/lib/affiliate/admin-auth";
import { listAffiliates, listApplications, listCommissions } from "@/lib/affiliate/db";
import type { AffiliateApplication, AffiliateWithStats, Commission } from "@/lib/affiliate/types";
import { safeHttpUrl } from "@/lib/safe-url";
import {
	approveApplicationAction,
	rejectApplicationAction,
	setCommissionStatusAction,
	toggleAffiliateActiveAction,
} from "./actions";

export const dynamic = "force-dynamic"; // operator data must always be fresh

/**
 * Affiliate operations console — for non-technical operators.
 *
 * Gated by the storefront's own Saleor login + an email whitelist
 * (`AFFILIATE_ADMIN_EMAILS`). Review applications, approve (assigns the code
 * and emails the affiliate their referral link automatically), reject,
 * track commissions and mark them paid. The Bearer-token API at
 * /api/affiliate/admin remains available for scripts.
 */

type Params = { channel: string };
type SearchParams = { ok?: string | string[]; err?: string | string[] };

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
	const { channel } = await props.params;
	const base = buildPageMetadata({
		title: "Affiliate Operations — InfinityBio Labs",
		description: "Internal affiliate program console.",
		url: `/${channel}/affiliate/admin`,
	});
	return { ...base, robots: noIndexRobots };
}

export default async function AffiliateAdminPage(props: {
	params: Promise<Params>;
	searchParams: Promise<SearchParams>;
}) {
	const { channel } = await props.params;
	const { ok, err } = await props.searchParams;

	const gate = await getOperatorGate();
	if (gate.status === "anonymous") {
		redirect(`/${channel}/login?next=${encodeURIComponent(`/${channel}/affiliate/admin`)}`);
	}
	if (gate.status === "forbidden") {
		// Logged in but not whitelisted — don't advertise that this page exists.
		notFound();
	}

	const [{ applications }, affiliates, { commissions }] = await Promise.all([
		listApplications({ limit: 50 }),
		listAffiliates(),
		listCommissions({ limit: 50 }),
	]);

	const pending = applications.filter((a) => a.status === "pending");
	const reviewed = applications.filter((a) => a.status !== "pending").slice(0, 10);
	const okMsg = typeof ok === "string" ? ok : undefined;
	const errMsg = typeof err === "string" ? err : undefined;

	return (
		<section className="bg-background text-foreground">
			<div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
				{/* Header */}
				<div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
					<div>
						<p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Internal</p>
						<h1 className="mt-2 text-3xl font-bold tracking-tight">Affiliate operations</h1>
					</div>
					<p className="text-xs text-muted-foreground">Signed in as {gate.email}</p>
				</div>

				{/* Action outcome banners */}
				{okMsg && (
					<div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
						{okMsg}
					</div>
				)}
				{errMsg && (
					<div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
						{errMsg}
					</div>
				)}

				{/* ── Pending applications ─────────────────────────────── */}
				<SectionTitle
					title="Applications to review"
					count={pending.length}
					hint={pending.length === 0 ? "Nothing waiting — new applications will email you." : undefined}
				/>
				<div className="space-y-4">
					{pending.map((app) => (
						<ApplicationCard key={app.id} app={app} channel={channel} />
					))}
				</div>

				{/* ── Commissions ──────────────────────────────────────── */}
				<SectionTitle title="Commissions" count={commissions.length} className="mt-12" />
				{commissions.length === 0 ? (
					<EmptyNote>
						No commissions yet. They appear automatically when an order paid with an affiliate code comes in.
					</EmptyNote>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-border">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-card/40 border-b border-border text-left text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
									<th className="px-4 py-3 font-medium">Order</th>
									<th className="px-4 py-3 font-medium">Affiliate</th>
									<th className="px-4 py-3 text-right font-medium">Order total</th>
									<th className="px-4 py-3 text-right font-medium">Commission</th>
									<th className="px-4 py-3 font-medium">Status</th>
									<th className="px-4 py-3 text-right font-medium">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-border/60 divide-y">
								{commissions.map((c) => (
									<CommissionRow key={c.id} c={c} channel={channel} />
								))}
							</tbody>
						</table>
					</div>
				)}

				{/* ── Affiliates ───────────────────────────────────────── */}
				<SectionTitle title="Affiliates" count={affiliates.length} className="mt-12" />
				{affiliates.length === 0 ? (
					<EmptyNote>No affiliates yet — approve an application above to create the first one.</EmptyNote>
				) : (
					<div className="space-y-3">
						{affiliates.map((a) => (
							<AffiliateRow key={a.id} a={a} channel={channel} />
						))}
					</div>
				)}

				{/* ── Recently reviewed ────────────────────────────────── */}
				{reviewed.length > 0 && (
					<>
						<SectionTitle title="Recently reviewed" count={reviewed.length} className="mt-12" />
						<div className="overflow-hidden rounded-2xl border border-border">
							<table className="w-full text-sm">
								<tbody className="divide-border/60 divide-y">
									{reviewed.map((app) => (
										<tr key={app.id} className="bg-card/20">
											<td className="px-4 py-2.5">{app.name}</td>
											<td className="px-4 py-2.5 text-muted-foreground">{app.email}</td>
											<td className="px-4 py-2.5">
												<StatusChip tone={app.status === "approved" ? "emerald" : "red"} label={app.status} />
											</td>
											<td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
												{formatDate(app.reviewed_at)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}

				{/* Footer note */}
				<p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
					Approving an application does everything in one step: creates the affiliate, creates the matching
					Saleor voucher (the customer discount), and emails them their code and referral link. If the voucher
					can&rsquo;t be created automatically, the confirmation banner will tell you to add it in the Saleor
					Dashboard. Commissions appear here on paid orders and move pending → approved → paid; the payment
					itself (wire / PayPal) happens outside this page.
				</p>
			</div>
		</section>
	);
}

// ─── Pieces ────────────────────────────────────────────────────

function SectionTitle({
	title,
	count,
	hint,
	className = "",
}: {
	title: string;
	count: number;
	hint?: string;
	className?: string;
}) {
	return (
		<div className={`mb-4 flex items-baseline gap-3 ${className}`}>
			<h2 className="text-xl font-semibold tracking-tight">{title}</h2>
			<span className="text-sm tabular-nums text-muted-foreground">{count}</span>
			{hint && <span className="text-xs text-muted-foreground">— {hint}</span>}
		</div>
	);
}

function EmptyNote({ children }: { children: React.ReactNode }) {
	return (
		<p className="bg-card/20 rounded-2xl border border-border px-5 py-6 text-sm text-muted-foreground">
			{children}
		</p>
	);
}

function StatusChip({ tone, label }: { tone: "emerald" | "amber" | "red" | "neutral"; label: string }) {
	const tones = {
		emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
		amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
		red: "border-red-500/30 bg-red-500/10 text-red-300",
		neutral: "border-neutral-700 bg-neutral-800/60 text-neutral-400",
	};
	return (
		<span
			className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${tones[tone]}`}
		>
			{label}
		</span>
	);
}

const inputClass =
	"h-9 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-emerald-500/60";

const primaryBtn =
	"h-9 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-emerald-400";

const secondaryBtn =
	"h-9 rounded-lg border border-neutral-700 px-4 text-sm font-medium text-neutral-300 transition-colors hover:border-red-500/50 hover:text-red-300";

function ApplicationCard({ app, channel }: { app: AffiliateApplication; channel: string }) {
	// Guard the href at the sink too: only render the link for a valid http(s)
	// URL, so a hostile stored value can never become a clickable `javascript:`
	// link in this privileged console (defence in depth with the ingestion check).
	const websiteUrl = safeHttpUrl(app.website);
	return (
		<div className="bg-card/40 rounded-2xl border border-border p-5 sm:p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<h3 className="text-base font-semibold">{app.name}</h3>
					<p className="text-sm text-muted-foreground">
						<a href={`mailto:${app.email}`} className="hover:text-foreground">
							{app.email}
						</a>
						{websiteUrl && (
							<>
								{" · "}
								<a
									href={websiteUrl}
									target="_blank"
									rel="noopener noreferrer nofollow"
									className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
								>
									website
								</a>
							</>
						)}
						{app.social_media && <> · {app.social_media}</>}
					</p>
				</div>
				<span className="text-xs text-muted-foreground">{formatDate(app.created_at)}</span>
			</div>

			<p className="mt-3 whitespace-pre-wrap rounded-xl bg-neutral-900/50 px-4 py-3 text-sm leading-relaxed text-neutral-300">
				{app.promotion_plan}
			</p>

			<div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
				{/* Approve */}
				<form action={approveApplicationAction} className="flex flex-wrap items-end gap-2">
					<input type="hidden" name="channel" value={channel} />
					<input type="hidden" name="application_id" value={app.id} />
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
							Code
						</span>
						<input
							name="code"
							required
							placeholder="e.g. JOHN10"
							pattern="[a-zA-Z0-9_\-]{2,50}"
							className={`${inputClass} w-36 font-mono uppercase`}
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
							Commission %
						</span>
						<input
							name="rate_pct"
							required
							placeholder="10"
							inputMode="decimal"
							className={`${inputClass} w-24`}
						/>
					</label>
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
							Customer discount %
						</span>
						<input
							name="discount_pct"
							required
							placeholder="10"
							inputMode="decimal"
							className={`${inputClass} w-24`}
						/>
					</label>
					<button type="submit" className={primaryBtn}>
						Approve &amp; send code
					</button>
				</form>

				{/* Reject */}
				<form action={rejectApplicationAction} className="flex flex-wrap items-end gap-2">
					<input type="hidden" name="channel" value={channel} />
					<input type="hidden" name="application_id" value={app.id} />
					<label className="block">
						<span className="mb-1 block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
							Note (optional, sent to applicant)
						</span>
						<input name="notes" placeholder="Reason…" className={`${inputClass} w-56`} />
					</label>
					<button type="submit" className={secondaryBtn}>
						Reject
					</button>
				</form>
			</div>
		</div>
	);
}

function CommissionRow({
	c,
	channel,
}: {
	c: Commission & { affiliate_code?: string; affiliate_name?: string };
	channel: string;
}) {
	return (
		<tr className="bg-card/20">
			<td className="px-4 py-3">
				<span className="font-mono text-foreground">#{c.order_number}</span>
				<span className="ml-2 text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
			</td>
			<td className="px-4 py-3 font-mono text-emerald-400">{c.affiliate_code ?? c.affiliate_id}</td>
			<td className="px-4 py-3 text-right tabular-nums">{formatMoney(c.order_total, c.currency)}</td>
			<td className="px-4 py-3 text-right font-semibold tabular-nums">
				{formatMoney(c.commission_amount, c.currency)}
			</td>
			<td className="px-4 py-3">
				<StatusChip
					tone={c.status === "paid" ? "emerald" : c.status === "approved" ? "amber" : "neutral"}
					label={c.status}
				/>
				{c.status === "paid" && c.paid_at && (
					<span className="ml-2 text-xs text-muted-foreground">{formatDate(c.paid_at)}</span>
				)}
			</td>
			<td className="px-4 py-3 text-right">
				<div className="inline-flex gap-2">
					{c.status === "pending" && (
						<CommissionButton channel={channel} id={c.id} status="approved" label="Approve" />
					)}
					{c.status !== "paid" && (
						<CommissionButton channel={channel} id={c.id} status="paid" label="Mark paid" />
					)}
				</div>
			</td>
		</tr>
	);
}

function CommissionButton({
	channel,
	id,
	status,
	label,
}: {
	channel: string;
	id: number;
	status: string;
	label: string;
}) {
	return (
		<form action={setCommissionStatusAction}>
			<input type="hidden" name="channel" value={channel} />
			<input type="hidden" name="commission_id" value={id} />
			<input type="hidden" name="status" value={status} />
			<button
				type="submit"
				className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
			>
				{label}
			</button>
		</form>
	);
}

function AffiliateRow({ a, channel }: { a: AffiliateWithStats; channel: string }) {
	const ratePct = Math.round(a.commission_rate * 1000) / 10;
	return (
		<div className="bg-card/30 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border px-5 py-4">
			<div className="min-w-[10rem]">
				<p className="font-mono text-sm font-semibold text-emerald-400">{a.code}</p>
				<p className="text-xs text-muted-foreground">
					{a.name} · {a.email}
				</p>
			</div>
			<Stat label="Rate" value={`${ratePct}%`} />
			<Stat label="Orders" value={String(a.order_count)} />
			<Stat label="Pending" value={formatMoney(a.pending_amount, "USD")} />
			<Stat label="Approved" value={formatMoney(a.approved_amount, "USD")} />
			<Stat label="Paid" value={formatMoney(a.paid_amount, "USD")} />
			<div className="ml-auto flex items-center gap-3">
				{!a.active && <StatusChip tone="red" label="paused" />}
				<form action={toggleAffiliateActiveAction}>
					<input type="hidden" name="channel" value={channel} />
					<input type="hidden" name="affiliate_id" value={a.id} />
					<input type="hidden" name="active" value={String(!a.active)} />
					<button
						type="submit"
						className="rounded-md border border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
					>
						{a.active ? "Pause" : "Resume"}
					</button>
				</form>
			</div>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
			<p className="text-sm font-medium tabular-nums">{value}</p>
		</div>
	);
}

// ─── Helpers ───────────────────────────────────────────────────

function formatMoney(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
	} catch {
		return `${amount.toFixed(2)} ${currency}`;
	}
}

function formatDate(value: string | null): string {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}
