"use client";

import { calculate, SYRINGE_TYPES, type CalculatorInputs } from "@/lib/peptide-calculator";

const EXAMPLE_INPUTS: CalculatorInputs = {
	peptideAmount: 5,
	peptideUnit: "mg",
	waterVolume: 2,
	waterUnit: "mL",
	doseAmount: 250,
	doseUnit: "mcg",
	syringeIndex: 2, // 1 mL U-100
	vialCount: 1,
};

export function WorkedExampleView() {
	const { result } = calculate(EXAMPLE_INPUTS);

	if (!result) return null;

	return (
		<div className="mx-auto max-w-2xl">
			<div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
				<h2 className="mb-2 text-xl font-bold text-white">Worked Example</h2>
				<p className="mb-8 text-sm text-neutral-400">
					Walk through a common reconstitution scenario step by step.
				</p>

				{/* Setup */}
				<div className="mb-8 grid gap-3 sm:grid-cols-2">
					<InfoChip label="Vial" value="5 mg peptide" />
					<InfoChip label="Diluent" value="2 mL BAC water" />
					<InfoChip label="Target Dose" value="250 mcg" />
					<InfoChip label="Syringe" value={SYRINGE_TYPES[2]!.label} />
				</div>

				{/* Steps */}
				<div className="space-y-6">
					<Step
						number={1}
						title="Calculate Concentration"
						formula="5 mg / 2 mL = 2.5 mg/mL"
						explanation="Dividing the total peptide mass by the water volume gives the concentration. This is also 2,500 mcg/mL."
					/>
					<Step
						number={2}
						title="Calculate Draw Volume"
						formula="250 mcg / 2,500 mcg/mL = 0.10 mL"
						explanation="Dividing your desired dose by the concentration tells you how many milliliters to draw."
					/>
					<Step
						number={3}
						title="Convert to Syringe Units"
						formula="0.10 mL x 100 units/mL = 10 units"
						explanation="On a U-100 insulin syringe, each 0.01 mL equals 1 unit. So 0.10 mL = 10 units, which is the mark you draw to."
					/>
					<Step
						number={4}
						title="Doses per Vial"
						formula="5 mg / 0.25 mg = 20 doses"
						explanation="At 250 mcg per dose, a single 5 mg vial provides 20 full doses."
					/>
				</div>

				{/* Final instruction */}
				<div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5">
					<p className="text-sm font-medium text-emerald-300">Final Instruction</p>
					<p className="mt-2 leading-relaxed text-emerald-200">{result.instruction}</p>
				</div>
			</div>
		</div>
	);
}

function InfoChip({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3">
			<span className="text-xs text-neutral-500">{label}</span>
			<p className="text-sm font-medium text-white">{value}</p>
		</div>
	);
}

function Step({
	number,
	title,
	formula,
	explanation,
}: {
	number: number;
	title: string;
	formula: string;
	explanation: string;
}) {
	return (
		<div className="flex gap-4">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-sm font-semibold text-emerald-400">
				{number}
			</div>
			<div className="flex-1">
				<h3 className="font-medium text-white">{title}</h3>
				<p className="mt-1 font-mono text-sm text-emerald-400">{formula}</p>
				<p className="mt-1.5 text-sm text-neutral-400">{explanation}</p>
			</div>
		</div>
	);
}
