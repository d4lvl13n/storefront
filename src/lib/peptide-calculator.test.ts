import { describe, it, expect } from "vitest";
import {
	toMg,
	toMcg,
	validate,
	calculate,
	formatDose,
	formatResultSummary,
	type CalculatorInputs,
} from "./peptide-calculator";

// ─── Unit Conversion ─────────────────────────────────────────────────────────

describe("toMg", () => {
	it("returns mg value unchanged", () => {
		expect(toMg(5, "mg")).toBe(5);
	});
	it("converts mcg to mg", () => {
		expect(toMg(250, "mcg")).toBe(0.25);
	});
});

describe("toMcg", () => {
	it("converts mg to mcg", () => {
		expect(toMcg(5, "mg")).toBe(5000);
	});
	it("returns mcg value unchanged", () => {
		expect(toMcg(250, "mcg")).toBe(250);
	});
});

// ─── Reference Example: 5mg / 2mL / 250mcg ──────────────────────────────────

describe("reference example: 5mg + 2mL + 250mcg", () => {
	const inputs: CalculatorInputs = {
		peptideAmount: 5,
		peptideUnit: "mg",
		waterVolume: 2,
		waterUnit: "mL",
		doseAmount: 250,
		doseUnit: "mcg",
		syringeIndex: 2, // 1 mL U-100
		vialCount: 1,
	};

	it("calculates correct concentration", () => {
		const { result } = calculate(inputs);
		expect(result).not.toBeNull();
		expect(result!.concentrationMgMl).toBe(2.5);
		expect(result!.concentrationMcgMl).toBe(2500);
	});

	it("calculates correct draw volume", () => {
		const { result } = calculate(inputs);
		expect(result!.drawVolumeMl).toBeCloseTo(0.1, 4);
	});

	it("calculates correct syringe units", () => {
		const { result } = calculate(inputs);
		expect(result!.syringeUnits).toBe(10);
	});

	it("calculates correct doses per vial", () => {
		const { result } = calculate(inputs);
		expect(result!.dosesPerVial).toBe(20);
	});

	it("generates a human-readable instruction", () => {
		const { result } = calculate(inputs);
		expect(result!.instruction).toContain("2 mL of bacteriostatic water");
		expect(result!.instruction).toContain("10-unit mark");
		expect(result!.instruction).toContain("250 mcg dose");
	});
});

// ─── Different Input Combinations ────────────────────────────────────────────

describe("10mg + 1mL + 500mcg", () => {
	const inputs: CalculatorInputs = {
		peptideAmount: 10,
		peptideUnit: "mg",
		waterVolume: 1,
		waterUnit: "mL",
		doseAmount: 500,
		doseUnit: "mcg",
		syringeIndex: 1, // 0.5 mL
		vialCount: 1,
	};

	it("calculates correctly", () => {
		const { result } = calculate(inputs);
		expect(result).not.toBeNull();
		expect(result!.concentrationMgMl).toBe(10);
		expect(result!.drawVolumeMl).toBeCloseTo(0.05, 4);
		expect(result!.syringeUnits).toBe(5);
		expect(result!.dosesPerVial).toBe(20);
	});
});

describe("dose in mg instead of mcg", () => {
	const inputs: CalculatorInputs = {
		peptideAmount: 10,
		peptideUnit: "mg",
		waterVolume: 2,
		waterUnit: "mL",
		doseAmount: 1,
		doseUnit: "mg",
		syringeIndex: 2,
		vialCount: 1,
	};

	it("handles mg dose input", () => {
		const { result } = calculate(inputs);
		expect(result).not.toBeNull();
		expect(result!.concentrationMgMl).toBe(5);
		expect(result!.drawVolumeMl).toBeCloseTo(0.2, 4);
		expect(result!.syringeUnits).toBe(20);
		expect(result!.dosesPerVial).toBe(10);
	});
});

describe("peptide in mcg", () => {
	const inputs: CalculatorInputs = {
		peptideAmount: 5000,
		peptideUnit: "mcg",
		waterVolume: 2,
		waterUnit: "mL",
		doseAmount: 250,
		doseUnit: "mcg",
		syringeIndex: 2,
		vialCount: 1,
	};

	it("converts peptide mcg to mg for calculation", () => {
		const { result } = calculate(inputs);
		expect(result).not.toBeNull();
		expect(result!.concentrationMgMl).toBe(2.5);
		expect(result!.drawVolumeMl).toBeCloseTo(0.1, 4);
	});
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe("validation", () => {
	const validBase: CalculatorInputs = {
		peptideAmount: 5,
		peptideUnit: "mg",
		waterVolume: 2,
		waterUnit: "mL",
		doseAmount: 250,
		doseUnit: "mcg",
		syringeIndex: 2,
		vialCount: 1,
	};

	it("rejects zero peptide amount", () => {
		const { valid, warnings } = validate({ ...validBase, peptideAmount: 0 });
		expect(valid).toBe(false);
		expect(warnings.some((w) => w.field === "peptideAmount")).toBe(true);
	});

	it("rejects negative water volume", () => {
		const { valid, warnings } = validate({ ...validBase, waterVolume: -1 });
		expect(valid).toBe(false);
		expect(warnings.some((w) => w.field === "waterVolume")).toBe(true);
	});

	it("rejects zero dose", () => {
		const { valid, warnings } = validate({ ...validBase, doseAmount: 0 });
		expect(valid).toBe(false);
		expect(warnings.some((w) => w.field === "doseAmount")).toBe(true);
	});

	it("errors when dose exceeds vial content", () => {
		const { valid, warnings } = validate({ ...validBase, doseAmount: 10, doseUnit: "mg" });
		expect(valid).toBe(false);
		expect(warnings.some((w) => w.message.includes("exceeds total vial content"))).toBe(true);
	});

	it("errors when draw volume exceeds syringe capacity", () => {
		// 5mg / 3mL = 1.67 mg/mL, 2mg dose = 1.2mL — exceeds 0.3mL syringe
		const { valid, warnings } = validate({
			...validBase,
			waterVolume: 3,
			doseAmount: 2,
			doseUnit: "mg",
			syringeIndex: 0, // 0.3 mL
		});
		expect(valid).toBe(false);
		expect(warnings.some((w) => w.message.includes("exceeds"))).toBe(true);
	});

	it("warns on very small draw volume", () => {
		// 5mg / 2mL = 2.5 mg/mL, 10mcg = 0.004mL
		const { valid, warnings } = validate({ ...validBase, doseAmount: 10, doseUnit: "mcg" });
		expect(valid).toBe(true);
		expect(warnings.some((w) => w.level === "caution")).toBe(true);
	});

	it("passes valid inputs with no errors", () => {
		const { valid, warnings } = validate(validBase);
		expect(valid).toBe(true);
		expect(warnings.filter((w) => w.level === "error")).toHaveLength(0);
	});
});

// ─── Formatting ──────────────────────────────────────────────────────────────

describe("formatDose", () => {
	it("formats mg with integer", () => {
		expect(formatDose(5, "mg")).toBe("5 mg");
	});
	it("formats mg with decimal", () => {
		expect(formatDose(0.25, "mg")).toBe("0.25 mg");
	});
	it("formats mcg with integer", () => {
		expect(formatDose(250, "mcg")).toBe("250 mcg");
	});
});

describe("formatResultSummary", () => {
	it("produces a multi-line summary string", () => {
		const inputs: CalculatorInputs = {
			peptideAmount: 5,
			peptideUnit: "mg",
			waterVolume: 2,
			waterUnit: "mL",
			doseAmount: 250,
			doseUnit: "mcg",
			syringeIndex: 2,
			vialCount: 1,
		};
		const { result } = calculate(inputs);
		const summary = formatResultSummary(inputs, result!);
		expect(summary).toContain("Peptide: 5 mg");
		expect(summary).toContain("BAC Water: 2 mL");
		expect(summary).toContain("Concentration:");
		expect(summary).toContain("Draw:");
	});
});
