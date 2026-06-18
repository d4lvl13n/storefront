import { Suspense } from "react";
import { notFound } from "next/navigation";
import { type ResolvingMetadata, type Metadata } from "next";
import { ProductListByCategoryDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { getPaginatedListVariables } from "@/lib/utils";
import { parseEditorJSToText } from "@/lib/editorjs";
import { CategoryHero, transformToProductCard } from "@/ui/components/plp";
import {
	buildSortVariables,
	buildFilterVariables,
	applyPinnedLead,
	applyPinnedTrail,
	paginateInMemory,
} from "@/ui/components/plp/filter-utils";
import { ProductsPerPage } from "@/app/config";
import { CategoryPageClient } from "./client";

async function getCategoryData(slug: string, channel: string) {
	const result = await executePublicGraphQL(ProductListByCategoryDocument, {
		variables: { slug, channel, first: 1 },
		revalidate: 300,
	});

	if (!result.ok) {
		// Backend failure ≠ category absent — throw so the error boundary renders a
		// retryable error rather than a 404 on a real, indexed category URL.
		throw new Error(`Category query failed for ${slug}: ${result.error.message}`);
	}

	return result.data.category;
}

type PageProps = {
	params: Promise<{ slug: string; channel: string }>;
	searchParams: Promise<{
		cursor?: string;
		direction?: string;
		sort?: string;
		price?: string;
		colors?: string;
		sizes?: string;
	}>;
};

export const generateMetadata = async (props: PageProps, parent: ResolvingMetadata): Promise<Metadata> => {
	const params = await props.params;
	const category = await getCategoryData(params.slug, params.channel);
	const plainDescription = parseEditorJSToText(category?.description);

	return {
		title: `${category?.name || "Category"} | ${category?.seoTitle || (await parent).title?.absolute}`,
		description: category?.seoDescription || plainDescription || category?.seoTitle || category?.name,
		alternates: { canonical: `/${params.channel}/categories/${params.slug}` },
	};
};

/**
 * Sync page shell with dedicated Suspense boundary.
 * Cached hero + dynamic product grid stream inside this boundary,
 * not through the layout's main Suspense.
 */
export default function Page(props: PageProps) {
	return (
		<Suspense fallback={<PageSkeleton />}>
			<CategoryContent params={props.params} searchParams={props.searchParams} />
		</Suspense>
	);
}

async function CategoryContent({
	params: paramsPromise,
	searchParams,
}: {
	params: PageProps["params"];
	searchParams: PageProps["searchParams"];
}) {
	const params = await paramsPromise;
	const category = await getCategoryData(params.slug, params.channel);

	if (!category) {
		notFound();
	}

	const plainDescription = parseEditorJSToText(category.description);

	const breadcrumbs = [
		{ label: "Home", href: `/${params.channel}` },
		{ label: category.name, href: `/${params.channel}/categories/${params.slug}` },
	];

	return (
		<>
			<CategoryHero
				title={category.name}
				description={plainDescription}
				backgroundImage={category.backgroundImage?.url}
				breadcrumbs={breadcrumbs}
			/>
			<Suspense fallback={<ProductsGridSkeleton />}>
				<CategoryProducts params={paramsPromise} searchParams={searchParams} />
			</Suspense>
		</>
	);
}

async function CategoryProducts({
	params: paramsPromise,
	searchParams: searchParamsPromise,
}: {
	params: PageProps["params"];
	searchParams: PageProps["searchParams"];
}) {
	const [params, searchParams] = await Promise.all([paramsPromise, searchParamsPromise]);

	const sortBy = buildSortVariables(searchParams.sort);
	const filter = buildFilterVariables({ priceRange: searchParams.price });

	// Default ("featured") view = no explicit sort and no price filter. There we
	// curate the order (GLP-1/2/3 lead) and paginate in memory so the pins lead
	// regardless of which Saleor page they'd otherwise fall on. Explicit sorts and
	// price filters keep Saleor's native cursor pagination untouched.
	const isDefaultView = !sortBy && !filter;

	if (isDefaultView) {
		const all = await executePublicGraphQL(ProductListByCategoryDocument, {
			variables: { slug: params.slug, channel: params.channel, first: 100 },
			revalidate: 300,
		});
		const allProducts = all.ok ? all.data.category?.products : null;
		if (!allProducts) {
			notFound();
		}

		const ordered = applyPinnedTrail(
			applyPinnedLead(allProducts.edges.map((e) => transformToProductCard(e.node, params.channel))),
		);
		const { items, pageInfo, totalCount } = paginateInMemory(ordered, searchParams.cursor, ProductsPerPage);

		const productOptions = allProducts.edges
			.map((e) => ({ name: e.node.name, href: `/${params.channel}/products/${e.node.slug}` }))
			.sort((a, b) => a.name.localeCompare(b.name));

		return (
			<CategoryPageClient
				products={items}
				productOptions={productOptions}
				pageInfo={pageInfo}
				totalCount={totalCount}
			/>
		);
	}

	const paginationVariables = getPaginatedListVariables({ params: searchParams });

	const [result, allProductsResult] = await Promise.all([
		executePublicGraphQL(ProductListByCategoryDocument, {
			variables: {
				slug: params.slug,
				channel: params.channel,
				...paginationVariables,
				sortBy,
				filter,
			},
			revalidate: 300,
		}),
		// All products in this category (name + slug) for the quick-jump Products dropdown.
		executePublicGraphQL(ProductListByCategoryDocument, {
			variables: { slug: params.slug, channel: params.channel, first: 100 },
			revalidate: 300,
		}),
	]);

	const products = result.ok ? result.data.category?.products : null;
	if (!products) {
		notFound();
	}

	const productCards = products.edges.map((e) => transformToProductCard(e.node, params.channel));

	const productOptions = (allProductsResult.ok ? allProductsResult.data.category?.products?.edges ?? [] : [])
		.map((e) => ({ name: e.node.name, href: `/${params.channel}/products/${e.node.slug}` }))
		.sort((a, b) => a.name.localeCompare(b.name));

	return (
		<CategoryPageClient
			products={productCards}
			productOptions={productOptions}
			pageInfo={products.pageInfo}
			totalCount={products.totalCount ?? productCards.length}
		/>
	);
}

function PageSkeleton() {
	return (
		<div className="animate-skeleton-delayed opacity-0">
			<div className="bg-muted px-4 py-12 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="bg-muted-foreground/10 h-8 w-48 animate-pulse rounded" />
					<div className="bg-muted-foreground/10 mt-3 h-4 w-96 max-w-full animate-pulse rounded" />
				</div>
			</div>
			<ProductsGridSkeleton />
		</div>
	);
}

function ProductsGridSkeleton() {
	return (
		<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="animate-pulse">
						<div className="mb-4 aspect-[3/4] rounded-xl bg-muted" />
						<div className="space-y-1.5">
							<div className="h-4 w-3/4 rounded bg-muted" />
							<div className="h-4 w-1/2 rounded bg-muted" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
