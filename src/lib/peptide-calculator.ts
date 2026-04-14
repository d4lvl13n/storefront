// Pure calculation engine for peptide reconstitution
// All functions are pure — no side effects, no DOM, no state

// ─── Types ───────────────────────────────────────────────────────────────────

export type MassUnit = "mg" | "mcg";
export type VolumeUnit = "mL";
export type DoseUnit = "mg" | "mcg";

export interface SyringeType {
	label: string;
	capacityMl: number;
	unitsPerMl: number; // U-100 = 100 units/mL
}

export const SYRINGE_TYPES: SyringeType[] = [
	{ label: "0.3 mL (U-100)", capacityMl: 0.3, unitsPerMl: 100 },
	{ label: "0.5 mL (U-100)", capacityMl: 0.5, unitsPerMl: 100 },
	{ label: "1 mL (U-100)", capacityMl: 1.0, unitsPerMl: 100 },
];

export const PEPTIDE_PRESETS = [2, 5, 10, 15, 30] as const;
export const WATER_PRESETS = [1, 2, 3] as const;

export interface CalculatorInputs {
	peptideAmount: number;
	peptideUnit: MassUnit;
	waterVolume: number;
	waterUnit: VolumeUnit;
	doseAmount: number;
	doseUnit: DoseUnit;
	syringeIndex: number;
	vialCount: number;
}

export interface CalculatorResult {
	concentrationMgMl: number;
	concentrationMcgMl: number;
	drawVolumeMl: number;
	syringeUnits: number;
	dosesPerVial: number;
	instruction: string;
}

export type WarningLevel = "error" | "caution";

export interface Warning {
	level: WarningLevel;
	field?: keyof CalculatorInputs;
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	warnings: Warning[];
}

export interface CalculationOutput {
	result: CalculatorResult | null;
	warnings: Warning[];
}

// ─── Unit Conversion ─────────────────────────────────────────────────────────

export function toMg(value: number, unit: MassUnit): number {
	return unit === "mcg" ? value / 1000 : value;
}

export function toMcg(value: number, unit: MassUnit): number {
	return unit === "mg" ? value * 1000 : value;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validate(inputs: CalculatorInputs): ValidationResult {
	const warnings: Warning[] = [];
	const syringe = SYRINGE_TYPES[inputs.syringeIndex];

	if (!inputs.peptideAmount || inputs.peptideAmount <= 0) {
		warnings.push({
			level: "error",
			field: "peptideAmount",
			message: "Peptide amount must be greater than zero.",
		});
	}
	if (!inputs.waterVolume || inputs.waterVolume <= 0) {
		warnings.push({
			level: "error",
			field: "waterVolume",
			message: "Diluent volume must be greater than zero.",
		});
	}
	if (!inputs.doseAmount || inputs.doseAmount <= 0) {
		warnings.push({
			level: "error",
			field: "doseAmount",
			message: "Desired dose must be greater than zero.",
		});
	}
	if (!syringe) {
		warnings.push({ level: "error", field: "syringeIndex", message: "Please select a valid syringe type." });
	}

	if (warnings.length > 0) {
		return { valid: false, warnings };
	}

	const peptideMg = toMg(inputs.peptideAmount, inputs.peptideUnit);
	const doseMg = toMg(inputs.doseAmount, inputs.doseUnit);

	// Dose exceeds vial content
	if (doseMg > peptideMg * inputs.vialCount) {
		warnings.push({
			level: "error",
			field: "doseAmount",
			message: `Requested dose (${formatDose(
				inputs.doseAmount,
				inputs.doseUnit,
			)}) exceeds total vial content (${formatDose(peptideMg * inputs.vialCount, "mg")}).`,
		});
	}

	// Draw volume vs syringe capacity
	if (syringe) {
		const concentrationMgMl = peptideMg / inputs.waterVolume;
		const drawVolumeMl = doseMg / concentrationMgMl;

		if (drawVolumeMl > syringe.capacityMl) {
			warnings.push({
				level: "error",
				field: "syringeIndex",
				message: `Draw volume (${drawVolumeMl.toFixed(3)} mL) exceeds ${
					syringe.label
				} capacity. Use a larger syringe or increase concentration by reducing diluent volume.`,
			});
		}

		if (drawVolumeMl > 0 && drawVolumeMl < 0.02) {
			warnings.push({
				level: "caution",
				field: "doseAmount",
				message: `Draw volume is very small (${drawVolumeMl.toFixed(3)} mL / ${(
					drawVolumeMl * syringe.unitsPerMl
				).toFixed(1)} units). This may be difficult to measure accurately.`,
			});
		}
	}

	return { valid: !warnings.some((w) => w.level === "error"), warnings };
}

// ─── Calculation ─────────────────────────────────────────────────────────────

export function calculate(inputs: CalculatorInputs): CalculationOutput {
	const validation = validate(inputs);

	if (!validation.valid) {
		return { result: null, warnings: validation.warnings };
	}

	const syringe = SYRINGE_TYPES[inputs.syringeIndex]!;
	const peptideMg = toMg(inputs.peptideAmount, inputs.peptideUnit);
	const doseMg = toMg(inputs.doseAmount, inputs.doseUnit);

	const concentrationMgMl = peptideMg / inputs.waterVolume;
	const concentrationMcgMl = concentrationMgMl * 1000;
	const drawVolumeMl = doseMg / concentrationMgMl;
	const syringeUnits = drawVolumeMl * syringe.unitsPerMl;
	const dosesPerVial = peptideMg / doseMg;

	const doseLabel = formatDose(inputs.doseAmount, inputs.doseUnit);
	const instruction = buildInstruction({
		peptideLabel: formatDose(inputs.peptideAmount, inputs.peptideUnit),
		waterMl: inputs.waterVolume,
		doseLabel,
		drawMl: drawVolumeMl,
		units: syringeUnits,
		syringeLabel: syringe.label,
	});

	return {
		result: {
			concentrationMgMl,
			concentrationMcgMl,
			drawVolumeMl,
			syringeUnits,
			dosesPerVial,
			instruction,
		},
		warnings: validation.warnings,
	};
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────

export function formatDose(amount: number, unit: DoseUnit | MassUnit): string {
	if (unit === "mcg") {
		return `${Number.isInteger(amount) ? amount : amount.toFixed(1)} mcg`;
	}
	return `${Number.isInteger(amount) ? amount : amount.toFixed(2)} mg`;
}

export function formatUnits(units: number): string {
	return Number.isInteger(units) ? units.toString() : units.toFixed(1);
}

export function formatVolume(ml: number, precision: "rounded" | "exact" = "rounded"): string {
	if (precision === "exact") return ml.toFixed(4);
	// Round to nearest 0.01 for display
	const rounded = Math.round(ml * 100) / 100;
	return rounded.toFixed(2);
}

export function formatUnitsDisplay(units: number, precision: "rounded" | "exact" = "rounded"): string {
	if (precision === "exact") return units.toFixed(2);
	const rounded = Math.round(units * 10) / 10;
	return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

function buildInstruction(p: {
	peptideLabel: string;
	waterMl: number;
	doseLabel: string;
	drawMl: number;
	units: number;
	syringeLabel: string;
}): string {
	const vol = formatVolume(p.drawMl);
	const u = formatUnitsDisplay(p.units);
	return `Step 1: Add ${p.waterMl} mL of bacteriostatic water to the ${p.peptideLabel} vial. Swirl gently until dissolved. Step 2: Using a ${p.syringeLabel} insulin syringe, draw to the ${u}-unit mark (${vol} mL) for a ${p.doseLabel} dose.`;
}

export function formatResultSummary(inputs: CalculatorInputs, result: CalculatorResult): string {
	const syringe = SYRINGE_TYPES[inputs.syringeIndex]!;
	return [
		`Peptide: ${formatDose(inputs.peptideAmount, inputs.peptideUnit)}`,
		`BAC Water: ${inputs.waterVolume} mL`,
		`Dose: ${formatDose(inputs.doseAmount, inputs.doseUnit)}`,
		`Syringe: ${syringe.label}`,
		`---`,
		`Concentration: ${result.concentrationMgMl.toFixed(2)} mg/mL (${result.concentrationMcgMl.toFixed(
			0,
		)} mcg/mL)`,
		`Draw: ${result.drawVolumeMl.toFixed(3)} mL = ${formatUnits(result.syringeUnits)} units`,
		`Doses per vial: ${Math.floor(result.dosesPerVial)}`,
		``,
		result.instruction,
	].join("\n");
}
