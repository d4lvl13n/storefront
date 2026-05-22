import { type MetadataRoute } from "next";
import { DefaultChannelSlug } from "@/app/config";
import { CategoriesListDocument, CollectionsListDocument, ProductListPaginatedDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { getBaseUrl } from "@/lib/seo";

/**
 * XML sitemap for search engines.
 *
 * Mounted at `/sitemap.xml` via Next 16's metadata-routes convention.
 * The `Sitemap:` directive in `src/app/robots.ts` advertises this URL to
 * crawlers, but submit it manually in Search Console / Bing Webmaster
 * Tools too so the verified property starts processing it immediately.
 *
 * Caching: each Saleor query is cached for 1 hour at the GraphQL layer
 * (via `revalidate: 3600`), so re-renders are cheap. We don't use the
 * `"use cache"` directive because `cacheComponents` is disabled in
 * next.config.js — falling back to per-request rendering with cached
 * upstream calls is the right tradeoff until cacheComponents stabilizes.
 *
 * Catalog limit: 500 products / 200 categories / 100 collections covers
 * the current catalog with headroom. Bump these if the SKU count grows
 * past ~400 (Saleor caps `first` at 100 per request — we'd then need
 * cursor pagination, ~30 lines).
 */

const REVALIDATE_SECONDS = 3600;
const PRODUCT_LIMIT = 500;
const CATEGORY_LIMIT = 200;
const COLLECTION_LIMIT = 100;

/**
 * Static channel-scoped routes. The empty string represents the channel
 * root (e.g., `/us-us`). Gated routes (`/cart`, `/checkout`, `/login`,
 * `/account/*`, `/orders`, `/search`) are intentionally excluded — they
 * either require auth or are listed in `noIndexPaths` in seo config.
 */
const STATIC_ROUTES: ReadonlyArray<{
	path: string;
	priority: number;
	changeFrequency: "weekly" | "monthly" | "yearly";
}> = [
	{ path: "", priority: 1.0, changeFrequency: "weekly" },
	{ path: "products", priority: 0.9, changeFrequency: "weekly" },
	{ path: "about", priority: 0.6, changeFrequency: "monthly" },
	{ path: "contact", priority: 0.5, changeFrequency: "yearly" },
	{ path: "faq", priority: 0.6, changeFrequency: "monthly" },
	{ path: "peptide-calculator", priority: 0.8, changeFrequency: "monthly" },
	{ path: "research-library", priority: 0.7, changeFrequency: "weekly" },
	{ path: "coa", priority: 0.7, changeFrequency: "monthly" },
	{ path: "track-order", priority: 0.3, changeFrequency: "yearly" },
	{ path: "affiliate", priority: 0.5, changeFrequency: "monthly" },
	{ path: "waiver", priority: 0.3, changeFrequency: "yearly" },
	{ path: "ruo-policy", priority: 0.3, changeFrequency: "yearly" },
	{ path: "privacy", priority: 0.3, changeFrequency: "yearly" },
	{ path: "terms", priority: 0.3, changeFrequency: "yearly" },
];

function buildUrl(base: string, channel: string, ...segments: string[]): string {
	const path = segments.filter(Boolean).join("/");
	return path ? `${base}/${channel}/${path}` : `${base}/${channel}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = getBaseUrl().replace(/\/$/, "");
	const channel = DefaultChannelSlug;

	// Without a configured channel there are no canonical URLs to advertise.
	if (!channel) {
		console.warn("[sitemap] DefaultChannelSlug is not configured; returning empty sitemap.");
		return [];
	}

	const now = new Date();
	const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
		url: buildUrl(base, channel, path),
		lastModified: now,
		changeFrequency,
		priority,
	}));

	// Run catalog queries in parallel; any individual failure is logged but
	// must not block the rest of the sitemap from generating.
	const [productsResult, categoriesResult, collectionsResult] = await Promise.all([
		executePublicGraphQL(ProductListPaginatedDocument, {
			variables: { first: PRODUCT_LIMIT, channel },
			revalidate: REVALIDATE_SECONDS,
		}),
		executePublicGraphQL(CategoriesListDocument, {
			variables: { first: CATEGORY_LIMIT },
			revalidate: REVALIDATE_SECONDS,
		}),
		executePublicGraphQL(CollectionsListDocument, {
			variables: { first: COLLECTION_LIMIT, channel },
			revalidate: REVALIDATE_SECONDS,
		}),
	]);

	if (productsResult.ok && productsResult.data.products) {
		for (const edge of productsResult.data.products.edges) {
			const slug = edge.node.slug;
			if (!slug) continue;
			entries.push({
				url: buildUrl(base, channel, "products", slug),
				lastModified: now,
				changeFrequency: "weekly",
				priority: 0.9,
			});
		}
	} else if (!productsResult.ok) {
		console.warn("[sitemap] Failed to fetch products:", productsResult.error.message);
	}

	if (categoriesResult.ok && categoriesResult.data.categories) {
		for (const edge of categoriesResult.data.categories.edges) {
			const slug = edge.node.slug;
			if (!slug) continue;
			entries.push({
				url: buildUrl(base, channel, "categories", slug),
				lastModified: now,
				changeFrequency: "weekly",
				priority: 0.8,
			});
		}
	} else if (!categoriesResult.ok) {
		console.warn("[sitemap] Failed to fetch categories:", categoriesResult.error.message);
	}

	if (collectionsResult.ok && collectionsResult.data.collections) {
		for (const edge of collectionsResult.data.collections.edges) {
			const slug = edge.node.slug;
			if (!slug) continue;
			entries.push({
				url: buildUrl(base, channel, "collections", slug),
				lastModified: now,
				changeFrequency: "weekly",
				priority: 0.7,
			});
		}
	} else if (!collectionsResult.ok) {
		console.warn("[sitemap] Failed to fetch collections:", collectionsResult.error.message);
	}

	return entries;
}
