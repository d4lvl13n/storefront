"use client";

import { useState, useCallback, useEffect } from "react";
import {
	type CalculatorInputs,
	type CalculatorResult,
	type Warning,
	SYRINGE_TYPES,
	PEPTIDE_PRESETS,
	WATER_PRESETS,
	calculate,
	formatDose,
	formatResultSummary,
	formatVolume,
	formatUnitsDisplay,
} from "@/lib/peptide-calculator";

interface HistoryEntry {
	id: string;
	timestamp: number;
	inputs: CalculatorInputs;
	result: CalculatorResult;
	summary: string;
}

interface CalculatorViewProps {
	onCalculation?: (entry: HistoryEntry) => void;
}

const DEFAULT_INPUTS: CalculatorInputs = {
	peptideAmount: 5,
	peptideUnit: "mg",
	waterVolume: 2,
	waterUnit: "mL",
	doseAmount: 250,
	doseUnit: "mcg",
	syringeIndex: 2, // 1 mL
	vialCount: 1,
};

export function CalculatorView({ onCalculation }: CalculatorViewProps) {
	const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
	const [showFormula, setShowFormula] = useState(false);
	const [copied, setCopied] = useState(false);
	const [showExact, setShowExact] = useState(false);

	const output = calculate(inputs);

	const update = useCallback(<K extends keyof CalculatorInputs>(field: K, value: CalculatorInputs[K]) => {
		setInputs((prev) => ({ ...prev, [field]: value }));
	}, []);

	// Notify parent of successful calculations
	useEffect(() => {
		if (output.result && onCalculation) {
			const entry: HistoryEntry = {
				id: crypto.randomUUID(),
				timestamp: Date.now(),
				inputs: { ...inputs },
				result: output.result,
				summary: formatResultSummary(inputs, output.result),
			};
			onCalculation(entry);
		}
		// Only fire when result changes meaningfully
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [output.result?.drawVolumeMl, output.result?.syringeUnits]);

	const handleCopy = useCallback(async () => {
		if (!output.result) return;
		const text = formatResultSummary(inputs, output.result);
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [inputs, output.result]);

	// Separate errors from cautions for field-level display
	const fieldErrors = new Map<string, string>();
	for (const w of output.warnings) {
		if (w.level === "error" && w.field) {
			fieldErrors.set(w.field, w.message);
		}
	}

	return (
		<div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
			{/* Input Card */}
			<div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
				<h2 className="mb-6 text-lg font-semibold text-white">Inputs</h2>

				{/* Peptide Amount */}
				<FieldGroup label="Peptide Amount" error={fieldErrors.get("peptideAmount")}>
					<div className="flex gap-2">
						<div className="flex-1">
							<NumberInput
								value={inputs.peptideAmount}
								onChange={(v) => update("peptideAmount", v)}
								placeholder="e.g. 5"
								hasError={fieldErrors.has("peptideAmount")}
							/>
						</div>
						<UnitToggle
							options={["mg", "mcg"]}
							value={inputs.peptideUnit}
							onChange={(v) => update("peptideUnit", v as "mg" | "mcg")}
						/>
					</div>
					<PresetRow
						values={PEPTIDE_PRESETS as unknown as number[]}
						unit="mg"
						active={inputs.peptideUnit === "mg" ? inputs.peptideAmount : null}
						onSelect={(v) => {
							update("peptideAmount", v);
							update("peptideUnit", "mg");
						}}
					/>
				</FieldGroup>

				{/* BAC Water Volume */}
				<FieldGroup label="BAC Water Volume" error={fieldErrors.get("waterVolume")}>
					<div className="flex gap-2">
						<div className="flex-1">
							<NumberInput
								value={inputs.waterVolume}
								onChange={(v) => update("waterVolume", v)}
								placeholder="e.g. 2"
								hasError={fieldErrors.has("waterVolume")}
							/>
						</div>
						<span className="flex items-center rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-300">
							mL
						</span>
					</div>
					<PresetRow
						values={WATER_PRESETS as unknown as number[]}
						unit="mL"
						active={inputs.waterVolume}
						onSelect={(v) => update("waterVolume", v)}
					/>
				</FieldGroup>

				{/* Desired Dose */}
				<FieldGroup label="Desired Dose" error={fieldErrors.get("doseAmount")}>
					<div className="flex gap-2">
						<div className="flex-1">
							<NumberInput
								value={inputs.doseAmount}
								onChange={(v) => update("doseAmount", v)}
								placeholder="e.g. 250"
								hasError={fieldErrors.has("doseAmount")}
							/>
						</div>
						<UnitToggle
							options={["mcg", "mg"]}
							value={inputs.doseUnit}
							onChange={(v) => update("doseUnit", v as "mg" | "mcg")}
						/>
					</div>
				</FieldGroup>

				{/* Syringe Type */}
				<FieldGroup
					label="Syringe Type"
					error={fieldErrors.get("syringeIndex")}
					hint="U-100 insulin syringes. 1 unit = 0.01 mL."
				>
					<div className="grid grid-cols-3 gap-2">
						{SYRINGE_TYPES.map((s, i) => (
							<button
								key={s.label}
								type="button"
								onClick={() => update("syringeIndex", i)}
								className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
									inputs.syringeIndex === i
										? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
										: "border-neutral-700 bg-neutral-800 text-neutral-200 hover:border-neutral-600"
								}`}
							>
								{s.capacityMl} mL
							</button>
						))}
					</div>
				</FieldGroup>

				{/* Vial Count */}
				<FieldGroup label="Number of Vials" last>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => update("vialCount", Math.max(1, inputs.vialCount - 1))}
							className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 transition-colors hover:border-neutral-600"
						>
							-
						</button>
						<span className="min-w-[2ch] text-center text-lg font-semibold text-white">
							{inputs.vialCount}
						</span>
						<button
							type="button"
							onClick={() => update("vialCount", Math.min(3, inputs.vialCount + 1))}
							className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 transition-colors hover:border-neutral-600"
						>
							+
						</button>
					</div>
				</FieldGroup>
			</div>

			{/* Results Card — sticky on desktop */}
			<div className="lg:sticky lg:top-24">
				{/* Caution-level warnings (non-blocking) */}
				{output.warnings.filter((w) => w.level === "caution").length > 0 && (
					<div className="mb-4 space-y-2">
						{output.warnings
							.filter((w) => w.level === "caution")
							.map((w, i) => (
								<WarningBanner key={i} warning={w} />
							))}
					</div>
				)}

				{output.result ? (
					<div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6 sm:p-8">
						{/* Input recap */}
						<div className="mb-5 flex flex-wrap gap-2 text-xs text-neutral-300">
							<span className="rounded bg-neutral-800 px-2 py-1">
								{formatDose(inputs.peptideAmount, inputs.peptideUnit)}
							</span>
							<span className="rounded bg-neutral-800 px-2 py-1">{inputs.waterVolume} mL BAC water</span>
							<span className="rounded bg-neutral-800 px-2 py-1">
								{formatDose(inputs.doseAmount, inputs.doseUnit)} dose
							</span>
							<span className="rounded bg-neutral-800 px-2 py-1">
								{SYRINGE_TYPES[inputs.syringeIndex]?.label}
							</span>
						</div>

						<h2 className="mb-6 text-lg font-semibold text-white">Results</h2>

						<div className="space-y-4">
							<ResultRow
								label="Concentration"
								value={`${output.result.concentrationMgMl.toFixed(2)} mg/mL`}
								sub={`${output.result.concentrationMcgMl.toFixed(0)} mcg/mL`}
							/>
							<ResultRow
								label="Draw Volume"
								value={`${formatVolume(output.result.drawVolumeMl, showExact ? "exact" : "rounded")} mL`}
								highlight
							/>
							<ResultRow
								label={`Syringe Units (${
									SYRINGE_TYPES[inputs.syringeIndex]?.label.includes("U-100") ? "U-100" : "U-100"
								})`}
								value={`${formatUnitsDisplay(
									output.result.syringeUnits,
									showExact ? "exact" : "rounded",
								)} units`}
								highlight
							/>
							<ResultRow label="Doses per Vial" value={`${Math.floor(output.result.dosesPerVial)} doses`} />
						</div>

						{/* Precision toggle */}
						<button
							type="button"
							onClick={() => setShowExact(!showExact)}
							className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-200"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="11" cy="11" r="8" />
								<path d="m21 21-4.3-4.3" />
							</svg>
							{showExact ? "Show rounded values" : "Show exact values"}
						</button>

						{/* Human-readable instruction */}
						<div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
							<p className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-400/70">
								Instructions
							</p>
							<p className="text-sm leading-relaxed text-emerald-100">{output.result.instruction}</p>
						</div>

						{/* Copy button */}
						<button
							type="button"
							onClick={handleCopy}
							className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm text-neutral-200 transition-colors hover:border-neutral-600 hover:text-white"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
								<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
							</svg>
							{copied ? "Copied!" : "Copy Result"}
						</button>

						{/* Formula drawer */}
						<button
							type="button"
							onClick={() => setShowFormula(!showFormula)}
							className="mt-3 flex w-full items-center justify-between text-sm text-neutral-400 hover:text-neutral-200"
						>
							<span>How is this calculated?</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className={`transition-transform ${showFormula ? "rotate-180" : ""}`}
							>
								<path d="m6 9 6 6 6-6" />
							</svg>
						</button>
						<div
							className={`grid transition-[grid-template-rows] duration-300 ${
								showFormula ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
							}`}
						>
							<div className="overflow-hidden">
								<div className="pt-3 text-sm leading-relaxed text-neutral-300">
									<div className="mb-4 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2.5 text-xs text-neutral-400">
										All inputs are normalized to base units before calculation: peptide mass to{" "}
										<strong className="text-neutral-200">mg</strong>, dose to{" "}
										<strong className="text-neutral-200">mg</strong>, volume to{" "}
										<strong className="text-neutral-200">mL</strong>. If you enter a dose in mcg, the engine
										divides by 1,000 to convert to mg first.
									</div>
									<p className="mb-3">
										<strong className="text-white">Concentration</strong> = Peptide Amount (mg) / Water Volume
										(mL)
									</p>
									<p className="mb-3">
										<strong className="text-white">Draw Volume</strong> = Desired Dose (mg) / Concentration
										(mg/mL)
									</p>
									<p className="mb-3">
										<strong className="text-white">Syringe Units</strong> = Draw Volume (mL) x 100
										<span className="ml-1 text-xs text-neutral-400">
											(U-100 standard: 100 units = 1 mL, so 1 unit = 0.01 mL)
										</span>
									</p>
									<p>
										<strong className="text-white">Doses per Vial</strong> = Total Peptide (mg) / Dose Amount
										(mg)
									</p>
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
						{/* Error-level warnings when no result */}
						{output.warnings.filter((w) => w.level === "error").length > 0 ? (
							<div className="space-y-3">
								<h2 className="text-lg font-semibold text-white">Cannot Calculate</h2>
								<div className="space-y-2">
									{output.warnings
										.filter((w) => w.level === "error")
										.map((w, i) => (
											<WarningBanner key={i} warning={w} />
										))}
								</div>
							</div>
						) : (
							<div className="flex min-h-[250px] items-center justify-center">
								<p className="text-sm text-neutral-400">Enter valid inputs to see results.</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldGroup({
	label,
	children,
	last,
	error,
	hint,
}: {
	label: string;
	children: React.ReactNode;
	last?: boolean;
	error?: string;
	hint?: string;
}) {
	return (
		<div className={last ? "" : "mb-6"}>
			<label className="mb-1.5 block text-sm font-medium text-neutral-200">{label}</label>
			{hint && <p className="mb-2 text-xs text-neutral-400">{hint}</p>}
			{children}
			{error && (
				<p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-400">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="mt-0.5 shrink-0"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="m15 9-6 6" />
						<path d="m9 9 6 6" />
					</svg>
					{error}
				</p>
			)}
		</div>
	);
}

function NumberInput({
	value,
	onChange,
	placeholder,
	hasError,
}: {
	value: number;
	onChange: (v: number) => void;
	placeholder?: string;
	hasError?: boolean;
}) {
	return (
		<input
			type="number"
			inputMode="decimal"
			value={value || ""}
			onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
			placeholder={placeholder}
			className={`w-full rounded-lg border bg-neutral-800 px-4 py-2.5 text-white placeholder-neutral-500 transition-colors focus:outline-none focus:ring-1 ${
				hasError
					? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
					: "border-neutral-700 focus:border-emerald-500/50 focus:ring-emerald-500/30"
			}`}
		/>
	);
}

function UnitToggle({
	options,
	value,
	onChange,
}: {
	options: string[];
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex overflow-hidden rounded-lg border border-neutral-700">
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					onClick={() => onChange(opt)}
					className={`px-3 py-2.5 text-sm font-medium transition-colors ${
						value === opt
							? "bg-emerald-500/15 text-emerald-400"
							: "bg-neutral-800 text-neutral-300 hover:text-neutral-100"
					}`}
				>
					{opt}
				</button>
			))}
		</div>
	);
}

function PresetRow({
	values,
	unit,
	active,
	onSelect,
}: {
	values: number[];
	unit: string;
	active: number | null;
	onSelect: (v: number) => void;
}) {
	return (
		<div className="mt-2 flex flex-wrap gap-1.5">
			{values.map((v) => (
				<button
					key={v}
					type="button"
					onClick={() => onSelect(v)}
					className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
						active === v
							? "bg-emerald-500/15 text-emerald-400"
							: "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
					}`}
				>
					{v} {unit}
				</button>
			))}
		</div>
	);
}

function ResultRow({
	label,
	value,
	sub,
	highlight,
}: {
	label: string;
	value: string;
	sub?: string;
	highlight?: boolean;
}) {
	return (
		<div className="flex items-baseline justify-between">
			<span className="text-sm text-neutral-300">{label}</span>
			<div className="text-right">
				<span className={`text-lg font-semibold ${highlight ? "text-emerald-400" : "text-white"}`}>
					{value}
				</span>
				{sub && <span className="ml-2 text-xs text-neutral-400">{sub}</span>}
			</div>
		</div>
	);
}

function WarningBanner({ warning }: { warning: Warning }) {
	const isError = warning.level === "error";
	return (
		<div
			className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
				isError
					? "border-red-500/30 bg-red-500/[0.06] text-red-300"
					: "border-amber-500/30 bg-amber-500/[0.06] text-amber-300"
			}`}
		>
			{isError ? (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="mt-0.5 shrink-0"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="m15 9-6 6" />
					<path d="m9 9 6 6" />
				</svg>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="mt-0.5 shrink-0"
				>
					<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
				</svg>
			)}
			<span>{warning.message}</span>
		</div>
	);
}

export type { HistoryEntry };
