import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { buildPageMetadata, noIndexRobots } from "@/lib/seo";
import { lookupCoa } from "@/lib/coa/registry";
import { normalizeToken } from "@/lib/coa/token";
import { type CoaLabPdf, type PublicCoa, toPublicCoa } from "@/lib/coa/schema";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { CopyTokenButton } from "./copy-token-button";
import { VerifyPdfFile } from "./verify-pdf-file";

export const dynamic = "force-dynamic"; // never cache the rendered HTML — status flips matter

type Params = { channel: string; token: string };
// `via`, not `ref` — the middleware reserves ?ref= for affiliate capture and
// strips it from the URL with a redirect before the page would ever see it.
type SearchParams = { via?: string | string[] };
type PendingCoa = Extract<PublicCoa, { status: "pending" }>;
type SharedCoa = Extract<PublicCoa, { status: "shared" }>;
type PublishedCoa = Exclude<PublicCoa, PendingCoa | SharedCoa>;

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
	const { channel, token } = await props.params;
	const canonical = normalizeToken(token);
	const base = buildPageMetadata({
		title: canonical ? `Verify COA ${canonical} — InfinityBio Labs` : "Verify COA — InfinityBio Labs",
		description:
			"Authenticate the Certificate of Analysis for your InfinityBio Labs research compound. Token-bearer verification, no account required.",
		url: canonical ? `/${channel}/coa/${canonical}` : `/${channel}/coa`,
	});
	// COA pages are not for indexing — they exist for individual customers.
	return { ...base, robots: noIndexRobots };
}

export default async function CoaVerificationPage(props: {
	params: Promise<Params>;
	searchParams: Promise<SearchParams>;
}) {
	const { channel, token: rawToken } = await props.params;
	const { via } = await props.searchParams;
	// Customer arrived from the guided picker (/coa/find) that shared
	// mis-printed QR codes redirect to — their label's batch number is known
	// to be wrong, so swap the "must match your label" warning for an
	// explanation. Cosmetic only; spoofing the param changes nothing material.
	const viaLabelMisprint = via === "label-misprint";

	// 1) Reject malformed tokens early — generic 404 (no existence leak).
	const canonical = normalizeToken(rawToken);
	if (!canonical) notFound();

	// 2) Canonicalise the URL casing/dashes. If the user came via
	//    `/coa/a8k29f4rx1p7`, redirect them to `/coa/A8K2-9F4R-X1P7` so the
	//    URL bar matches what they'd share with someone else.
	if (canonical !== rawToken) {
		redirect(`/${channel}/coa/${canonical}`);
	}

	// 3) Look up the record server-side.
	//
	//    Rate-limiting policy (deliberate, see docs/coa-checker-spec.md §5):
	//      - Page renders go DIRECT to lookupCoa(), not via /api/coa/[token].
	//      - The API route's per-IP limit (10 req / 15 min) exists for
	//        *programmatic* abuse — someone scripting bulk lookups against
	//        our public endpoint.
	//      - The customer scan flow is rate-limited at the registry's nginx
	//        layer instead (~30 req/min/IP per the spec). Random 2^60 tokens
	//        already make enumeration infeasible; throttling page renders
	//        would only degrade legitimate customers refreshing the page.
	//      - If we ever want a single throttle covering both paths, extract
	//        a shared helper and call it from both — don't introduce a
	//        second limiter that confuses operators.
	const result = await lookupCoa(canonical);
	if (!result.ok) {
		switch (result.reason) {
			case "invalid_token":
			case "not_found":
				// The record does not exist → standard 404. No existence leak.
				notFound();
			case "registry_unavailable":
			case "invalid_record":
				// The record may exist but the registry is down or the JSON is
				// malformed. Surface a 500 so monitoring catches it instead of
				// silently telling the customer their COA "doesn't exist".
				throw new Error(`COA registry lookup failed (${result.reason}) for token ${canonical}`);
		}
	}

	const coa: PublicCoa = toPublicCoa(result.record);

	// Shared / mis-printed token (the same QR was printed on multiple
	// batches): never assert a single batch's authenticity here — send the
	// customer to the guided picker instead.
	if (coa.status === "shared") {
		redirect(`/${channel}/coa/find`);
	}

	if (coa.status === "pending") {
		return <PendingCoaPage coa={coa} />;
	}

	return (
		<section className="relative overflow-hidden bg-background text-foreground">
			{/* Ambient orbs (matches the rest of the brand) */}
			<div className="pointer-events-none absolute inset-0">
				<div className="bg-emerald-500/8 absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full blur-[150px]" />
				<div className="bg-teal-500/6 absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full blur-[150px]" />
			</div>

			<div className="relative mx-auto max-w-5xl px-6 py-16 sm:py-20">
				{/* Header */}
				<CoaHeader coa={coa} viaLabelMisprint={viaLabelMisprint} />

				{/* Status-driven body */}
				{coa.status === "recalled" ? (
					<RecallBanner coa={coa} />
				) : (
					<>
						{coa.status === "superseded" && <SupersededBanner coa={coa} />}
						<LabReports coa={coa} />
					</>
				)}

				{/* Footer */}
				<CoaFooter coa={coa} />
			</div>
		</section>
	);
}

function PendingCoaPage({ coa }: { coa: PendingCoa }) {
	return (
		<section className="relative overflow-hidden bg-background text-foreground">
			<div className="pointer-events-none absolute inset-0">
				<div className="bg-amber-500/8 absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full blur-[150px]" />
				<div className="bg-emerald-500/6 absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full blur-[150px]" />
			</div>

			<div className="relative mx-auto max-w-3xl px-6 py-16 sm:py-20">
				<div className="mb-8">
					<span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
						<svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								fillRule="evenodd"
								d="M10 1a9 9 0 100 18 9 9 0 000-18zm1 5a1 1 0 10-2 0v4a1 1 0 00.553.894l3 1.5a1 1 0 00.894-1.788L11 9.382V6z"
								clipRule="evenodd"
							/>
						</svg>
						COA pending
					</span>

					<h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
						Certificate of Analysis Pending
					</h1>

					<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
						This QR code is valid, but the lab-issued COA has not been published yet. Please check back before
						using this product for research.
					</p>
				</div>

				<div className="bg-card/40 grid gap-6 rounded-2xl border border-border p-5 sm:grid-cols-2 sm:p-6">
					<MetaCell label="Peptide" value={coa.peptideName} />
					{coa.batchNumber && <MetaCell label="Batch" value={coa.batchNumber} mono />}
					<div className="sm:col-span-2">
						<p className="text-[11px] font-medium uppercase tracking-[0.2em] text-amber-300">Token</p>
						<div className="mt-1 flex flex-wrap items-center gap-3">
							<p className="select-all break-all font-mono text-sm text-foreground">{coa.token}</p>
							<CopyTokenButton token={coa.token} />
						</div>
					</div>
				</div>

				<div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
					<p className="text-sm font-semibold text-amber-200">The COA is not ready yet.</p>
					<p className="mt-2 text-sm leading-relaxed text-amber-100/90">
						Once our team publishes the lab document, this same QR code will show the final Certificate of
						Analysis. The printed label does not need to change.
					</p>
				</div>

				<div className="mt-10 space-y-3 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
					<p>
						Something doesn&rsquo;t look right?{" "}
						<LinkWithChannel
							href="/contact"
							className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
						>
							Contact our team
						</LinkWithChannel>
						.
					</p>
				</div>
			</div>
		</section>
	);
}

// ─── Header ────────────────────────────────────────────────────

function CoaHeader({ coa, viaLabelMisprint }: { coa: PublishedCoa; viaLabelMisprint: boolean }) {
	const issuedAtLabel = formatIssuedAt(coa.issuedAt);

	return (
		<div className="mb-8 sm:mb-10">
			<div className="flex flex-wrap items-center gap-3">
				<span
					className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
						coa.status === "active"
							? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
							: coa.status === "superseded"
								? "border-amber-500/30 bg-amber-500/10 text-amber-400"
								: "border-red-500/30 bg-red-500/10 text-red-400"
					}`}
				>
					<svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						{coa.status === "active" ? (
							<path
								fillRule="evenodd"
								d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
								clipRule="evenodd"
							/>
						) : coa.status === "superseded" ? (
							<path
								fillRule="evenodd"
								d="M10 1a9 9 0 100 18 9 9 0 000-18zm0 4a1 1 0 011 1v4a1 1 0 11-2 0V6a1 1 0 011-1zm0 8a1 1 0 100 2 1 1 0 000-2z"
								clipRule="evenodd"
							/>
						) : (
							<path
								fillRule="evenodd"
								d="M10 1a9 9 0 100 18 9 9 0 000-18zM8.7 7.3a1 1 0 00-1.4 1.4L8.6 10l-1.3 1.3a1 1 0 101.4 1.4L10 11.4l1.3 1.3a1 1 0 101.4-1.4L11.4 10l1.3-1.3a1 1 0 10-1.4-1.4L10 8.6 8.7 7.3z"
								clipRule="evenodd"
							/>
						)}
					</svg>
					{coa.status === "active"
						? "Authentic COA"
						: coa.status === "superseded"
							? "Older COA"
							: "Recalled batch"}
				</span>
			</div>

			<h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
				Certificate of Analysis
			</h1>

			<div className="bg-card/40 mt-6 grid gap-6 rounded-2xl border border-border p-5 sm:grid-cols-3 sm:p-6">
				<MetaCell label="Peptide" value={coa.peptideName} />
				<MetaCell label="Batch" value={coa.batchNumber} mono />
				<MetaCell label="Issued" value={issuedAtLabel} />
				<div className="sm:col-span-3">
					<p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400">Token</p>
					<div className="mt-1 flex flex-wrap items-center gap-3">
						<p className="select-all break-all font-mono text-sm text-foreground">{coa.token}</p>
						<CopyTokenButton token={coa.token} />
					</div>
				</div>
			</div>

			{viaLabelMisprint ? (
				// Arrived via /coa/find: their label's printed batch number is known
				// to be wrong, so "must match your label" would contradict reality.
				<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
					<span className="font-semibold text-amber-300">About your label:</span> a printing error on a recent
					production run means the batch number printed on your vial may not match the batch shown above. The{" "}
					<span className="text-foreground">product name</span> on your label is the correct reference. If
					that doesn&rsquo;t match the peptide above, <span className="text-emerald-400">contact us</span>{" "}
					before using this product for research.
				</p>
			) : (
				<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
					If the peptide or batch above doesn&rsquo;t match the label on your vial,{" "}
					<span className="text-emerald-400">contact us</span> before using this product for research.
				</p>
			)}
		</div>
	);
}

function MetaCell({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
	return (
		<div>
			<p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400">{label}</p>
			<p className={`mt-1 text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
		</div>
	);
}

// ─── PDF embeds (one per lab report) ───────────────────────────

/**
 * A token can carry several lab reports via `pdfs[]` (e.g. dual-lab testing).
 * Top-level pdfUrl/pdfSha256 mirror pdfs[0] for backward compat — prefer the
 * array, fall back to the top-level fields when it's absent.
 */
function getLabPdfs(coa: PublishedCoa): CoaLabPdf[] {
	if (coa.pdfs?.length) return coa.pdfs;
	return [{ labName: coa.labName, pdfUrl: coa.pdfUrl, pdfSha256: coa.pdfSha256, issuedAt: coa.issuedAt }];
}

function LabReports({ coa }: { coa: PublishedCoa }) {
	const pdfs = getLabPdfs(coa);
	return (
		<div className="space-y-10">
			{pdfs.map((pdf) => (
				<PdfEmbed key={pdf.pdfUrl} coa={coa} pdf={pdf} multiple={pdfs.length > 1} />
			))}
		</div>
	);
}

function PdfEmbed({ coa, pdf, multiple }: { coa: PublishedCoa; pdf: CoaLabPdf; multiple: boolean }) {
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					{pdf.labName ? (
						<>
							Lab report by <span className="font-medium text-foreground">{pdf.labName}</span>
							{pdf.issuedAt && <> — issued {formatIssuedAt(pdf.issuedAt)}</>} for batch{" "}
							<span className="font-mono text-foreground">{coa.batchNumber}</span>.
						</>
					) : (
						<>
							Original lab document for batch{" "}
							<span className="font-mono text-foreground">{coa.batchNumber}</span>.
						</>
					)}
				</p>
				<a
					href={pdf.pdfUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
				>
					Download PDF
				</a>
			</div>
			<div className="bg-card/30 overflow-hidden rounded-2xl border border-border">
				<iframe
					title={`Certificate of Analysis — ${coa.peptideName}${pdf.labName ? ` (${pdf.labName})` : ""}`}
					src={pdf.pdfUrl}
					className={multiple ? "h-[70vh] w-full" : "h-[85vh] w-full"}
					// Most modern browsers honour this; mobile Safari ignores and shows
					// a preview which still renders fine. The Download PDF link above is
					// the reliable fallback.
					referrerPolicy="no-referrer"
				/>
			</div>

			{/* Integrity panel — optional, for users who want to confirm the
			    downloaded file is byte-identical to what the lab issued. Copy
			    written to be intelligible without a tech background; the actual
			    command is reserved for users who'll know what to do with it. */}
			<details className="bg-card/30 group rounded-xl border border-border p-4">
				<summary className="flex cursor-pointer items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
					<span>Confirm this PDF is the original{pdf.labName ? ` (${pdf.labName})` : ""}</span>
					<svg
						className="h-3 w-3 transition-transform group-open:rotate-180"
						viewBox="0 0 12 12"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M3 4.5L6 7.5L9 4.5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</summary>
				<div className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
					<p>
						Each lab report has a unique &ldquo;digital fingerprint&rdquo; — like a tamper-evident seal. If
						even one character of the PDF changes, the fingerprint changes too. We published this fingerprint
						the day the report was issued:
					</p>
					<p className="bg-secondary/60 select-all break-all rounded-md px-3 py-2 font-mono text-foreground">
						{pdf.pdfSha256}
					</p>
					<p>
						Download the PDF, then check the file you have matches — right here in your browser (nothing is
						uploaded):
					</p>
					<VerifyPdfFile expectedSha256={pdf.pdfSha256} />
					<p>Or from a terminal:</p>
					<ul className="space-y-1.5 pl-4">
						<li>
							<span className="text-foreground">Mac or Linux:</span> open Terminal, run{" "}
							<code className="font-mono text-foreground">shasum -a 256 your-coa.pdf</code>
						</li>
						<li>
							<span className="text-foreground">Windows:</span> open PowerShell, run{" "}
							<code className="font-mono text-foreground">Get-FileHash your-coa.pdf -Algorithm SHA256</code>
						</li>
					</ul>
					<p>
						The output should be the same string as above. If it isn&rsquo;t,{" "}
						<span className="text-foreground">stop using the file and contact us</span> — the copy you have
						isn&rsquo;t the one we issued.
					</p>
				</div>
			</details>
		</div>
	);
}

// ─── Banners ───────────────────────────────────────────────────

function RecallBanner({ coa }: { coa: Extract<PublishedCoa, { status: "recalled" }> }) {
	return (
		<div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 sm:p-8">
			<div className="flex items-start gap-4">
				<svg
					className="mt-1 h-7 w-7 shrink-0 text-red-400"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.8}
					aria-hidden="true"
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
					<path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
				</svg>
				<div className="flex-1">
					<h2 className="text-xl font-bold text-red-300">This batch was recalled</h2>
					<p className="mt-2 text-sm leading-relaxed text-red-200">
						Do not use this product. Below is the reason on file from our QA team:
					</p>
					{coa.recallReason && (
						<p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
							{coa.recallReason}
						</p>
					)}
					<p className="mt-4 text-sm text-red-200">
						Please contact us immediately so we can arrange a replacement or refund.
					</p>
				</div>
			</div>
		</div>
	);
}

function SupersededBanner({ coa }: { coa: Extract<PublishedCoa, { status: "superseded" }> }) {
	return (
		<div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
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
				<div className="flex-1">
					<p className="text-sm font-semibold text-amber-300">A newer COA exists for this batch.</p>
					<p className="mt-1 text-xs text-amber-200">
						This document is still authentic, but the lab has since issued an updated audit.
					</p>
					{coa.supersededByToken && (
						<LinkWithChannel
							href={`/coa/${coa.supersededByToken}`}
							className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/30 hover:text-amber-100"
						>
							View latest COA →
						</LinkWithChannel>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Footer ────────────────────────────────────────────────────

function CoaFooter({ coa }: { coa: PublishedCoa }) {
	return (
		<div className="mt-10 space-y-3 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
			<p>
				{coa.labName ? (
					<>
						Issued by <span className="text-foreground">{coa.labName}</span> on{" "}
						<span className="text-foreground">{formatIssuedAt(coa.issuedAt)}</span>.
					</>
				) : (
					<>
						Issued on <span className="text-foreground">{formatIssuedAt(coa.issuedAt)}</span>.
					</>
				)}{" "}
				This document is provided strictly for in-vitro research use only. InfinityBio Labs products are not
				for human or veterinary therapeutic application.
			</p>
			<p>
				Something doesn&rsquo;t look right?{" "}
				<LinkWithChannel
					href="/contact"
					className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
				>
					Contact our team
				</LinkWithChannel>{" "}
				or{" "}
				<LinkWithChannel
					href="/coa"
					className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
				>
					verify a different token
				</LinkWithChannel>
				.
			</p>
		</div>
	);
}

// ─── Helpers ───────────────────────────────────────────────────

function formatIssuedAt(iso: string): string {
	try {
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return iso;
		return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
	} catch {
		return iso;
	}
}
