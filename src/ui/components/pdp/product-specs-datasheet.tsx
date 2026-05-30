import { Dna } from "lucide-react";
import { CopyButton } from "./copy-button";

interface Attribute {
	name: string;
	value: string | string[];
}

function formatValue(value: string | string[]): string {
	return Array.isArray(value) ? value.join(", ") : value;
}

/**
 * Lab-data datasheet for the PDP.
 *
 * Promotes the high-signal specs out of the flat accordion into an always-
 * visible "Specifications" panel styled in the storefront's scientific
 * language (mono labels, emerald accents), with the amino-acid sequence
 * surfaced as a dedicated copy-able card.
 */
export function ProductSpecsDatasheet({ attributes }: { attributes: Attribute[] }) {
	const sequenceAttr = attributes.find((a) => a.name.toLowerCase() === "sequence");
	const sequence = sequenceAttr ? formatValue(sequenceAttr.value) : null;
	const specs = attributes.filter((a) => a.name.toLowerCase() !== "sequence");

	if (specs.length === 0 && !sequence) return null;

	return (
		<div className="bg-card/50 rounded-2xl border border-border p-5">
			<div className="mb-4 flex items-center gap-2">
				<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
				<h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					Specifications
				</h2>
			</div>

			{specs.length > 0 && (
				<dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
					{specs.map((spec) => (
						<div
							key={spec.name}
							className="border-border/50 flex flex-col gap-0.5 border-b pb-2.5 last:border-b-0"
						>
							<dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
								{spec.name}
							</dt>
							<dd className="font-mono text-sm font-medium text-foreground">{formatValue(spec.value)}</dd>
						</div>
					))}
				</dl>
			)}

			{sequence && (
				<div className="mt-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
					<div className="mb-2 flex items-center justify-between gap-3">
						<span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
							<Dna className="h-3.5 w-3.5" />
							Sequence
						</span>
						<CopyButton value={sequence} />
					</div>
					<p className="break-all font-mono text-sm leading-relaxed text-foreground">{sequence}</p>
				</div>
			)}
		</div>
	);
}
