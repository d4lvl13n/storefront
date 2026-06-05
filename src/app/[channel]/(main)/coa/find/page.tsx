import type { Metadata } from "next";

import { buildPageMetadata, noIndexRobots } from "@/lib/seo";
import { fetchCoaIndex } from "@/lib/coa/registry";
import { type CoaIndexEntry } from "@/lib/coa/schema";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

export const dynamic = "force-dynamic"; // recall flips must reach the picker immediately

/**
 * Guided COA lookup — the landing page for shared/mis-printed QR codes.
 *
 * A label printing error put the same QR code (and batch number) on every
 * product of a production run, so the scanned token can't identify a single
 * batch. Tokens flipped to `status: "shared"` in the registry redirect here;
 * the customer picks the product named on their vial and lands on the real
 * per-token verification page.
 *
 * Deliberately additive: correctly printed labels resolve straight to
 * `/coa/<token>` and never see this page.
 */

type Params = { channel: string };

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
	const { channel } = await props.params;
	const base = buildPageMetadata({
		title: "Find your Certificate of Analysis — InfinityBio Labs",
		description:
			"Select your InfinityBio Labs product to view the Certificate of Analysis for its production batch.",
		url: `/${channel}/coa/find`,
	});
	return { ...base, robots: noIndexRobots };
}

export default async function CoaFindPage(props: { params: Promise<Params> }) {
	await props.params;

	const result = await fetchCoaIndex();
	const groups = result.ok ? groupByPeptide(result.index.entries) : null;

	return (
		<section className="relative overflow-hidden bg-background text-foreground">
			{/* Ambient orbs (matches the rest of the brand) */}
			<div className="pointer-events-none absolute inset-0">
				<div className="bg-emerald-500/8 absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full blur-[150px]" />
				<div className="bg-teal-500/6 absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full blur-[150px]" />
			</div>

			<div className="relative mx-auto max-w-3xl px-6 py-16 sm:py-20">
				<div className="mb-8 text-center">
					<p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
						Certificates of Analysis
					</p>
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						Find your Certificate of Analysis
					</h1>
					<p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
						Select the product named on your vial label to view the lab report for its production batch.
					</p>
				</div>

				{/* Honest disclosure — why this QR shows a list instead of one COA. */}
				<div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
					<div className="flex items-start gap-3">
						<svg
							className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M10 1a9 9 0 100 18 9 9 0 000-18zm0 4a1 1 0 011 1v4a1 1 0 11-2 0V6a1 1 0 011-1zm0 8a1 1 0 100 2 1 1 0 000-2z"
								clipRule="evenodd"
							/>
						</svg>
						<div className="flex-1 text-sm leading-relaxed">
							<p className="font-semibold text-amber-300">Why am I seeing a list?</p>
							<p className="mt-1 text-amber-100/90">
								A printing error on a recent production run placed the same QR code and batch number on
								several different products. The <span className="font-semibold">product name</span> printed on
								your vial is the correct reference — select it below to view the Certificate of Analysis for
								its actual production batch.
							</p>
						</div>
					</div>
				</div>

				{/* Product / batch picker */}
				{groups && groups.length > 0 ? (
					<ul className="space-y-4">
						{groups.map(([peptideName, entries]) => (
							<li key={peptideName} className="bg-card/40 rounded-2xl border border-border p-5 sm:p-6">
								<h2 className="text-lg font-semibold tracking-tight text-foreground">{peptideName}</h2>
								<ul className="divide-border/60 mt-3 divide-y">
									{entries.map((entry) => (
										<li key={entry.token}>
											{/* `via`, not `ref` — the middleware reserves ?ref= for affiliate
											    capture and strips it with a redirect. */}
											<LinkWithChannel
												href={`/coa/${entry.token}?via=label-misprint`}
												className="group flex flex-wrap items-center gap-x-4 gap-y-1 py-3 transition-colors"
											>
												<span className="font-mono text-sm text-foreground">Batch {entry.batchNumber}</span>
												{entry.issuedAt && (
													<span className="text-xs text-muted-foreground">
														Issued {formatIssuedAt(entry.issuedAt)}
													</span>
												)}
												<StatusChip status={entry.status} />
												<span className="ml-auto text-sm font-medium text-emerald-400 transition-colors group-hover:text-emerald-300">
													View COA →
												</span>
											</LinkWithChannel>
										</li>
									))}
								</ul>
							</li>
						))}
					</ul>
				) : (
					<UnavailableNotice />
				)}

				{/* Footer */}
				<div className="mt-10 space-y-3 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
					<p>
						Don&rsquo;t see your product, or unsure which batch you have?{" "}
						<LinkWithChannel
							href="/contact"
							className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
						>
							Contact our team
						</LinkWithChannel>{" "}
						with a photo of your vial label and your order number — we&rsquo;ll send you the verification link
						directly.
					</p>
					<p>
						Have a verification code from a newer label?{" "}
						<LinkWithChannel
							href="/coa"
							className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
						>
							Enter it here
						</LinkWithChannel>
						.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Pieces ────────────────────────────────────────────────────

function StatusChip({ status }: { status: CoaIndexEntry["status"] }) {
	const styles: Record<CoaIndexEntry["status"], { label: string; className: string }> = {
		active: { label: "Verified", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
		pending: { label: "Pending", className: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
		superseded: { label: "Updated", className: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
		recalled: { label: "Recalled", className: "border-red-500/30 bg-red-500/10 text-red-400" },
	};
	const { label, className } = styles[status];
	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${className}`}
		>
			{label}
		</span>
	);
}

function UnavailableNotice() {
	return (
		<div className="bg-card/40 rounded-2xl border border-border p-6 text-center sm:p-8">
			<p className="text-sm font-semibold text-foreground">
				The COA directory isn&rsquo;t available right now.
			</p>
			<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
				Please try again in a few minutes, or{" "}
				<LinkWithChannel
					href="/contact"
					className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
				>
					contact our team
				</LinkWithChannel>{" "}
				with a photo of your vial label — we&rsquo;ll get you the right COA.
			</p>
		</div>
	);
}

// ─── Helpers ───────────────────────────────────────────────────

/** Group entries by peptide (alphabetical), newest batch first within each. */
function groupByPeptide(entries: CoaIndexEntry[]): Array<[string, CoaIndexEntry[]]> {
	const map = new Map<string, CoaIndexEntry[]>();
	for (const entry of entries) {
		const group = map.get(entry.peptideName);
		if (group) {
			group.push(entry);
		} else {
			map.set(entry.peptideName, [entry]);
		}
	}
	for (const group of map.values()) {
		group.sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""));
	}
	return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function formatIssuedAt(iso: string): string {
	try {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return iso;
		return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
	} catch {
		return iso;
	}
}
