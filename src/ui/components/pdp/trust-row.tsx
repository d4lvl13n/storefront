import Link from "next/link";
import { Truck, Calculator } from "lucide-react";
import { type ReactNode } from "react";

interface TrustRowProps {
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
 * Slim reassurance strip in the buy box: cold-chain shipping speed and the
 * reconstitution calculator. (The Certificate of Analysis now lives in its own
 * Quality & Verification section below the fold.)
 */
export function PdpTrustRow({ channel }: TrustRowProps) {
	return (
		<div className="grid grid-cols-2 gap-2" aria-label="Product trust signals">
			<MiniTile icon={<Truck className="h-4 w-4" />} title="Ships in 24h" subtitle="Cold-chain" />
			<MiniTile
				icon={<Calculator className="h-4 w-4" />}
				title="Reconstitution"
				subtitle="Calculator"
				href={`/${channel}/peptide-calculator`}
			/>
		</div>
	);
}
