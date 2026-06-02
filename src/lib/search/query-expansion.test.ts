import { describe, it, expect } from "vitest";

import { tokenize, expandQuery, levenshtein, fuzzyCorrectQuery } from "./query-expansion";

describe("tokenize", () => {
	it("splits on non-alphanumeric and lowercases", () => {
		expect(tokenize("BPC-157")).toEqual(["bpc", "157"]);
	});

	it("keeps + so terms like NAD+ survive", () => {
		expect(tokenize("NAD+")).toEqual(["nad+"]);
	});

	it("drops empty tokens", () => {
		expect(tokenize("  TB - 500  ")).toEqual(["tb", "500"]);
	});
});

describe("expandQuery", () => {
	it("rewrites a brand name to its compound", () => {
		const r = expandQuery("ozempic");
		expect(r.searchString).toBe("semaglutide");
		expect(r.appliedSynonym).toBe(true);
		expect(r.scoringTerms).toEqual(["semaglutide"]);
	});

	it("normalizes spacing/hyphen variants", () => {
		expect(expandQuery("bpc157").searchString).toBe("bpc-157");
		expect(expandQuery("tb 500").searchString).toBe("tb-500");
	});

	it("matches whole-phrase synonyms", () => {
		expect(expandQuery("copper peptide").searchString).toBe("ghk-cu");
	});

	it("applies token-level synonyms within a longer query", () => {
		const r = expandQuery("Ozempic 5mg");
		expect(r.searchString).toBe("semaglutide 5mg");
		expect(r.appliedSynonym).toBe(true);
	});

	it("leaves an unknown query untouched", () => {
		const r = expandQuery("semaglutide");
		expect(r.searchString).toBe("semaglutide");
		expect(r.appliedSynonym).toBe(false);
	});
});

describe("levenshtein", () => {
	it("returns 0 for identical strings", () => {
		expect(levenshtein("bpc", "bpc")).toBe(0);
	});

	it("counts single edits", () => {
		expect(levenshtein("bpc-157", "bpc-158")).toBe(1);
		expect(levenshtein("kitten", "sitting")).toBe(3);
	});
});

describe("fuzzyCorrectQuery", () => {
	it("corrects a misspelled compound to the nearest catalog term", () => {
		expect(fuzzyCorrectQuery("semaglutibe")).toBe("semaglutide");
		expect(fuzzyCorrectQuery("ipamorlin")).toBe("ipamorelin");
	});

	it("corrects a near-miss code", () => {
		expect(fuzzyCorrectQuery("bpc-158")).toBe("bpc-157");
	});

	it("returns null when nothing is close enough", () => {
		expect(fuzzyCorrectQuery("zzz")).toBeNull();
		expect(fuzzyCorrectQuery("qwerty")).toBeNull();
	});

	it("ignores queries that are too short", () => {
		expect(fuzzyCorrectQuery("bp")).toBeNull();
	});
});
