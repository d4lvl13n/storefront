import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShieldCheck, FlaskConical, FileCheck2, Truck } from "lucide-react";
import { ProductListDocument, ProductListPaginatedDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { getPaginatedListVariables } from "@/lib/utils";
import { CategoryHero, transformToProductCard } from "@/ui/components/plp";
import {
	buildSortVariables,
	buildFilterVariables,
	applyPinnedLead,
	paginateInMemory,
} from "@/ui/components/plp/filter-utils";
import { resolveCategorySlugsToIds } from "@/ui/components/plp/filter-utils.server";
import { ProductsPerPage } from "@/app/config";
import { ProductsPageClient } from "./products-client";

export const metadata = {
	title: "Research Compounds | InfinityBio Labs",
	description:
		"Browse our full catalog of pharmaceutical-grade research peptides and biotech compounds. HPLC-verified ≥99% purity, third-party tested, with Certificate of Analysis for every batch.",
	alternates: { canonical: "/us-us/products" },
};

type PageProps = {
	params: Promise<{ channel: string }>;
	searchParams: Promise<{
		cursor?: string | string[];
		direction?: string | string[];
		sort?: string;
		price?: string;
		colors?: string;
		sizes?: string;
		categories?: string;
	}>;
};

/**
 * Products page with Cache Components.
 * Static shell (hero) renders immediately, product grid streams in.
 */
export default async function Page(props: PageProps) {
	const params = await props.params;

	const breadcrumbs = [
		{ label: "Home", href: `/${params.channel}` },
		{ label: "Products", href: `/${params.channel}/products` },
	];

	return (
		<>
			{/* Static shell - renders immediately */}
			<CategoryHero
				title="Research Compounds"
				description="Pharmaceutical-grade peptides and biotech compounds. HPLC-verified ≥99% purity, independently tested, with COA on every order."
				breadcrumbs={breadcrumbs}
				badges={[
					{ icon: ShieldCheck, title: "≥ 99% Purity", subtitle: "HPLC-verified" },
					{ icon: FlaskConical, title: "Independently Tested", subtitle: "Third-party US labs" },
					{ icon: FileCheck2, title: "COA Every Batch", subtitle: "Full documentation" },
					{ icon: Truck, title: "Fast Dispatch", subtitle: "Same day for orders before 4pm EST" },
				]}
			/>
			{/* Dynamic content - streams in via Suspense */}
			<Suspense fallback={<ProductsGridSkeleton />}>
				<ProductsContent params={props.params} searchParams={props.searchParams} />
			</Suspense>
		</>
	);
}

/**
 * Dynamic products content - reads searchParams at request time.
 */
async function ProductsContent({
	params: paramsPromise,
	searchParams: searchParamsPromise,
}: {
	params: Promise<{ channel: string }>;
	searchParams: PageProps["searchParams"];
}) {
	const [params, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);

	const paginationVariables = getPaginatedListVariables({ params: searchParams });
	// Default to best-selling order (backend-driven) when no explicit sort is chosen.
	const sortBy = buildSortVariables(searchParams.sort ?? "bestselling");

	// Parse category slugs from URL and resolve to IDs for server-side filtering
	const categorySlugs = searchParams.categories?.split(",").filter(Boolean) || [];
	const categoryMap = await resolveCategorySlugsToIds(categorySlugs);
	const categoryIds = Array.from(categoryMap.values()).map((c) => c.id);

	const filter = buildFilterVariables({
		priceRange: searchParams.price,
		categoryIds,
	});

	// Default ("featured") view = no explicit sort, price, or category filter.
	// Curate the order (GLP-1/2/3 lead) over the full catalog and paginate in
	// memory so the pins lead regardless of their bestselling rank. Filtered or
	// explicitly-sorted views keep Saleor's native cursor pagination.
	const isDefaultView = !searchParams.sort && !searchParams.price && categorySlugs.length === 0;

	if (isDefaultView) {
		const all = await executePublicGraphQL(ProductListPaginatedDocument, {
			variables: { first: 100, channel: params.channel, sortBy },
			revalidate: 300,
		});
		if (!all.ok) {
			throw new Error(`Products query failed: ${all.error.message}`);
		}
		if (!all.data.products) {
			notFound();
		}
		const ordered = applyPinnedLead(
			all.data.products.edges.map((e) => transformToProductCard(e.node, params.channel)),
		);
		const cursor = Array.isArray(searchParams.cursor) ? searchParams.cursor[0] : searchParams.cursor;
		const { items, pageInfo, totalCount } = paginateInMemory(ordered, cursor, ProductsPerPage);
		const productOptions = all.data.products.edges
			.map((e) => ({ name: e.node.name, href: `/${params.channel}/products/${e.node.slug}` }))
			.sort((a, b) => a.name.localeCompare(b.name));

		return (
			<ProductsPageClient
				products={items}
				productOptions={productOptions}
				pageInfo={pageInfo}
				totalCount={totalCount}
				resolvedCategories={[]}
			/>
		);
	}

	const [result, allProductsResult] = await Promise.all([
		executePublicGraphQL(ProductListPaginatedDocument, {
			variables: {
				...paginationVariables,
				channel: params.channel,
				sortBy,
				filter,
			},
			revalidate: 300,
		}),
		// Full catalog (name + slug) for the quick-jump Products dropdown.
		executePublicGraphQL(ProductListDocument, {
			variables: { first: 100, channel: params.channel },
			revalidate: 300,
		}),
	]);

	if (!result.ok) {
		// Transient/backend failure is NOT "page doesn't exist" — throw so the error
		// boundary shows a retryable error instead of turning an indexed catalog URL
		// into a hard 404 during a Saleor blip.
		throw new Error(`Products query failed: ${result.error.message}`);
	}
	if (!result.data.products) {
		notFound();
	}

	const products = result.data.products;
	const productCards = products.edges.map((e) => transformToProductCard(e.node, params.channel));

	const productOptions = (allProductsResult.ok ? allProductsResult.data.products?.edges ?? [] : [])
		.map((e) => ({ name: e.node.name, href: `/${params.channel}/products/${e.node.slug}` }))
		.sort((a, b) => a.name.localeCompare(b.name));

	// Build resolved categories array for the client (for active filter display)
	const resolvedCategories = categorySlugs
		.map((slug) => {
			const cat = categoryMap.get(slug);
			return cat ? { slug, id: cat.id, name: cat.name } : null;
		})
		.filter(Boolean) as { slug: string; id: string; name: string }[];

	return (
		<ProductsPageClient
			products={productCards}
			productOptions={productOptions}
			pageInfo={products.pageInfo}
			totalCount={products.totalCount ?? productCards.length}
			resolvedCategories={resolvedCategories}
		/>
	);
}

function ProductsGridSkeleton() {
	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-7xl animate-skeleton-delayed px-4 py-10 opacity-0 sm:px-6 sm:py-12 lg:px-8">
				<div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
							<div className="aspect-[3/4] bg-secondary" />
							<div className="border-t border-border px-4 py-4">
								<div className="mb-2 h-3 w-16 rounded bg-secondary" />
								<div className="mb-3 h-4 w-3/4 rounded bg-secondary" />
								<div className="h-4 w-1/3 rounded bg-secondary" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
