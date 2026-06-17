/**
 * Relevance scoring
 *
 * Saleor's `ProductOrderField` enum has no "relevance" option (it lives in the
 * upstream Saleor image, not this repo), so the previous implementation faked
 * relevance with `sortBy: RATING` — results came back ordered by rating, not by
 * how well they matched the query. A highly-rated partial match would outrank
 * an exact-name hit.
 *
 * Since Saleor already returns the matching set, we re-rank it here by computed
 * match quality. This is the only place relevance ordering CAN happen without a
 * dedicated search engine.
 */

/** Minimal shape needed to score a result. */
export interface Scorable {
	name: string;
	categoryName?: string | null;
}

const WORD_SPLIT = /[^a-z0-9+]+/i;

/**
 * Score a product against the query tokens. Higher is more relevant.
 *
 * Tiers (roughly): exact name > full-query prefix > whole-word term match >
 * word-prefix match > substring > category match. A small brevity bonus favors
 * shorter, more specific names ("BPC-157" over "BPC-157 + TB-500 Blend").
 */
export function scoreProduct(product: Scorable, terms: string[]): number {
	const cleanedTerms = terms.map((t) => t.toLowerCase()).filter(Boolean);
	if (cleanedTerms.length === 0) return 0;

	const name = product.name.toLowerCase();
	const category = (product.categoryName ?? "").toLowerCase();
	const fullQuery = cleanedTerms.join(" ");
	const nameWords = name.split(WORD_SPLIT).filter(Boolean);

	let score = 0;

	// Whole-query matches against the full name.
	if (name === fullQuery) {
		score += 1000;
	} else if (name.startsWith(fullQuery)) {
		score += 500;
	} else if (name.includes(fullQuery)) {
		score += 250;
	}

	// Per-term contributions.
	let allTermsAsWords = true;
	for (const term of cleanedTerms) {
		if (nameWords.includes(term)) {
			score += 120; // exact whole word in the name
		} else if (nameWords.some((w) => w.startsWith(term))) {
			score += 70; // prefix of a word ("sema" → "semaglutide")
		} else if (name.includes(term)) {
			score += 35; // loose substring
			allTermsAsWords = false;
		} else if (category.includes(term)) {
			score += 20; // category-only match
			allTermsAsWords = false;
		} else {
			allTermsAsWords = false;
		}
	}

	// Bonus when every query token is present as a discrete word.
	if (cleanedTerms.length > 1 && allTermsAsWords) {
		score += 150;
	}

	// Brevity bias: shorter names are more specific matches.
	score += Math.max(0, 40 - name.length) * 0.5;

	return score;
}

/**
 * Does the product genuinely match the query? This is the match test WITHOUT the
 * brevity bonus that `scoreProduct` always adds (which makes its score non-zero
 * even for non-matches). Use this to filter a full-catalog scan down to real hits
 * when Saleor's whole-word full-text search returns nothing — e.g. a word prefix
 * like "ipamor" → "Ipamorelin".
 */
export function matchesQuery(product: Scorable, terms: string[]): boolean {
	const cleanedTerms = terms.map((t) => t.toLowerCase()).filter(Boolean);
	if (cleanedTerms.length === 0) return false;

	const name = product.name.toLowerCase();
	const category = (product.categoryName ?? "").toLowerCase();
	const fullQuery = cleanedTerms.join(" ");
	const nameWords = name.split(WORD_SPLIT).filter(Boolean);

	if (name.includes(fullQuery)) return true;
	return cleanedTerms.some(
		(term) => nameWords.some((w) => w.startsWith(term)) || name.includes(term) || category.includes(term),
	);
}

/**
 * Stable-sort products by descending relevance score. Ties preserve the input
 * order (which the caller fixes deterministically, e.g. Saleor `NAME asc`).
 */
export function rankByRelevance<T extends Scorable>(products: T[], terms: string[]): T[] {
	return products
		.map((product, index) => ({ product, index, score: scoreProduct(product, terms) }))
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.map((entry) => entry.product);
}
