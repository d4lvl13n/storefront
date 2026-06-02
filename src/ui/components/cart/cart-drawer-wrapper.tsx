import * as Checkout from "@/lib/checkout";
import { ProductListDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { localeConfig } from "@/config/locale";
import { CartDrawer, type RecommendedProduct } from "./cart-drawer";

interface CartDrawerWrapperProps {
	channel: string;
}

export async function CartDrawerWrapper({ channel }: CartDrawerWrapperProps) {
	const checkoutId = await Checkout.getIdFromCookies(channel);
	const checkout = checkoutId ? await Checkout.find(checkoutId) : null;

	// The upsell only renders when the bag has items, so skip the extra product
	// fetch entirely for the (common) empty-cart render on every page.
	const recommendations = checkout?.lines?.length ? await getRecommendations(channel, checkout.lines) : [];

	return (
		<CartDrawer
			checkoutId={checkoutId || null}
			lines={checkout?.lines ?? []}
			totalPrice={checkout?.totalPrice ?? null}
			channel={channel}
			recommendations={recommendations}
		/>
	);
}

/**
 * Up to three upsell products for the cart drawer, excluding whatever is already
 * in the bag. Public (unauthenticated) read, lightly cached.
 */
async function getRecommendations(
	channel: string,
	lines: { variant?: { product?: { id: string } | null } | null }[],
): Promise<RecommendedProduct[]> {
	const result = await executePublicGraphQL(ProductListDocument, {
		variables: { first: 8, channel },
		revalidate: 60 * 5,
	});

	if (!result.ok || !result.data.products) return [];

	const inCart = new Set(
		lines.map((line) => line.variant?.product?.id).filter((id): id is string => Boolean(id)),
	);

	return result.data.products.edges
		.map(({ node }) => node)
		.filter((product) => !inCart.has(product.id))
		.slice(0, 3)
		.map((product) => ({
			id: product.id,
			name: product.name,
			slug: product.slug,
			// Only offer one-click add for single-variant products; multi-variant
			// ones fall through to a "View" link so the shopper picks on the PDP
			// (mirrors the PDP's own auto-select-only-when-single rule).
			variantId: product.variants?.length === 1 ? product.variants[0]?.id ?? null : null,
			thumbnailUrl: product.thumbnail?.url ?? null,
			thumbnailAlt: product.thumbnail?.alt ?? null,
			price: product.pricing?.priceRange?.start?.gross.amount ?? 0,
			currency: product.pricing?.priceRange?.start?.gross.currency ?? localeConfig.fallbackCurrency,
		}));
}
