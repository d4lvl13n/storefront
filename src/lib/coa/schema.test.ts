import { describe, it, expect } from "vitest";

import { CoaIndexSchema, CoaRecordSchema, toPublicCoa } from "./schema";

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

	it("toPublicCoa strips saleorVariantId from shared records", () => {
		const parsed = CoaRecordSchema.parse({
			token: TOKEN_A,
			status: "shared",
			saleorVariantId: "UHJvZHVjdFZhcmlhbnQ6MjAz",
		});
		expect("saleorVariantId" in toPublicCoa(parsed)).toBe(false);
	});
});

describe("CoaIndexSchema", () => {
	const validIndex = {
		updatedAt: "2026-06-05T10:00:00Z",
		entries: [
			{
				token: TOKEN_A,
				peptideName: "BPC-157",
				batchNumber: "B-2026-014",
				issuedAt: "2026-05-12",
				status: "active",
			},
			{ token: TOKEN_B, peptideName: "GLP-3", batchNumber: "B-2026-015", status: "pending" },
		],
	};

	it("accepts a valid index", () => {
		const parsed = CoaIndexSchema.safeParse(validIndex);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.entries).toHaveLength(2);
		}
	});

	it("accepts an empty entries array", () => {
		expect(CoaIndexSchema.safeParse({ entries: [] }).success).toBe(true);
	});

	it("rejects entries with the shared status (routing artifact, not a certificate)", () => {
		const index = {
			entries: [{ token: TOKEN_A, peptideName: "BPC-157", batchNumber: "B-2026-014", status: "shared" }],
		};
		expect(CoaIndexSchema.safeParse(index).success).toBe(false);
	});

	it("rejects entries with malformed tokens", () => {
		const index = {
			entries: [
				{ token: "not-a-token", peptideName: "BPC-157", batchNumber: "B-2026-014", status: "active" },
			],
		};
		expect(CoaIndexSchema.safeParse(index).success).toBe(false);
	});

	it("rejects entries missing peptideName or batchNumber", () => {
		expect(
			CoaIndexSchema.safeParse({ entries: [{ token: TOKEN_A, batchNumber: "B-1", status: "active" }] })
				.success,
		).toBe(false);
		expect(
			CoaIndexSchema.safeParse({ entries: [{ token: TOKEN_A, peptideName: "BPC-157", status: "active" }] })
				.success,
		).toBe(false);
	});
});
