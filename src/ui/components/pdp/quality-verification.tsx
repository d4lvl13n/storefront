import { FileCheck, ArrowUpRight } from "lucide-react";

interface QualityVerificationProps {
	purity?: string | null;
	storage?: string | null;
	coaUrl?: string | null;
	lotNumber?: string | null;
	references?: string[] | null;
}

const METHOD_TAGS = ["HPLC-UV", "LC-MS", "LAL assay", "Visual ID"];

/**
 * Quality & Verification section content.
 *
 * Re-homes the COA — promoted from the old buy-box link to a proper download
 * CTA — alongside the headline QA facts (purity, identity, storage, release)
 * and the research references, styled in the storefront's scientific language.
 */
export function QualityVerification({
	purity,
	storage,
	coaUrl,
	lotNumber,
	references,
}: QualityVerificationProps) {
	const resolvedCoa = coaUrl || "/sample-coa.pdf";
	const lotLabel = lotNumber ? `Lot ${lotNumber}` : "Per-batch tested";

	const facts = [
		purity ? { label: "Purity (HPLC)", value: purity } : null,
		{ label: "Identity", value: "Confirmed (LC-MS)" },
		storage ? { label: "Storage", value: storage } : null,
		{ label: "Release", value: "Independently tested" },
	].filter((f): f is { label: string; value: string } => f !== null);

	return (
		<div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
			{/* Left: facts + methods + COA download */}
			<div className="bg-card/50 rounded-2xl border border-border p-6">
				<dl className="grid grid-cols-2 gap-x-8 gap-y-4">
					{facts.map((fact) => (
						<div key={fact.label} className="border-border/50 flex flex-col gap-1 border-b pb-3">
							<dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
								{fact.label}
							</dt>
							<dd className="font-mono text-sm font-medium text-foreground">{fact.value}</dd>
						</div>
					))}
				</dl>

				<div className="mt-5 flex flex-wrap gap-2">
					{METHOD_TAGS.map((method) => (
						<span
							key={method}
							className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300"
						>
							{method}
						</span>
					))}
				</div>

				<a
					href={resolvedCoa}
					target="_blank"
					rel="noopener noreferrer"
					className="group mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
				>
					<FileCheck className="h-4 w-4" />
					Download Certificate of Analysis
					<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
				</a>
				<p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
					{lotLabel}
				</p>
			</div>

			{/* Right: research references */}
			{references && references.length > 0 && (
				<div>
					<h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
						Research references
					</h3>
					<ol className="grid gap-3">
						{references.map((ref, i) => (
							<li key={i} className="flex gap-3 text-xs leading-relaxed text-muted-foreground">
								<span className="font-mono text-emerald-400">[{i + 1}]</span>
								<span>{ref}</span>
							</li>
						))}
					</ol>
				</div>
			)}
		</div>
	);
}
