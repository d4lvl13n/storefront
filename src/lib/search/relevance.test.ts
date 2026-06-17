import { describe, it, expect } from "vitest";

import { scoreProduct, rankByRelevance, matchesQuery } from "./relevance";

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

describe("matchesQuery", () => {
	// The reported bug: typing a prefix returned "No matches" because Saleor's
	// whole-word search found nothing and nothing reached the ranker.
	it("matches a word prefix (ipamor → Ipamorelin)", () => {
		expect(matchesQuery({ name: "IPAMORELIN" }, ["ipamor"])).toBe(true);
		expect(matchesQuery({ name: "CJC-1295 + IPAMORELIN" }, ["ipamor"])).toBe(true);
	});

	it("matches whole query as a substring and per-term substrings", () => {
		expect(matchesQuery({ name: "BPC-157 + TB-500" }, ["tb-500"])).toBe(true);
		expect(matchesQuery({ name: "Semaglutide" }, ["sema"])).toBe(true);
	});

	it("matches on category", () => {
		expect(matchesQuery({ name: "GHK-CU", categoryName: "Healing & Repair" }, ["healing"])).toBe(true);
	});

	it("does not match unrelated terms or empty input", () => {
		expect(matchesQuery({ name: "IPAMORELIN" }, ["semaglutide"])).toBe(false);
		expect(matchesQuery({ name: "IPAMORELIN" }, [])).toBe(false);
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
