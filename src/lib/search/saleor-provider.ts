/**
 * Saleor Search Implementation
 *
 * Uses Saleor's built-in GraphQL search (`filter: { search }`) and layers the
 * storefront-side smarts Saleor's Postgres search lacks:
 *
 *  - Synonyms / aliases  → query rewritten before the request (query-expansion).
 *  - Typo tolerance       → zero-result queries retried with a fuzzy correction.
 *  - True relevance order → matches re-ranked by match quality (relevance.ts),
 *    because Saleor's ProductOrderField has no relevance option.
 *
 * For a production-scale engine (typo tolerance at the index, synonyms, facets),
 * swap this provider for Typesense/Algolia/Meilisearch — the interface below is
 * all the rest of the app depends on.
 */

import { executePublicGraphQL } from "@/lib/graphql";
import { SearchProductsDocument, OrderDirection, ProductOrderField } from "@/gql/graphql";
import type { SearchProduct, SearchResult, SearchPagination, SearchCorrection } from "./types";
import { localeConfig } from "@/config/locale";
import { expandQuery, fuzzyCorrectQuery, tokenize } from "./query-expansion";
import { rankByRelevance, matchesQuery } from "./relevance";

interface SearchOptions {
	query: string;
	channel: string;
	limit?: number;
	cursor?: string;
	direction?: "forward" | "backward";
	sortBy?: "relevance" | "price-asc" | "price-desc" | "name" | "newest";
}

/**
 * How many matches to pull when ranking by relevance. We re-order the whole set
 * ourselves and paginate in memory, so we need them all in one request. The
 * catalog is well under this; oversized result sets are truncated (and the real
 * `totalCount` is still surfaced).
 */
const RELEVANCE_WINDOW = 100;

type SearchPageResult = {
	products: SearchProduct[];
	totalCount: number;
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		endCursor?: string | null;
		startCursor?: string | null;
	} | null;
};

/** One raw Saleor search request, transformed to SearchProduct[]. */
async function fetchPage(args: {
	search: string;
	channel: string;
	field: ProductOrderField;
	order: OrderDirection;
	first?: number;
	after?: string;
	last?: number;
	before?: string;
}): Promise<SearchPageResult> {
	const result = await executePublicGraphQL(SearchProductsDocument, {
		variables: {
			search: args.search,
			channel: args.channel,
			sortBy: args.field,
			sortDirection: args.order,
			first: args.first,
			after: args.after,
			last: args.last,
			before: args.before,
		},
		revalidate: 60,
	});

	if (!result.ok || !result.data.products) {
		return { products: [], totalCount: 0, pageInfo: null };
	}

	const products = result.data.products;
	return {
		products: products.edges.map(({ node }) => toSearchProduct(node)),
		totalCount: products.totalCount ?? 0,
		pageInfo: products.pageInfo,
	};
}

function toSearchProduct(node: {
	id: string;
	name: string;
	slug: string;
	thumbnail?: { url: string; alt?: string | null } | null;
	pricing?: { priceRange?: { start?: { gross: { amount: number; currency: string } } | null } | null } | null;
	category?: { name: string } | null;
}): SearchProduct {
	return {
		id: node.id,
		name: node.name,
		slug: node.slug,
		thumbnailUrl: node.thumbnail?.url,
		thumbnailAlt: node.thumbnail?.alt,
		price: node.pricing?.priceRange?.start?.gross.amount ?? 0,
		currency: node.pricing?.priceRange?.start?.gross.currency ?? localeConfig.fallbackCurrency,
		categoryName: node.category?.name,
	};
}

/**
 * Full-catalog fallback for queries Saleor's whole-word full-text search can't
 * match — most commonly a word PREFIX ("ipamor" → "Ipamorelin"), which Saleor's
 * Postgres search returns nothing for. The catalog is small, so we pull it in one
 * (cached) name-ordered request and keep only genuine matches, using the same
 * matcher the relevance ranker trusts. Caller still ranks/slices the result.
 */
async function catalogFallback(channel: string, terms: string[]): Promise<SearchProduct[]> {
	if (terms.length === 0) return [];
	const catalog = await fetchPage({
		search: "", // empty search = whole catalog
		channel,
		field: ProductOrderField.Name,
		order: OrderDirection.Asc,
		first: RELEVANCE_WINDOW,
	});
	return catalog.products.filter((product) => matchesQuery(product, terms));
}

/**
 * Search products. `relevance` (the default) re-ranks results by match quality;
 * the other sorts pass straight through to Saleor's cursor pagination.
 */
export async function searchProducts(options: SearchOptions): Promise<SearchResult> {
	const { query, channel, limit = 20, cursor, direction = "forward", sortBy = "relevance" } = options;
	const expanded = expandQuery(query);

	if (sortBy === "relevance") {
		return relevanceSearch({ query, expanded, channel, limit, cursor });
	}

	// ── Deterministic Saleor sorts: keep native cursor pagination ──────────────
	const { field, order } = mapSortToSaleor(sortBy);
	const isBackward = direction === "backward" && Boolean(cursor);

	let page = await fetchPage({
		search: expanded.searchString,
		channel,
		field,
		order,
		first: isBackward ? undefined : limit,
		after: isBackward ? undefined : cursor,
		last: isBackward ? limit : undefined,
		before: isBackward ? cursor : undefined,
	});

	let correction = synonymCorrection(query, expanded);

	// Typo fallback: nothing matched → retry once with a spelling correction.
	if (page.totalCount === 0 && !cursor) {
		const corrected = fuzzyCorrectQuery(expanded.original);
		if (corrected && corrected.toLowerCase() !== expanded.searchString.toLowerCase()) {
			const retry = await fetchPage({ search: corrected, channel, field, order, first: limit });
			if (retry.totalCount > 0) {
				page = retry;
				correction = { original: query, searchedFor: corrected, didYouMean: corrected };
			}
		}
	}

	return {
		products: page.products,
		correction,
		pagination: {
			totalCount: page.totalCount,
			hasNextPage: page.pageInfo?.hasNextPage ?? false,
			hasPreviousPage: page.pageInfo?.hasPreviousPage ?? false,
			nextCursor: page.pageInfo?.endCursor ?? undefined,
			prevCursor: page.pageInfo?.startCursor ?? undefined,
		},
	};
}

/**
 * Relevance path: pull a wide window, rank by match quality, and offset-paginate
 * in memory. The `cursor` is a numeric offset (not a Saleor cursor); the
 * existing Pagination component round-trips it transparently.
 */
async function relevanceSearch(args: {
	query: string;
	expanded: ReturnType<typeof expandQuery>;
	channel: string;
	limit: number;
	cursor?: string;
}): Promise<SearchResult> {
	const { query, expanded, channel, limit } = args;
	const offset = Math.max(0, Number.parseInt(args.cursor ?? "0", 10) || 0);

	let window = await fetchPage({
		search: expanded.searchString,
		channel,
		field: ProductOrderField.Name,
		order: OrderDirection.Asc,
		first: RELEVANCE_WINDOW,
	});

	let correction = synonymCorrection(query, expanded);
	let scoringTerms = expanded.scoringTerms;

	// Typo fallback before ranking.
	if (window.totalCount === 0) {
		const corrected = fuzzyCorrectQuery(expanded.original);
		if (corrected && corrected.toLowerCase() !== expanded.searchString.toLowerCase()) {
			const retry = await fetchPage({
				search: corrected,
				channel,
				field: ProductOrderField.Name,
				order: OrderDirection.Asc,
				first: RELEVANCE_WINDOW,
			});
			if (retry.totalCount > 0) {
				window = retry;
				correction = { original: query, searchedFor: corrected, didYouMean: corrected };
				scoringTerms = tokenize(corrected);
			}
		}
	}

	// Prefix/substring fallback: Saleor matches whole words only, so "ipamor"
	// returns nothing. Scan the small catalog for real matches before ranking.
	if (window.totalCount === 0) {
		const fallback = await catalogFallback(channel, scoringTerms);
		if (fallback.length > 0) {
			window = { products: fallback, totalCount: fallback.length, pageInfo: null };
		}
	}

	const ranked = rankByRelevance(window.products, scoringTerms);
	const pageItems = ranked.slice(offset, offset + limit);
	const rankedCount = ranked.length;

	const pagination: SearchPagination = {
		totalCount: window.totalCount,
		hasNextPage: offset + limit < rankedCount,
		hasPreviousPage: offset > 0,
		nextCursor: offset + limit < rankedCount ? String(offset + limit) : undefined,
		prevCursor: offset > 0 ? String(Math.max(0, offset - limit)) : undefined,
	};

	return { products: pageItems, pagination, correction };
}

/**
 * Lightweight autocomplete: synonym-expand, fetch a small window, rank, and
 * return the top `limit`. Powers the header search dropdown.
 */
export async function suggestProducts(options: {
	query: string;
	channel: string;
	limit?: number;
}): Promise<{ products: SearchProduct[]; totalCount: number; correction?: SearchCorrection }> {
	const { query, channel, limit = 6 } = options;
	const expanded = expandQuery(query);

	let window = await fetchPage({
		search: expanded.searchString,
		channel,
		field: ProductOrderField.Name,
		order: OrderDirection.Asc,
		first: Math.max(limit * 4, 24),
	});

	let correction = synonymCorrection(query, expanded);
	let scoringTerms = expanded.scoringTerms;

	if (window.totalCount === 0) {
		const corrected = fuzzyCorrectQuery(expanded.original);
		if (corrected && corrected.toLowerCase() !== expanded.searchString.toLowerCase()) {
			const retry = await fetchPage({
				search: corrected,
				channel,
				field: ProductOrderField.Name,
				order: OrderDirection.Asc,
				first: Math.max(limit * 4, 24),
			});
			if (retry.totalCount > 0) {
				window = retry;
				correction = { original: query, searchedFor: corrected, didYouMean: corrected };
				scoringTerms = tokenize(corrected);
			}
		}
	}

	// Prefix/substring fallback (e.g. "ipamor" → "Ipamorelin"): Saleor's
	// full-text search matches whole words only, so scan the small catalog.
	if (window.totalCount === 0) {
		const fallback = await catalogFallback(channel, scoringTerms);
		if (fallback.length > 0) {
			window = { products: fallback, totalCount: fallback.length, pageInfo: null };
		}
	}

	const products = rankByRelevance(window.products, scoringTerms).slice(0, limit);
	return { products, totalCount: window.totalCount, correction };
}

/** Build a correction note when a synonym rewrite changed the searched term. */
function synonymCorrection(
	query: string,
	expanded: ReturnType<typeof expandQuery>,
): SearchCorrection | undefined {
	if (!expanded.appliedSynonym) return undefined;
	if (expanded.searchString.toLowerCase() === query.trim().toLowerCase()) return undefined;
	return { original: query, searchedFor: expanded.searchString };
}

function mapSortToSaleor(sortBy: SearchOptions["sortBy"]): {
	field: ProductOrderField;
	order: OrderDirection;
} {
	switch (sortBy) {
		case "price-asc":
			return { field: ProductOrderField.MinimalPrice, order: OrderDirection.Asc };
		case "price-desc":
			return { field: ProductOrderField.MinimalPrice, order: OrderDirection.Desc };
		case "name":
			return { field: ProductOrderField.Name, order: OrderDirection.Asc };
		case "newest":
			return { field: ProductOrderField.Date, order: OrderDirection.Desc };
		case "relevance":
		default:
			// Relevance is handled by relevanceSearch(); this is only a fallback.
			return { field: ProductOrderField.Rating, order: OrderDirection.Desc };
	}
}
