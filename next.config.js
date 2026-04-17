/** @type {import('next').NextConfig} */
const config = {
	// Native modules that must not be bundled by webpack/turbopack
	serverExternalPackages: ["better-sqlite3"],

	// FINDING-10: Remove X-Powered-By header
	poweredByHeader: false,
	// Cache Components (Partial Prerendering) — DISABLED
	// Production refreshes intermittently lose the main route subtree due to
	// hydration/resumability mismatches, so keep this off until the app is stable.
	cacheComponents: false,

	// Optimize barrel file imports for better bundle size and cold start performance
	// See: https://vercel.com/blog/how-we-optimized-package-imports-in-next-js
	experimental: {
		optimizePackageImports: ["lodash-es"],
		// Note: API rate limiting is handled by RequestQueue in src/lib/graphql.ts
		// (max 3 concurrent requests + 200ms delay between requests)
	},
	images: {
		// Saleor already serves optimized thumbnails, and the Next.js image optimizer
		// can't reach the external API URL from inside the Docker container.
		unoptimized: true,
		remotePatterns: [
			{
				// Saleor Cloud CDN
				hostname: "*.saleor.cloud",
			},
			{
				// Saleor Media (common pattern)
				hostname: "*.media.saleor.cloud",
			},
			{
				// Allow all hostnames in development (restrict in production)
				hostname: "*",
			},
		],
	},
	typedRoutes: false,

	// Used in the Dockerfile
	output:
		process.env.NEXT_OUTPUT === "standalone"
			? "standalone"
			: process.env.NEXT_OUTPUT === "export"
				? "export"
				: undefined,

	// Cache headers for static assets and API routes
	async headers() {
		const isDev = process.env.NODE_ENV === "development";
		return [
			// In development, prevent aggressive caching of dynamic chunks
			...(isDev
				? [
						{
							source: "/_next/static/chunks/:path*",
							headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
						},
					]
				: []),
			{
				// Static assets - cache for 1 year (immutable with hash in filename)
				source: "/_next/static/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
			{
				// Public folder assets - cache for 1 month (logos, favicons, etc.)
				source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|webmanifest)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=2592000, stale-while-revalidate=31536000",
					},
				],
			},
			{
				// OG Image API - cache for 1 day
				source: "/api/og",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=86400, stale-while-revalidate=604800",
					},
				],
			},
		];
	},

	/**
	 * 301 redirects for the April 2026 compliance taxonomy refactor.
	 *
	 * Context: "Shop by Goal" benefit-labeled Collections were deleted from Saleor
	 * and replaced with mechanism-class Categories. Old URLs (bookmarks, indexed
	 * pages, inbound links) 301 to the closest new Category. Retired benefit
	 * buckets with no clean mechanism equivalent redirect to the catalog index.
	 *
	 * Deleted product URLs (Tesamorelin, Retatrutide, PT-141) also redirect to
	 * the catalog index rather than returning a bare 404 — clearer UX and
	 * preserves any residual inbound link equity.
	 *
	 * All redirects are keyed against `/:channel/...` patterns because the
	 * storefront is channel-scoped. `:channel` is captured per Next.js syntax
	 * and reinserted into the destination.
	 */
	async redirects() {
		// Collection slug → Category slug (closest mechanism match)
		const collectionToCategory = [
			{ from: "weight-management", to: "glp-1-receptor-agonists" },
			{ from: "antiaging-longevity", to: "pineal-peptides" },
			{ from: "cognitive-mood", to: "nootropic-peptides" },
			{ from: "growth-recovery", to: "growth-hormone-secretagogues" },
			{ from: "recovery-healing", to: "cytoprotective-peptides" },
			{ from: "immune-support", to: "thymic-peptides" },
			{ from: "tanning-skin", to: "melanocortin-receptor-modulators" },
			{ from: "aesthetics", to: "copper-peptide-complexes" },
		];

		// Retired Collections without a clean mechanism home → catalog index
		const retiredCollections = [
			"sexual-health",
			"fertility-hormonal",
			"performance",
			"sleep-recovery",
			"vitamins-supplements",
		];

		// Category slug renames
		const categoryRenames = [
			{ from: "glp1-receptor-agonists", to: "glp-1-receptor-agonists" },
			{ from: "growth-hormone", to: "growth-hormone-derivatives" },
			{ from: "hormones", to: "reproductive-hormones" },
			{ from: "peptides", to: "reference-peptides-miscellaneous" },
			// `injectables` was split into cosmetic-injectables + metabolic-injectables;
			// send the legacy URL to the catalog index since we can't know which split
			// the inbound link intended. `null` destination = redirect to products root.
			{ from: "injectables", to: null },
		];

		// Deleted products — redirect slug to catalog index (410 Gone would be
		// more correct semantically; Next.js `redirects` only supports 30x. The
		// `gone` flag requires middleware.)
		const deletedProducts = [
			"pt-141-bremelanotide",
			"pt-141",
			"bremelanotide",
			"retatrutide",
			"retratutide",
			"tesamorelin",
		];

		return [
			...collectionToCategory.map(({ from, to }) => ({
				source: `/:channel/collections/${from}`,
				destination: `/:channel/categories/${to}`,
				permanent: true,
			})),
			...retiredCollections.map((slug) => ({
				source: `/:channel/collections/${slug}`,
				destination: `/:channel/products`,
				permanent: true,
			})),
			...categoryRenames.map(({ from, to }) => ({
				source: `/:channel/categories/${from}`,
				destination: to ? `/:channel/categories/${to}` : `/:channel/products`,
				permanent: true,
			})),
			...deletedProducts.map((slug) => ({
				source: `/:channel/products/${slug}`,
				destination: `/:channel/products`,
				permanent: true,
			})),
		];
	},

	// Logging configuration
	logging: {
		fetches: {
			fullUrl: process.env.NODE_ENV === "development",
		},
	},
};

export default config;
