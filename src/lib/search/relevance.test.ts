import { describe, it, expect } from "vitest";

import { scoreProduct, rankByRelevance } from "./relevance";

describe("scoreProduct", () => {
	it("scores an exact name match highest", () => {
		const exact = scoreProduct({ name: "Semaglutide" }, ["semaglutide"]);
		const prefix = scoreProduct({ name: "Semaglutide 5mg Vial" }, ["semaglutide"]);
		const substring = scoreProduct({ name: "Research Semaglutide Kit" }, ["semaglutide"]);
		expect(exact).toBeGreaterThan(prefix);
		expect(prefix).toBeGreaterThan(substring);
	});

	it("rewards whole-word matches over loose substrings", () => {
		const wholeWord = scoreProduct({ name: "BPC-157" }, ["bpc"]);
		const substring = scoreProduct({ name: "Subpc Compound" }, ["bpc"]);
		expect(wholeWord).toBeGreaterThan(substring);
	});

	it("gives a small boost for category-only matches", () => {
		const score = scoreProduct({ name: "Some Compound", categoryName: "Healing & Repair" }, ["healing"]);
		expect(score).toBeGreaterThan(0);
	});

	it("returns 0 with no terms", () => {
		expect(scoreProduct({ name: "BPC-157" }, [])).toBe(0);
	});
});

describe("rankByRelevance", () => {
	it("puts the most specific match first", () => {
		const products = [
			{ name: "BPC-157 + TB-500 Blend", categoryName: "Blends" },
			{ name: "BPC-157", categoryName: "Healing" },
			{ name: "TB-500", categoryName: "Healing" },
		];
		const ranked = rankByRelevance(products, ["bpc", "157"]);
		expect(ranked[0].name).toBe("BPC-157");
	});

	it("is stable for equal scores (preserves input order)", () => {
		// Same length → identical score → input order must be preserved.
		const products = [{ name: "Alpha Peptide" }, { name: "Gamma Peptide" }];
		const ranked = rankByRelevance(products, ["nomatch"]);
		expect(ranked.map((p) => p.name)).toEqual(["Alpha Peptide", "Gamma Peptide"]);
	});
});
