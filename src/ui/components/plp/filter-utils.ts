/**
 * Product filtering and sorting utilities.
 *
 * Server-side filters (handled by Saleor GraphQL):
 * - categories: via ProductFilterInput.categories (requires IDs)
 * - price: via ProductFilterInput.price range
 *
 * Client-side filters (handled here):
 * - colors: Saleor doesn't support attribute filtering without IDs
 * - sizes: Same as colors
 *
 * Note: Server-only functions (like resolveCategorySlugsToIds) are in filter-utils.server.ts
 */

import type { ProductOrder, ProductOrderField, OrderDirection, ProductFilterInput } from "@/gql/graphql";
import { compareSizes } from "@/lib/sizes";
import type { ProductCardData } from "./product-card";
import type { FilterOption, ActiveFilter, SortOption } from "./filter-bar";

// ============================================================================
// Types
// ============================================================================

export interface CategoryOption {
	id: string;
	name: string;
	slug: string;
	count: number;
}

// ============================================================================
// Static Price Ranges (for server-side filtering)
// ============================================================================

export const STATIC_PRICE_RANGES = [
	{ label: "Under $50", value: "0-50" },
	{ label: "$50 - $100", value: "50-100" },
	{ label: "$100 - $200", value: "100-200" },
	{ label: "$200+", value: "200-" },
] as const;

/** Price ranges with count=0 for FilterBar compatibility */
export const STATIC_PRICE_RANGES_WITH_COUNT = STATIC_PRICE_RANGES.map((r) => ({ ...r, count: 0 }));

// ============================================================================
// Server-side: Saleor GraphQL Filters
// ============================================================================

/**
 * Build Saleor ProductFilterInput from URL params.
 */
export function buildFilterVariables(params: {
	priceRange?: string | null;
	categoryIds?: string[];
}): ProductFilterInput | undefined {
	const filter: ProductFilterInput = {};
	let hasFilter = false;

	if (params.categoryIds?.length) {
		filter.categories = params.categoryIds;
		hasFilter = true;
	}

	if (params.priceRange) {
		const [minStr, maxStr] = params.priceRange.split("-");
		const min = parseFloat(minStr) || 0;
		const max = maxStr ? parseFloat(maxStr) : undefined;
		filter.price = { gte: min, ...(max && { lte: max }) };
		hasFilter = true;
	}

	return hasFilter ? filter : undefined;
}

/**
 * Build Saleor ProductOrder from sort option.
 */
export function buildSortVariables(sort: SortOption | string | undefined): ProductOrder | undefined {
	if (!sort || sort === "featured") return undefined;

	const sortMap: Record<string, { field: ProductOrderField; direction: OrderDirection }> = {
		newest: { field: "DATE" as ProductOrderField, direction: "DESC" as OrderDirection },
		price_asc: { field: "PRICE" as ProductOrderField, direction: "ASC" as OrderDirection },
		price_desc: { field: "PRICE" as ProductOrderField, direction: "DESC" as OrderDirection },
		bestselling: { field: "RATING" as ProductOrderField, direction: "DESC" as OrderDirection },
	};

	return sortMap[sort];
}

// ============================================================================
// Curated merchandising: pinned-lead products
// ============================================================================

/**
 * Products to float to the front of a grid's default ("featured") view, in this
 * order. Saleor has no manual product ordering for categories, so we curate it
 * here. Matched by slug (stable across name edits).
 */
export const PINNED_LEAD_SLUGS = ["glp-1", "glp-2", "glp-3"] as const;

/**
 * Products to sink to the END of a grid's default view, in this order. The
 * mirror of PINNED_LEAD_SLUGS — for low-priority / de-emphasised products.
 */
export const PINNED_TRAIL_SLUGS = [
	"aod-9604",
	"epithalon",
	"igf-1-lr3",
	"kpv",
	"melanotan-2",
	"oxytocin",
	"thymosin-alpha-1",
] as const;

/**
 * Float the curated products to the front, preserving the order of everything
 * else. No-op when none of the pinned products are present. Apply only on the
 * default/featured view so it never overrides a shopper's explicit sort.
 */
export function applyPinnedLead<T extends { slug: string }>(products: T[]): T[] {
	const rank = new Map<string, number>(PINNED_LEAD_SLUGS.map((slug, i) => [slug, i]));
	const pinned = products
		.filter((p) => rank.has(p.slug))
		.sort((a, b) => rank.get(a.slug)! - rank.get(b.slug)!);
	if (pinned.length === 0) return products;
	const pinnedSlugs = new Set(pinned.map((p) => p.slug));
	return [...pinned, ...products.filter((p) => !pinnedSlugs.has(p.slug))];
}

/**
 * Sink the curated products to the END, preserving the order of everything else.
 * No-op when none are present. Mirror of applyPinnedLead; apply only on the
 * default/featured view.
 */
export function applyPinnedTrail<T extends { slug: string }>(products: T[]): T[] {
	const rank = new Map<string, number>(PINNED_TRAIL_SLUGS.map((slug, i) => [slug, i]));
	const trailed = products
		.filter((p) => rank.has(p.slug))
		.sort((a, b) => rank.get(a.slug)! - rank.get(b.slug)!);
	if (trailed.length === 0) return products;
	const trailedSlugs = new Set(trailed.map((p) => p.slug));
	return [...products.filter((p) => !trailedSlugs.has(p.slug)), ...trailed];
}

/**
 * Offset-paginate an in-memory list. The numeric cursor is round-tripped by the
 * shared <Pagination> component transparently (same approach the search results
 * page uses), so curated ordering survives pagination. `cursor` is an absolute
 * offset; `direction` is irrelevant because the offset is absolute.
 */
export function paginateInMemory<T>(items: T[], cursor: string | undefined, pageSize: number) {
	const offset = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0);
	const hasNext = offset + pageSize < items.length;
	const hasPrev = offset > 0;
	return {
		items: items.slice(offset, offset + pageSize),
		totalCount: items.length,
		pageInfo: {
			hasNextPage: hasNext,
			hasPreviousPage: hasPrev,
			startCursor: hasPrev ? String(Math.max(0, offset - pageSize)) : null,
			endCursor: hasNext ? String(offset + pageSize) : null,
		},
	};
}

// ============================================================================
// Client-side: Extract Filter Options from Products
// ============================================================================

/**
 * Extract unique category options from products with counts.
 */
export function extractCategoryOptions(products: ProductCardData[]): CategoryOption[] {
	const map = new Map<string, CategoryOption>();

	for (const product of products) {
		if (product.category) {
			const existing = map.get(product.category.slug);
			if (existing) {
				existing.count++;
			} else {
				map.set(product.category.slug, {
					id: product.category.id,
					name: product.category.name,
					slug: product.category.slug,
					count: 1,
				});
			}
		}
	}

	return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * Extract unique color options from products.
 * Selected colors are always included (with count 0) so users can deselect them.
 */
export function extractColorOptions(products: ProductCardData[], selectedColors?: string[]): FilterOption[] {
	const map = new Map<string, { count: number; hex?: string }>();

	for (const product of products) {
		product.colors?.forEach((color) => {
			const existing = map.get(color.name);
			if (existing) {
				existing.count++;
			} else {
				map.set(color.name, { count: 1, hex: color.hex });
			}
		});
	}

	// Ensure selected colors are always shown
	selectedColors?.forEach((color) => {
		if (!map.has(color)) map.set(color, { count: 0 });
	});

	return Array.from(map.entries())
		.map(([name, { count, hex }]) => ({ name, count, hex }))
		.sort((a, b) => b.count - a.count);
}

/**
 * Extract unique size options from products.
 * Selected sizes are always included (with count 0) so users can deselect them.
 */
export function extractSizeOptions(products: ProductCardData[], selectedSizes?: string[]): FilterOption[] {
	const map = new Map<string, number>();

	for (const product of products) {
		product.sizes?.forEach((size) => {
			map.set(size, (map.get(size) || 0) + 1);
		});
	}

	// Ensure selected sizes are always shown
	selectedSizes?.forEach((size) => {
		if (!map.has(size)) map.set(size, 0);
	});

	// Sort sizes in logical order
	return Array.from(map.entries())
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => compareSizes(a.name, b.name));
}

// ============================================================================
// Client-side: Apply Filters & Sort
// ============================================================================

/**
 * Filter products by colors and sizes (client-side).
 * Categories and price are filtered server-side via GraphQL.
 */
export function filterProducts(
	products: ProductCardData[],
	filters: { colors?: string[]; sizes?: string[] },
): ProductCardData[] {
	let filtered = products;

	if (filters.colors?.length) {
		filtered = filtered.filter((p) => p.colors?.some((c) => filters.colors!.includes(c.name)));
	}

	if (filters.sizes?.length) {
		filtered = filtered.filter((p) => p.sizes?.some((s) => filters.sizes!.includes(s)));
	}

	return filtered;
}

/**
 * Sort products client-side (fallback when server sort not applied).
 */
export function sortProductsClientSide<T extends { price: number; createdAt?: string | null }>(
	products: T[],
	sort: SortOption | string,
): T[] {
	const sorted = [...products];

	switch (sort) {
		case "price_asc":
			return sorted.sort((a, b) => a.price - b.price);
		case "price_desc":
			return sorted.sort((a, b) => b.price - a.price);
		case "newest":
			return sorted.sort((a, b) => {
				const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				return dateB - dateA;
			});
		default:
			return sorted;
	}
}

// ============================================================================
// Active Filters Display
// ============================================================================

/**
 * Build active filters array for display.
 * Note: Categories are added separately from resolved server data.
 */
export function buildActiveFilters(filters: {
	colors?: string[];
	sizes?: string[];
	priceRange?: string | null;
}): ActiveFilter[] {
	const active: ActiveFilter[] = [];

	filters.colors?.forEach((color) => {
		active.push({ key: "color", label: "Color", value: color });
	});

	filters.sizes?.forEach((size) => {
		active.push({ key: "size", label: "Vial size", value: size });
	});

	if (filters.priceRange) {
		const [min, max] = filters.priceRange.split("-");
		const label = max ? `$${min} - $${max}` : `$${min}+`;
		active.push({ key: "price", label: "Price", value: label });
	}

	return active;
}
