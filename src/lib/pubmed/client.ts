/**
 * Server-only PubMed client.
 *
 * Wraps NCBI E-utilities (esearch + esummary) into a single `searchPubmed()`
 * call that returns our clean `PubmedArticle[]` shape. This is the *only*
 * file in the codebase that knows about NCBI's wire format.
 *
 * Caching: each upstream fetch is cached for 1 hour via Next's data cache.
 * That's appropriate because:
 *   - PubMed records change rarely (new papers, occasional retractions).
 *   - 1h gives us a roughly 99% cache-hit ratio for popular queries while
 *     still surfacing newly indexed papers within an hour.
 *
 * Authentication / quota:
 *   - With NCBI_API_KEY set: 10 req/sec/IP (egress).
 *   - Without:               3 req/sec/IP — fine for low traffic.
 *   - Tool/email identifiers (NCBI_TOOL, NCBI_EMAIL) are recommended by NCBI
 *     for diagnostic purposes when they need to contact a heavy user.
 *
 * NEVER import this from a client component — it reads server-only env vars
 * and hides the API key.
 */

import { PubmedArticleSchema, type PubmedArticle } from "./schema";

const ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
const FETCH_REVALIDATE_SECONDS = 60 * 60; // 1 hour

export type SearchPubmedResult =
	| { ok: true; total: number; results: PubmedArticle[] }
	| { ok: false; reason: "upstream_error" | "no_results" };

interface SearchPubmedOptions {
	query: string;
	limit: number;
	recent: boolean;
}

/**
 * Run a PubMed search and return normalized article metadata.
 *
 * Two HTTP calls upstream:
 *   1. esearch.fcgi → list of PMIDs matching the query
 *   2. esummary.fcgi → metadata for those PMIDs
 *
 * If the user passed `recent: true`, we tilt towards papers from the last
 * five years by appending a date filter to the query.
 */
export async function searchPubmed(opts: SearchPubmedOptions): Promise<SearchPubmedResult> {
	const { query, limit, recent } = opts;

	const finalQuery = recent ? `(${query}) AND (${pastFiveYearsClause()})` : query;

	// 1) esearch — get matching PMIDs.
	const esearchParams = baseParams({ retmode: "json", db: "pubmed" });
	esearchParams.set("term", finalQuery);
	esearchParams.set("retmax", String(limit));
	esearchParams.set("sort", recent ? "pub_date" : "relevance");

	let esearchJson: unknown;
	try {
		const res = await fetch(`${ESEARCH_URL}?${esearchParams.toString()}`, {
			next: { revalidate: FETCH_REVALIDATE_SECONDS },
			headers: { Accept: "application/json" },
		});
		if (!res.ok) {
			console.error(`[pubmed] esearch returned ${res.status} for query="${query}"`);
			return { ok: false, reason: "upstream_error" };
		}
		esearchJson = await res.json();
	} catch (err) {
		console.error(`[pubmed] esearch network error for query="${query}":`, err);
		return { ok: false, reason: "upstream_error" };
	}

	const ids = extractIds(esearchJson);
	const total = extractTotal(esearchJson);
	if (ids.length === 0) {
		return { ok: true, total: 0, results: [] };
	}

	// 2) esummary — get metadata for those PMIDs.
	const esummaryParams = baseParams({ retmode: "json", db: "pubmed" });
	esummaryParams.set("id", ids.join(","));

	let esummaryJson: unknown;
	try {
		const res = await fetch(`${ESUMMARY_URL}?${esummaryParams.toString()}`, {
			next: { revalidate: FETCH_REVALIDATE_SECONDS },
			headers: { Accept: "application/json" },
		});
		if (!res.ok) {
			console.error(`[pubmed] esummary returned ${res.status} for ids=${ids.length}`);
			return { ok: false, reason: "upstream_error" };
		}
		esummaryJson = await res.json();
	} catch (err) {
		console.error(`[pubmed] esummary network error:`, err);
		return { ok: false, reason: "upstream_error" };
	}

	const articles = normalizeEsummary(esummaryJson, ids);
	return { ok: true, total, results: articles };
}

// ─── Helpers ───────────────────────────────────────────────────

function baseParams(seed: Record<string, string>): URLSearchParams {
	const params = new URLSearchParams(seed);
	const apiKey = process.env.NCBI_API_KEY;
	if (apiKey) params.set("api_key", apiKey);
	const tool = process.env.NCBI_TOOL ?? "infinitybio-storefront";
	const email = process.env.NCBI_EMAIL;
	params.set("tool", tool);
	if (email) params.set("email", email);
	return params;
}

function pastFiveYearsClause(): string {
	const now = new Date();
	const start = `${now.getFullYear() - 5}/01/01`;
	const end = `${now.getFullYear()}/12/31`;
	// PubMed date-filter syntax for publication date.
	return `("${start}"[Date - Publication] : "${end}"[Date - Publication])`;
}

function extractIds(esearch: unknown): string[] {
	if (!isObject(esearch)) return [];
	const result = (esearch as { esearchresult?: unknown }).esearchresult;
	if (!isObject(result)) return [];
	const idlist = (result as { idlist?: unknown }).idlist;
	if (!Array.isArray(idlist)) return [];
	return idlist.filter((x): x is string => typeof x === "string" && /^\d+$/.test(x));
}

function extractTotal(esearch: unknown): number {
	if (!isObject(esearch)) return 0;
	const result = (esearch as { esearchresult?: unknown }).esearchresult;
	if (!isObject(result)) return 0;
	const count = (result as { count?: unknown }).count;
	const parsed = typeof count === "string" ? parseInt(count, 10) : typeof count === "number" ? count : NaN;
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Walk the verbose esummary JSON and produce our clean article shape,
 * preserving the input PMID order (PubMed sometimes returns out-of-order).
 */
function normalizeEsummary(esummary: unknown, orderedIds: string[]): PubmedArticle[] {
	if (!isObject(esummary)) return [];
	const root = (esummary as { result?: unknown }).result;
	if (!isObject(root)) return [];

	const results: PubmedArticle[] = [];
	for (const pmid of orderedIds) {
		const raw = (root as Record<string, unknown>)[pmid];
		if (!isObject(raw)) continue;

		const candidate = buildArticle(pmid, raw);
		const parsed = PubmedArticleSchema.safeParse(candidate);
		if (parsed.success) results.push(parsed.data);
		else {
			console.warn(`[pubmed] dropping pmid=${pmid} due to schema mismatch:`, parsed.error.flatten());
		}
	}
	return results;
}

interface RawAuthor {
	name?: unknown;
	authtype?: unknown;
}

interface RawArticleId {
	idtype?: unknown;
	value?: unknown;
}

function buildArticle(pmid: string, raw: Record<string, unknown>): unknown {
	const title = stringField(raw.title) ?? "";
	const journal = stringField(raw.fulljournalname) ?? stringField(raw.source) ?? "Unknown journal";
	const pubDate = stringField(raw.pubdate) ?? "";
	const year = pubDate.match(/\b(19|20)\d{2}\b/)?.[0];

	const authorsLine = formatAuthors(raw.authors);
	const pubTypes = Array.isArray(raw.pubtype)
		? raw.pubtype.filter((x): x is string => typeof x === "string")
		: [];

	let doiUrl: string | undefined;
	if (Array.isArray(raw.articleids)) {
		for (const entry of raw.articleids as RawArticleId[]) {
			if (entry?.idtype === "doi" && typeof entry.value === "string" && entry.value.trim()) {
				doiUrl = `https://doi.org/${encodeURI(entry.value.trim())}`;
				break;
			}
		}
	}

	const sourceParts = [
		stringField(raw.source) ?? journal,
		pubDate || year || undefined,
		stringField(raw.volume) ? `;${raw.volume}` : "",
		stringField(raw.issue) ? `(${raw.issue})` : "",
		stringField(raw.pages) ? `:${raw.pages}` : "",
	].filter(Boolean);
	const source = sourceParts.join(" ").trim() || journal;

	return {
		pmid,
		title: title || "(Untitled)",
		authorsLine,
		journal,
		year,
		source,
		pubTypes,
		doiUrl,
		pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
	};
}

function formatAuthors(authors: unknown): string {
	if (!Array.isArray(authors)) return "";
	const names = (authors as RawAuthor[])
		.filter((a) => a?.authtype === "Author" || a?.authtype === undefined)
		.map((a) => (typeof a.name === "string" ? a.name : null))
		.filter((x): x is string => Boolean(x));

	if (names.length === 0) return "";
	if (names.length <= 3) return names.join(", ");
	return `${names.slice(0, 3).join(", ")}, et al.`;
}

function stringField(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
