/**
 * Query expansion: synonyms + typo tolerance
 *
 * Saleor's built-in `filter: { search }` is a plain Postgres full-text match —
 * it has no synonym table and no fuzzy matching. We add both in the storefront
 * by rewriting the query string BEFORE it reaches Saleor:
 *
 *  - Synonyms/aliases: brand names and abbreviations a shopper actually types
 *    ("ozempic", "bpc157") never appear in a product name, so the raw query
 *    matches nothing. We map them to the canonical compound term ("semaglutide",
 *    "bpc-157") that does appear.
 *  - Typo tolerance: when a query returns zero matches, the provider asks
 *    `fuzzyCorrectQuery` for the nearest known catalog term (Levenshtein) and
 *    retries once.
 *
 * This keeps the existing Saleor search; no backend/GraphQL change is involved.
 */

/** Split text into lowercase alphanumeric tokens (keeps `+` for terms like NAD+). */
export function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9+]+/i)
		.filter(Boolean);
}

/**
 * Canonical terms that exist in the catalog. Used as targets for fuzzy
 * correction. Both full compound names and their common short forms are listed
 * so "bpc-157" and "bpc" can each be matched. Extend as the catalog grows.
 */
export const CATALOG_TERMS: string[] = [
	// GLP-1 / incretin
	"semaglutide",
	"tirzepatide",
	"retatrutide",
	"glp-1",
	// Healing / repair
	"bpc-157",
	"bpc",
	"tb-500",
	"thymosin",
	// Growth-hormone secretagogues
	"cjc-1295",
	"cjc",
	"ipamorelin",
	"sermorelin",
	"tesamorelin",
	"hexarelin",
	"ghrp-2",
	"ghrp-6",
	// Cosmetic / skin / hair
	"ghk-cu",
	"ghk",
	"melanotan",
	"snap-8",
	"kpv",
	// Sexual health
	"pt-141",
	// Longevity / metabolic / other
	"mots-c",
	"nad+",
	"5-amino-1mq",
	"epithalon",
	"selank",
	"semax",
	"aod-9604",
	"kisspeptin",
	"dsip",
	"ss-31",
	"glutathione",
	"oxytocin",
];

/**
 * Synonym / alias map (lowercased keys → canonical search term).
 *
 * Scoped deliberately to high-precision rewrites where the user's term would
 * otherwise match NOTHING: brand names, spacing/hyphen variants, and common
 * misspellings. Broad goal words ("recovery", "energy") are intentionally NOT
 * mapped, since they'd narrow results to a single compound and Saleor's
 * full-text search already matches them against product descriptions.
 */
export const SYNONYMS: Record<string, string> = {
	// ── Brand names → compound (the raw brand never appears in catalog text) ──
	ozempic: "semaglutide",
	wegovy: "semaglutide",
	rybelsus: "semaglutide",
	mounjaro: "tirzepatide",
	zepbound: "tirzepatide",
	// ── Spacing / hyphen variants → canonical hyphenated form ──
	bpc: "bpc-157",
	bpc157: "bpc-157",
	"bpc 157": "bpc-157",
	tb500: "tb-500",
	"tb 500": "tb-500",
	tb4: "tb-500",
	ghk: "ghk-cu",
	ghkcu: "ghk-cu",
	"ghk cu": "ghk-cu",
	"copper peptide": "ghk-cu",
	cjc: "cjc-1295",
	cjc1295: "cjc-1295",
	"cjc 1295": "cjc-1295",
	pt141: "pt-141",
	"pt 141": "pt-141",
	motsc: "mots-c",
	"mots c": "mots-c",
	glp1: "glp-1",
	"glp 1": "glp-1",
	// ── Common misspellings ──
	semaglutid: "semaglutide",
	semiglutide: "semaglutide",
	semaglutides: "semaglutide",
	tirzepatid: "tirzepatide",
	tirzepetide: "tirzepatide",
	retatrutid: "retatrutide",
	ipamorlin: "ipamorelin",
	epitalon: "epithalon",
	// ── Well-known goal aliases (safe, single-compound mappings) ──
	tanning: "melanotan",
	tan: "melanotan",
};

export interface ExpandedQuery {
	/** The user's raw, trimmed query (for display / "did you mean"). */
	original: string;
	/** The string actually sent to Saleor (synonym-rewritten when applicable). */
	searchString: string;
	/** Tokens used for relevance scoring (derived from `searchString`). */
	scoringTerms: string[];
	/** True when a synonym/alias rewrite was applied. */
	appliedSynonym: boolean;
}

/**
 * Expand a raw query into the string we send to the backend plus the tokens we
 * score against. Whole-phrase synonyms win over token-level ones.
 */
export function expandQuery(raw: string): ExpandedQuery {
	const original = raw.trim();
	const normalized = original.toLowerCase().replace(/\s+/g, " ");

	// 1) Whole-phrase synonym (e.g. "copper peptide" → "ghk-cu").
	if (SYNONYMS[normalized]) {
		const searchString = SYNONYMS[normalized];
		return { original, searchString, scoringTerms: tokenize(searchString), appliedSynonym: true };
	}

	// 2) Token-level synonyms (e.g. "ozempic 5mg" → "semaglutide 5mg").
	const tokens = normalized.split(" ");
	let applied = false;
	const mapped = tokens.map((t) => {
		if (SYNONYMS[t]) {
			applied = true;
			return SYNONYMS[t];
		}
		return t;
	});

	// Preserve the user's original string when nothing was rewritten so we don't
	// strip casing/hyphens that Saleor's search may rely on.
	const searchString = applied ? mapped.join(" ") : original;
	return { original, searchString, scoringTerms: tokenize(searchString), appliedSynonym: applied };
}

/** Classic Levenshtein edit distance (iterative, two-row). */
export function levenshtein(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	let curr = new Array<number>(b.length + 1);

	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(
				prev[j] + 1, // deletion
				curr[j - 1] + 1, // insertion
				prev[j - 1] + cost, // substitution
			);
		}
		[prev, curr] = [curr, prev];
	}
	return prev[b.length];
}

/** Max edit distance allowed for a token of the given length (stricter when short). */
function maxDistanceFor(length: number): number {
	if (length <= 4) return 1;
	if (length <= 7) return 2;
	return 3;
}

/** Nearest catalog term within the length-scaled distance budget, or null. */
function nearestTerm(token: string): string | null {
	let best: { term: string; dist: number } | null = null;
	const budget = maxDistanceFor(token.length);
	for (const term of CATALOG_TERMS) {
		const candidate = term.toLowerCase();
		if (candidate === token) return null; // already correct — nothing to fix
		const dist = levenshtein(token, candidate);
		if (dist <= budget && (!best || dist < best.dist)) {
			best = { term, dist };
		}
	}
	return best ? best.term : null;
}

/**
 * Best-effort spelling correction for a query that returned no results.
 * Tries the whole string first, then corrects individual tokens. Returns the
 * corrected query string, or null when nothing is close enough to suggest.
 */
export function fuzzyCorrectQuery(raw: string): string | null {
	const normalized = raw.toLowerCase().trim().replace(/\s+/g, " ");
	if (normalized.length < 3) return null;

	// 1) Whole-string nearest term (handles single-token queries cleanly).
	const whole = nearestTerm(normalized);
	if (whole) return whole;

	// 2) Token-wise correction; rebuild the query if any token was fixed.
	const tokens = normalized.split(" ");
	let changed = false;
	const corrected = tokens.map((tok) => {
		if (tok.length < 3) return tok;
		const near = nearestTerm(tok);
		if (near) {
			changed = true;
			return near;
		}
		return tok;
	});

	return changed ? corrected.join(" ") : null;
}
