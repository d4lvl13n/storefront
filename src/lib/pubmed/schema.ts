/**
 * Public schema for the PubMed search proxy.
 *
 * The storefront's research library calls our `/api/pubmed/search` endpoint,
 * which proxies NCBI E-utilities (esearch + esummary) and returns this clean
 * shape. Upstream PubMed JSON is verbose and inconsistent; this layer hides
 * that.
 *
 * Used by:
 *   - `/api/pubmed/search/route.ts` (response shape)
 *   - `/[channel]/(main)/research-library/page.tsx` and its client
 *     components (typed via `z.infer<>`)
 */

import { z } from "zod";

/** Maximum results per request (NCBI hard cap is 10000; we cap much lower). */
export const PUBMED_MAX_RESULTS = 50;

/** Request validation for the storefront search proxy. */
export const PubmedSearchParamsSchema = z.object({
	q: z.string().trim().min(2, "Query must be at least 2 characters").max(200),
	limit: z.coerce.number().int().min(1).max(PUBMED_MAX_RESULTS).default(20),
	/** When true, prefer recent papers (last 5 years). Defaults to relevance. */
	recent: z
		.union([z.boolean(), z.string()])
		.optional()
		.transform((v) => v === true || v === "1" || v === "true"),
});
export type PubmedSearchParams = z.infer<typeof PubmedSearchParamsSchema>;

/** A single PubMed article in the form we hand to the UI. */
export const PubmedArticleSchema = z.object({
	pmid: z.string().regex(/^\d+$/),
	title: z.string().min(1),
	/** "Smith J, Doe M, Lee K" — already truncated to ~3 names + "et al." */
	authorsLine: z.string(),
	journal: z.string(),
	year: z
		.string()
		.regex(/^\d{4}$/)
		.optional(),
	/** Source citation, journal-style: "Nature. 2023;612(7940):412-419." */
	source: z.string(),
	/** Publication type buckets the UI cares about. */
	pubTypes: z.array(z.string()),
	/** DOI URL if PubMed surfaced one in the article ID list. */
	doiUrl: z.string().url().optional(),
	/** Canonical PubMed URL, always present. */
	pubmedUrl: z.string().url(),
});
export type PubmedArticle = z.infer<typeof PubmedArticleSchema>;

/** Response envelope mirroring the COA pattern. */
export type PubmedSearchResponse =
	| {
			ok: true;
			query: string;
			total: number;
			results: PubmedArticle[];
			/** Was this answered from Next's fetch cache? Useful for debugging. */
			cached?: boolean;
	  }
	| {
			ok: false;
			error: "invalid_query" | "rate_limited" | "upstream_error" | "server_error";
			message: string;
	  };
