"use client";

import {
	type CalculatorInputs,
	type CalculatorResult,
	SYRINGE_TYPES,
	formatDose,
} from "@/lib/peptide-calculator";

export interface HistoryEntry {
	id: string;
	timestamp: number;
	inputs: CalculatorInputs;
	result: CalculatorResult;
	summary: string;
}

interface HistoryViewProps {
	entries: HistoryEntry[];
	onClear: () => void;
}

export function HistoryView({ entries, onClear }: HistoryViewProps) {
	if (entries.length === 0) {
		return (
			<div className="mx-auto max-w-2xl">
				<div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="mb-3 text-muted-foreground"
					>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					<p className="text-sm text-muted-foreground">No calculations yet this session.</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Results will appear here as you use the calculator.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-foreground">Recent Calculations</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Session only — history clears when you close this page.
					</p>
				</div>
				<button
					type="button"
					onClick={onClear}
					className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
				>
					Clear All
				</button>
			</div>

			<div className="space-y-3">
				{entries.map((entry) => {
					const syringe = SYRINGE_TYPES[entry.inputs.syringeIndex];
					const time = new Date(entry.timestamp);
					const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

					return (
						<div key={entry.id} className="rounded-2xl border border-border bg-card p-5">
							<div className="mb-3 flex items-center justify-between">
								<div className="flex flex-wrap gap-1.5">
									<Tag>{formatDose(entry.inputs.peptideAmount, entry.inputs.peptideUnit)}</Tag>
									<Tag>{entry.inputs.waterVolume} mL</Tag>
									<Tag>{formatDose(entry.inputs.doseAmount, entry.inputs.doseUnit)}</Tag>
									<Tag>{syringe?.label}</Tag>
								</div>
								<span className="text-xs text-muted-foreground">{timeStr}</span>
							</div>

							<div className="flex items-baseline justify-between">
								<span className="text-sm text-muted-foreground">Draw</span>
								<span className="font-mono text-lg font-semibold text-emerald-400">
									{entry.result.drawVolumeMl.toFixed(3)} mL ={" "}
									{Number.isInteger(entry.result.syringeUnits)
										? entry.result.syringeUnits
										: entry.result.syringeUnits.toFixed(1)}{" "}
									units
								</span>
							</div>

							<p className="mt-2 text-xs leading-relaxed text-muted-foreground">{entry.result.instruction}</p>

							<button
								type="button"
								onClick={async () => {
									await navigator.clipboard.writeText(entry.summary);
								}}
								className="mt-3 text-xs text-muted-foreground hover:text-foreground"
							>
								Copy full result
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function Tag({ children }: { children: React.ReactNode }) {
	return <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{children}</span>;
}
