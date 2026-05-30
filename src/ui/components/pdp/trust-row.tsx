import Link from "next/link";
import { Beaker, FileCheck, Truck, Calculator, ArrowUpRight, ShieldCheck } from "lucide-react";
import { type ReactNode } from "react";

interface TrustRowProps {
	purity?: string | null;
	coaUrl?: string | null;
	lotNumber?: string | null;
	channel: string;
}

function MiniTile({
	icon,
	title,
	subtitle,
	href,
}: {
	icon: ReactNode;
	title: string;
	subtitle: string;
	href?: string;
}) {
	const inner = (
		<>
			<span className="text-emerald-400">{icon}</span>
			<span className="min-w-0">
				<span className="block truncate font-semibold text-foreground">{title}</span>
				<span className="block truncate text-[10px] uppercase tracking-wide text-muted-foreground">
					{subtitle}
				</span>
			</span>
		</>
	);

	const className =
		"flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2.5 py-2 text-xs transition-colors";

	if (href) {
		return (
			<Link href={href} className={`${className} hover:border-emerald-500/30 hover:bg-emerald-500/[0.06]`}>
				{inner}
			</Link>
		);
	}
	return <div className={className}>{inner}</div>;
}

/**
 * High-trust signal block rendered in the PDP buy box.
 *
 * The Certificate of Analysis is the single most important trust artefact for
 * research peptides, so it is promoted to a prominent proof bar; purity,
 * cold-chain shipping and the reconstitution calculator sit underneath as
 * supporting tiles.
 */
export function PdpTrustRow({ purity, coaUrl, lotNumber, channel }: TrustRowProps) {
	const resolvedCoa = coaUrl || "/sample-coa.pdf";
	const lotLabel = lotNumber ? `Lot ${lotNumber}` : "Per-batch tested";

	return (
		<div className="space-y-2" aria-label="Product trust signals">
			{/* COA proof bar — the headline trust element */}
			<a
				href={resolvedCoa}
				target="_blank"
				rel="noopener noreferrer"
				className="group flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/[0.1]"
			>
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
					<FileCheck className="h-5 w-5" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block text-sm font-semibold text-foreground">Certificate of Analysis</span>
					<span className="block truncate text-xs text-muted-foreground">
						Independently HPLC-verified · {lotLabel}
					</span>
				</span>
				<span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-400">
					View PDF
					<ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
				</span>
			</a>

			{/* Supporting tiles */}
			<div className="grid grid-cols-3 gap-2">
				{purity ? (
					<MiniTile icon={<Beaker className="h-4 w-4" />} title={purity} subtitle="HPLC purity" />
				) : (
					<MiniTile
						icon={<ShieldCheck className="h-4 w-4" />}
						title="Research-grade"
						subtitle="Lab verified"
					/>
				)}
				<MiniTile icon={<Truck className="h-4 w-4" />} title="Ships in 24h" subtitle="Cold-chain" />
				<MiniTile
					icon={<Calculator className="h-4 w-4" />}
					title="Reconstitution"
					subtitle="Calculator"
					href={`/${channel}/peptide-calculator`}
				/>
			</div>
		</div>
	);
}
