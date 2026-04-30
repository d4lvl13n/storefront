/**
 * Zod schema for a COA registry record.
 *
 * Single source of truth for the JSON record shape published by the backend
 * COA registry to `https://saleor.infinitybiolabs.com/media/coa/<token>.json`,
 * shared between the API route (runtime validation) and the page (TypeScript
 * type via `z.infer<>`).
 *
 * See docs/coa-checker-spec.md §"Backend / COA registry work" for the
 * authoritative field list and §"API contract between storefront and backend"
 * for the public response shape (which sanitises out `saleorVariantId`).
 */

import { z } from "zod";

import { COA_TOKEN_REGEX } from "./token";

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;
const ISO_DATE_LOOSE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Strict URL validator for the `pdfUrl` field.
 *
 * `z.string().url()` accepts any URL the WHATWG parser accepts — including
 * `javascript:`, `data:`, and `file:` schemes. Embedding such URLs into the
 * iframe would be a direct XSS vector if the registry was compromised or
 * a backend dev typo'd a value.
 *
 * Constraints enforced here:
 *   1. HTTPS only (HTTP allowed in non-production for local backend dev).
 *   2. Origin must match `COA_REGISTRY_BASE_URL` (origin pinning) — the
 *      registry should never reference PDFs hosted elsewhere.
 *   3. Path must start with the configured registry base path.
 */
const pdfUrlSchema = z.string().refine(
	(value) => {
		let parsed: URL;
		try {
			parsed = new URL(value);
		} catch {
			return false;
		}

		const isProd = process.env.NODE_ENV === "production";
		const allowedProtocols = isProd ? ["https:"] : ["https:", "http:"];
		if (!allowedProtocols.includes(parsed.protocol)) return false;

		// Origin-pin to the registry. If the env var isn't set, downstream code
		// already returns "registry_unavailable" before we get here, so this
		// branch only matters when the env IS set — in which case we enforce.
		const baseRaw = process.env.COA_REGISTRY_BASE_URL;
		if (!baseRaw) return true; // dev convenience; registry helper guards prod

		let base: URL;
		try {
			base = new URL(baseRaw);
		} catch {
			return false;
		}
		if (parsed.origin !== base.origin) return false;
		if (!parsed.pathname.startsWith(base.pathname.replace(/\/+$/, "") + "/")) return false;

		return true;
	},
	{ message: "pdfUrl must be HTTPS and within the configured COA registry origin" },
);

export const CoaStatusSchema = z.enum(["active", "superseded", "recalled"]);
export type CoaStatus = z.infer<typeof CoaStatusSchema>;

/**
 * Raw COA JSON record as published by the backend registry.
 *
 * Includes the optional `saleorVariantId` field for backend traceability.
 * The API route strips this before returning data to the page.
 */
export const CoaRecordSchema = z
	.object({
		token: z.string().regex(COA_TOKEN_REGEX, "Token must match XXXX-XXXX-XXXX format"),
		pdfUrl: pdfUrlSchema,
		pdfSha256: z.string().regex(SHA256_HEX_REGEX, "pdfSha256 must be a 64-char hex digest"),
		batchNumber: z.string().min(1).max(200),
		peptideName: z.string().min(1).max(200),
		issuedAt: z.string().regex(ISO_DATE_LOOSE, "issuedAt must be ISO 8601 (date or datetime)"),
		status: CoaStatusSchema,
		labName: z.string().min(1).max(200).optional(),
		recallReason: z.string().min(1).max(2000).optional(),
		supersededByToken: z.string().regex(COA_TOKEN_REGEX).optional(),
		// Backend-only field — never returned to the storefront page.
		saleorVariantId: z.string().min(1).max(500).optional(),
	})
	.superRefine((data, ctx) => {
		if (data.status === "recalled" && !data.recallReason) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["recallReason"],
				message: "recallReason is required when status is 'recalled'",
			});
		}
		if (data.status === "superseded" && !data.supersededByToken) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["supersededByToken"],
				message: "supersededByToken is required when status is 'superseded'",
			});
		}
	});

export type CoaRecord = z.infer<typeof CoaRecordSchema>;

/**
 * Public-facing COA shape returned by the storefront API to the page.
 *
 * Strips `saleorVariantId` (internal traceability only).
 */
export type PublicCoa = Omit<CoaRecord, "saleorVariantId">;

/**
 * Sanitize a validated registry record into the public response shape.
 */
export function toPublicCoa(record: CoaRecord): PublicCoa {
	// Destructure away saleorVariantId without referencing the unused binding.
	const { saleorVariantId: _internalOnly, ...publicFields } = record;
	void _internalOnly;
	return publicFields;
}

/** API success/failure response envelope. Mirrors docs/coa-checker-spec.md. */
export type CoaLookupResponse =
	| { ok: true; coa: PublicCoa }
	| { ok: false; error: "not_found" | "rate_limited" | "server_error"; message: string };
