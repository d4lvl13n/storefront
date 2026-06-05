import { describe, it, expect } from "vitest";

import { CoaIndexEntrySchema, CoaRecordSchema, parseCoaIndex, toPublicCoa } from "./schema";

// Valid tokens for fixtures — must use the strict alphabet (no 0/1/I/L/O/U).
const TOKEN_A = "A8K2-9F4R-XP73";
const TOKEN_B = "B7M3-2QRS-TVWX";

const activeRecord = {
	token: TOKEN_A,
	status: "active",
	pdfUrl: "https://example.com/media/coa/file.pdf",
	pdfSha256: "a".repeat(64),
	batchNumber: "B-2026-014",
	peptideName: "BPC-157",
	issuedAt: "2026-05-12",
};

describe("CoaRecordSchema — shared status", () => {
	it("accepts a minimal shared record (token + status only)", () => {
		const parsed = CoaRecordSchema.safeParse({ token: TOKEN_A, status: "shared" });
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.status).toBe("shared");
			expect(parsed.data.token).toBe(TOKEN_A);
		}
	});

	it("accepts an operator note and strips leftover published fields", () => {
		// Ops flip a published record to shared by editing its JSON in place —
		// stale fields like pdfUrl must be stripped, never rendered.
		const parsed = CoaRecordSchema.safeParse({
			...activeRecord,
			status: "shared",
			note: "June 2026 label misprint — same QR on every product of the run",
		});
		expect(parsed.success).toBe(true);
		if (parsed.success && parsed.data.status === "shared") {
			expect(parsed.data.note).toContain("label misprint");
			expect("pdfUrl" in parsed.data).toBe(false);
			expect("batchNumber" in parsed.data).toBe(false);
		}
	});

	it("rejects a shared record with an invalid token", () => {
		expect(CoaRecordSchema.safeParse({ token: "OOOO-1111-LLLL", status: "shared" }).success).toBe(false);
	});

	it("still accepts a regular active record (regression)", () => {
		expect(CoaRecordSchema.safeParse(activeRecord).success).toBe(true);
	});

	it("accepts a record with a pdfs[] array (multi-lab)", () => {
		const parsed = CoaRecordSchema.safeParse({
			...activeRecord,
			labName: "Freedom Diagnostics & Vanguard Laboratory",
			pdfs: [
				{
					labName: "Freedom Diagnostics",
					pdfUrl: "https://example.com/media/coa/A-F.pdf",
					pdfSha256: "b".repeat(64),
					issuedAt: "2026-05-18",
				},
				{
					labName: "Vanguard Laboratory",
					pdfUrl: "https://example.com/media/coa/A-V.pdf",
					pdfSha256: "c".repeat(64),
					issuedAt: "2026-05-28",
				},
			],
		});
		expect(parsed.success).toBe(true);
		if (parsed.success && parsed.data.status === "active") {
			expect(parsed.data.pdfs).toHaveLength(2);
		}
	});

	it("accepts a record without pdfs[] (backward compat)", () => {
		const parsed = CoaRecordSchema.safeParse(activeRecord);
		expect(parsed.success).toBe(true);
		if (parsed.success && parsed.data.status === "active") {
			expect(parsed.data.pdfs).toBeUndefined();
		}
	});

	it("rejects an empty pdfs[] array and malformed entries", () => {
		expect(CoaRecordSchema.safeParse({ ...activeRecord, pdfs: [] }).success).toBe(false);
		expect(
			CoaRecordSchema.safeParse({
				...activeRecord,
				pdfs: [{ pdfUrl: "javascript:alert(1)", pdfSha256: "b".repeat(64) }],
			}).success,
		).toBe(false);
		expect(
			CoaRecordSchema.safeParse({
				...activeRecord,
				pdfs: [{ pdfUrl: "https://example.com/media/coa/A.pdf", pdfSha256: "not-a-hash" }],
			}).success,
		).toBe(false);
	});

	it("toPublicCoa strips saleorVariantId from shared records", () => {
		const parsed = CoaRecordSchema.parse({
			token: TOKEN_A,
			status: "shared",
			saleorVariantId: "UHJvZHVjdFZhcmlhbnQ6MjAz",
		});
		expect("saleorVariantId" in toPublicCoa(parsed)).toBe(false);
	});
});

describe("COA index parsing (live wire shape: { updatedAt, coas: [...] })", () => {
	const validIndex = {
		updatedAt: "2026-06-05",
		coas: [
			{
				token: TOKEN_A,
				product: "BPC 157 10mg/vial",
				batch: "B-2026-014",
				issuedAt: "2026-05-12",
				status: "active",
			},
			// Live registry publishes batch: null until the lab report exists.
			{ token: TOKEN_B, product: "GLP-3 10mg/vial", batch: null, status: "pending" },
		],
	};

	it("accepts the live index shape, including null batch", () => {
		const parsed = parseCoaIndex(validIndex);
		expect(parsed).not.toBeNull();
		expect(parsed?.index.entries).toHaveLength(2);
		expect(parsed?.dropped).toBe(0);
		expect(parsed?.index.entries[1]?.batch).toBeNull();
		expect(parsed?.index.updatedAt).toBe("2026-06-05");
	});

	it("accepts an empty coas array", () => {
		const parsed = parseCoaIndex({ coas: [] });
		expect(parsed?.index.entries).toHaveLength(0);
	});

	it("drops invalid entries without blanking the rest (lenient)", () => {
		const parsed = parseCoaIndex({
			coas: [
				validIndex.coas[0],
				{ token: "not-a-token", product: "GLP-2", batch: null, status: "active" },
				{ token: TOKEN_B, product: "GLP-3", batch: null, status: "shared" }, // routing artifact, not a certificate
			],
		});
		expect(parsed).not.toBeNull();
		expect(parsed?.index.entries).toHaveLength(1);
		expect(parsed?.dropped).toBe(2);
	});

	it("returns null when the envelope is unusable", () => {
		expect(parseCoaIndex({ entries: [] })).toBeNull(); // old/wrong key
		expect(parseCoaIndex("nonsense")).toBeNull();
		expect(parseCoaIndex(null)).toBeNull();
	});

	it("rejects individual entries missing product", () => {
		expect(CoaIndexEntrySchema.safeParse({ token: TOKEN_A, batch: "B-1", status: "active" }).success).toBe(
			false,
		);
	});
});
