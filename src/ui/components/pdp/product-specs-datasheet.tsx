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
 * Lab-data datasheet (bare).
 *
 * Renders the spec grid + a copy-able amino-acid sequence card with no outer
 * chrome — it lives inside a <PdpSection label="Lab data" title="Specifications">
 * which supplies the heading and spacing.
 */
export function ProductSpecsDatasheet({ attributes }: { attributes: Attribute[] }) {
	const sequenceAttr = attributes.find((a) => a.name.toLowerCase() === "sequence");
	const sequence = sequenceAttr ? formatValue(sequenceAttr.value) : null;
	const specs = attributes.filter((a) => a.name.toLowerCase() !== "sequence");

	if (specs.length === 0 && !sequence) return null;

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-8">
			{specs.length > 0 && (
				<dl className="grid grid-cols-1 gap-x-12 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
					{specs.map((spec) => (
						<div key={spec.name} className="border-border/50 flex flex-col gap-1 border-b pb-3">
							<dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
								{spec.name}
							</dt>
							<dd className="font-mono text-sm font-medium text-foreground">{formatValue(spec.value)}</dd>
						</div>
					))}
				</dl>
			)}

			{sequence && (
				<div className="mx-auto w-full rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4 sm:max-w-2xl">
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
