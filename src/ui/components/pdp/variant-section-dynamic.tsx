import { revalidatePath } from "next/cache";
import { type ReactNode } from "react";

import { formatMoney, formatMoneyRange, cn } from "@/lib/utils";
import { getDiscountInfo } from "@/lib/pricing";
import { CheckoutAddLineDocument, type ProductDetailsQuery } from "@/gql/graphql";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import * as Checkout from "@/lib/checkout";

import { AddToCart } from "./add-to-cart";
import { AddToCartSync } from "./add-to-cart-sync";
import { PdpTrustRow } from "./trust-row";
import { VariantSelectionSection } from "./variant-selection";
import { StickyBar } from "./sticky-bar";
import { Badge } from "@/ui/components/ui/badge";

type Product = NonNullable<ProductDetailsQuery["product"]>;

interface VariantSectionDynamicProps {
	product: Product;
	channel: string;
	searchParams: Promise<{ variant?: string }>;
}

/**
 * Dynamic variant section for PDP.
 *
 * With Cache Components enabled, this component streams at request time
 * because it accesses searchParams (runtime data). The product data is
 * already cached in the static shell - this just adds the interactive parts.
 */
// ── Trust row data extraction ──
function extractPurity(product: Product): string | null {
	const purityAttr = (product.attributes || []).find(
		(a) => (a.attribute.name ?? "").toLowerCase() === "purity" || a.attribute.slug === "purity",
	);
	const value = purityAttr?.values[0]?.name;
	return value ?? null;
}

function extractMeta(product: Product, key: string): string | null {
	return (product.metadata || []).find((m) => m.key === key)?.value ?? null;
}

function getAttrValue(product: Product, name: string): string | null {
	const attr = (product.attributes || []).find(
		(a) => (a.attribute.name ?? "").toLowerCase() === name.toLowerCase(),
	);
	const value = attr?.values
		.map((v) => v.name)
		.filter(Boolean)
		.join(", ");
	return value || null;
}

/** Below this many units in stock, surface a low-stock nudge. */
const LOW_STOCK_THRESHOLD = 25;

/** Compact glanceable spec pill shown under the product title. */
function SpecChip({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
				accent
					? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
					: "bg-secondary/60 border-border text-foreground",
			)}
		>
			{children}
		</span>
	);
}

export async function VariantSectionDynamic({ product, channel, searchParams }: VariantSectionDynamicProps) {
	const { variant: variantParam } = await searchParams;
	const variants = product.variants || [];

	// Trust-row data
	const purity = extractPurity(product);
	const coaUrl = extractMeta(product, "coa_url");
	const lotNumber = extractMeta(product, "lot_number") ?? extractMeta(product, "batch_number");

	// Auto-select variant: use URL param, or auto-select if only one variant exists
	const selectedVariantID = variantParam || (variants.length === 1 ? variants[0].id : undefined);
	const selectedVariant = variants.find(({ id }) => id === selectedVariantID);

	// Check availability
	const isAvailable = variants.some((variant) => variant.quantityAvailable);

	// Determine add-to-cart button state
	const isAddToCartDisabled = !selectedVariantID || !selectedVariant?.quantityAvailable;
	const disabledReason = !selectedVariantID
		? ("no-selection" as const)
		: !selectedVariant?.quantityAvailable
			? ("out-of-stock" as const)
			: undefined;

	// Format prices
	const price = selectedVariant?.pricing?.price?.gross
		? selectedVariant.pricing.price.gross.amount === 0
			? "FREE"
			: formatMoney(selectedVariant.pricing.price.gross.amount, selectedVariant.pricing.price.gross.currency)
		: formatMoneyRange({
				start: product.pricing?.priceRange?.start?.gross,
				stop: product.pricing?.priceRange?.stop?.gross,
			}) || "";

	// Calculate discount/sale information
	const currentPrice = selectedVariant?.pricing?.price?.gross?.amount;
	const undiscountedPrice = selectedVariant?.pricing?.priceUndiscounted?.gross?.amount;
	const { isOnSale, discountPercent } = getDiscountInfo(currentPrice, undiscountedPrice);

	const compareAtPrice =
		isOnSale && selectedVariant?.pricing?.priceUndiscounted?.gross
			? formatMoney(
					selectedVariant.pricing.priceUndiscounted.gross.amount,
					selectedVariant.pricing.priceUndiscounted.gross.currency,
				)
			: null;

	// Glanceable key-spec chips (dose, purity, form, CAS) shown under the title
	const dose = selectedVariant?.name ?? null;
	const form = getAttrValue(product, "Form");
	const cas = getAttrValue(product, "CAS Number");
	const hasSpecChips = Boolean(dose || purity || form || cas);

	// Stock signal for the selected variant
	const stockQty = selectedVariant?.quantityAvailable ?? 0;
	const showStock = Boolean(selectedVariant) && stockQty > 0;
	const isLowStock = stockQty > 0 && stockQty <= LOW_STOCK_THRESHOLD;

	// Server action for adding to cart
	async function addToCart(formData: FormData) {
		"use server";

		if (!selectedVariantID) {
			// Silently return - button should be disabled if no variant selected
			return;
		}

		// Parse quantity from the form (default 1, clamp 1-10)
		const rawQty = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
		const quantity = Number.isFinite(rawQty) ? Math.min(10, Math.max(1, rawQty)) : 1;

		try {
			const checkout = await Checkout.findOrCreate({
				checkoutId: await Checkout.getIdFromCookies(channel),
				channel: channel,
			});

			if (!checkout) {
				// Log error server-side, UI will show via ErrorBoundary if needed
				console.error("Add to cart: Failed to create checkout");
				return;
			}

			await Checkout.saveIdToCookie(channel, checkout.id);

			const addResult = await executeAuthenticatedGraphQL(CheckoutAddLineDocument, {
				variables: {
					id: checkout.id,
					productVariantId: decodeURIComponent(selectedVariantID),
					quantity,
				},
				cache: "no-cache",
			});

			if (!addResult.ok) {
				console.error("Add to cart failed:", addResult.error.message);
				return;
			}

			revalidatePath(`/${channel}/cart`);
		} catch (error) {
			// Log error server-side - the UI feedback comes from cart drawer/badge update
			// For explicit error UI, would need useActionState (separate enhancement)
			console.error("Add to cart failed:", error);
		}
	}

	return (
		<>
			{/* Category + Sale/Stock badges row - order:1 so it appears ABOVE the h1 */}
			<div className="order-1 flex items-center gap-2">
				{product.category && (
					<span className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
						{product.category.name}
					</span>
				)}
				{isOnSale && (
					<Badge variant="destructive" className="text-xs">
						Sale
					</Badge>
				)}
				{!isAvailable && (
					<Badge variant="secondary" className="text-xs">
						Out of stock
					</Badge>
				)}
			</div>

			{/* Key-spec chips + price - order:3 so it appears BELOW the h1, above the buy form */}
			<div className="order-3 mt-1 flex flex-col gap-4">
				{hasSpecChips && (
					<div className="flex flex-wrap gap-2">
						{dose && <SpecChip accent>{dose}</SpecChip>}
						{purity && <SpecChip accent>{purity}</SpecChip>}
						{form && <SpecChip>{form}</SpecChip>}
						{cas && <SpecChip>CAS {cas}</SpecChip>}
					</div>
				)}

				<div className="flex items-baseline gap-3">
					<span className="text-3xl font-semibold tracking-tight text-foreground">{price}</span>
					{compareAtPrice && (
						<>
							<span className="text-lg text-muted-foreground line-through">{compareAtPrice}</span>
							{discountPercent && (
								<span className="bg-destructive/15 rounded-full px-2 py-0.5 text-sm font-semibold text-destructive">
									-{discountPercent}%
								</span>
							)}
						</>
					)}
				</div>
			</div>

			{/* Buy form - order:4 */}
			<form action={addToCart} className="order-4 mt-2 space-y-5">
				{/* Variant Selectors */}
				<VariantSelectionSection
					variants={variants}
					selectedVariantId={selectedVariantID}
					productSlug={product.slug}
					channel={channel}
				/>

				{/* Trust Row: COA proof, purity, shipping, reconstitution calculator */}
				<PdpTrustRow purity={purity} coaUrl={coaUrl} lotNumber={lotNumber} channel={channel} />

				{/* Stock indicator */}
				{showStock && (
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
						<span
							className={cn("h-2 w-2 rounded-full", isLowStock ? "bg-amber-400" : "bg-emerald-400")}
							aria-hidden="true"
						/>
						<span className={isLowStock ? "text-amber-400" : "text-emerald-400"}>
							{isLowStock ? `Only ${stockQty} left` : "In stock"}
						</span>
						<span className="text-muted-foreground">· ships within 24 hours</span>
					</div>
				)}

				{/* Add to Cart */}
				<AddToCart disabled={isAddToCartDisabled} disabledReason={disabledReason} />

				{/* Open the cart drawer + refresh badge after a successful add */}
				<AddToCartSync />

				{/* Sticky Add to Cart Bar (Mobile) */}
				<StickyBar productName={product.name} price={price} show={!isAddToCartDisabled} />
			</form>
		</>
	);
}

/**
 * Skeleton fallback for variant section.
 *
 * Uses delayed visibility (300ms) to prevent flash on fast loads.
 * Part of the static shell - shows while variant data streams in.
 */
export function VariantSectionSkeleton() {
	return (
		<>
			{/* Category skeleton - order:1, delayed visibility */}
			<div className="order-1 h-3 w-24 animate-pulse animate-skeleton-delayed rounded bg-muted opacity-0" />

			{/* Spec chips + price skeleton - order:3 */}
			<div className="order-3 mt-1 animate-pulse animate-skeleton-delayed space-y-3 opacity-0">
				<div className="flex gap-2">
					<div className="h-6 w-20 rounded-full bg-muted" />
					<div className="h-6 w-24 rounded-full bg-muted" />
				</div>
				<div className="h-9 w-28 rounded bg-muted" />
			</div>

			{/* Buy form skeleton - order:4 */}
			<div className="order-4 mt-2 animate-pulse animate-skeleton-delayed space-y-5 opacity-0">
				{/* Trust row skeleton */}
				<div className="h-16 w-full rounded-xl bg-muted" />
				{/* Quantity skeleton */}
				<div className="h-10 w-40 rounded-full bg-muted" />
				{/* Add to cart button skeleton */}
				<div className="h-14 w-full rounded bg-muted" />
			</div>
		</>
	);
}
