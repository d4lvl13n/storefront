import Link from "next/link";
import { Beaker, FileCheck, Truck, Calculator } from "lucide-react";

interface TrustRowProps {
	purity?: string | null;
	coaUrl?: string | null;
	lotNumber?: string | null;
	channel: string;
}

/**
 * High-trust signal row rendered just above the Add-to-Cart button on the PDP.
 * For a research-peptide category, surfacing Purity %, per-lot COA and the
 * reconstitution calculator above the fold is the single highest-impact
 * conversion move.
 */
export function PdpTrustRow({ purity, coaUrl, lotNumber, channel }: TrustRowProps) {
	const resolvedCoa = coaUrl || "/sample-coa.pdf";
	const coaLabel = lotNumber ? `COA · Lot ${lotNumber}` : "Certificate of Analysis";

	return (
		<div
			className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 text-xs sm:grid-cols-4"
			aria-label="Product trust signals"
		>
			{purity && (
				<div className="flex items-center gap-2 px-1">
					<Beaker className="h-4 w-4 shrink-0 text-emerald-400" />
					<div className="min-w-0">
						<p className="font-semibold text-foreground">{purity}</p>
						<p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">HPLC purity</p>
					</div>
				</div>
			)}

			<a
				href={resolvedCoa}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-emerald-500/10"
			>
				<FileCheck className="h-4 w-4 shrink-0 text-emerald-400" />
				<div className="min-w-0">
					<p className="truncate font-semibold text-foreground">{coaLabel}</p>
					<p className="text-[10px] uppercase tracking-wide text-emerald-400">View PDF</p>
				</div>
			</a>

			<div className="flex items-center gap-2 px-1">
				<Truck className="h-4 w-4 shrink-0 text-emerald-400" />
				<div className="min-w-0">
					<p className="font-semibold text-foreground">Ships in 24h</p>
					<p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">Cold-chain</p>
				</div>
			</div>

			<Link
				href={`/${channel}/peptide-calculator`}
				className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-emerald-500/10"
			>
				<Calculator className="h-4 w-4 shrink-0 text-emerald-400" />
				<div className="min-w-0">
					<p className="truncate font-semibold text-foreground">Reconstitution</p>
					<p className="text-[10px] uppercase tracking-wide text-emerald-400">Open calculator</p>
				</div>
			</Link>
		</div>
	);
}
