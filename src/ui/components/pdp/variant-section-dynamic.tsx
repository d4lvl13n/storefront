import { revalidatePath } from "next/cache";
import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { formatMoney, formatMoneyRange, cn } from "@/lib/utils";
import { getDiscountInfo } from "@/lib/pricing";
import { CheckoutAddLineDocument, type ProductDetailsQuery } from "@/gql/graphql";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import * as Checkout from "@/lib/checkout";

import { AddToCart } from "./add-to-cart";
import type { AddToCartTrackingItem } from "./add-to-cart-sync";
import { AddToCartForm, type AddToCartActionState } from "./add-to-cart-form";
import { ProductViewTracker } from "./product-view-tracker";
import { BulkOrderSelector, type BulkPackVariant } from "./bulk-order-selector";
import { extractReviews, RatingSummary } from "./product-reviews";
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

	// Purity drives the accent spec chip
	const purity = extractPurity(product);

	// ── Bulk-order packs ──────────────────────────────────────────────────────
	// A variant is a "pack" iff it carries public metadata pack_size; the base
	// single vial has none. Bulk mode applies when a product has exactly one
	// single + at least one pack (today's catalog shape). Anything else falls
	// back to the standard selector unchanged.
	const packVariants = variants.filter((v) => v.packSize);
	const singleVariants = variants.filter((v) => !v.packSize);
	const bulkSingle = packVariants.length > 0 && singleVariants.length === 1 ? singleVariants[0] : undefined;
	const isBulkMode = Boolean(bulkSingle);

	// Auto-select variant: URL param wins; otherwise default to the single vial
	// in bulk mode (so price + Add to Cart work out of the box), else the lone
	// variant for single-variant products.
	const defaultVariantID = isBulkMode ? bulkSingle!.id : variants.length === 1 ? variants[0].id : undefined;
	const selectedVariantID = variantParam || defaultVariantID;
	const selectedVariant = variants.find(({ id }) => id === selectedVariantID);

	// Is the active variant one of the bulk packs? (drives qty lock + price calc)
	const isPackSelected = isBulkMode && packVariants.some((v) => v.id === selectedVariantID);

	// Pack tiers handed to the bulk selector (only those with live pricing).
	const bulkPacks: BulkPackVariant[] = isBulkMode
		? packVariants.flatMap((v) => {
				const gross = v.pricing?.price?.gross;
				if (!gross || !v.packSize) return [];
				return [
					{
						id: v.id,
						name: v.name,
						packSize: v.packSize,
						quantityAvailable: v.quantityAvailable ?? 0,
						price: gross.amount,
						currency: gross.currency,
					},
				];
			})
		: [];
	const singleUnitPrice = bulkSingle?.pricing?.price?.gross?.amount ?? 0;
	const bulkCurrency = bulkSingle?.pricing?.price?.gross?.currency ?? "USD";

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

	// Review summary (from product metadata) for the inline rating
	const reviews = extractReviews(product.metadata);

	// ── Analytics items ──
	// The item wired to the add-to-cart form (selected variant — or pack, which
	// flows through the same form with a locked quantity of 1).
	const selectedGross = selectedVariant?.pricing?.price?.gross;
	const trackingItem: AddToCartTrackingItem | undefined = selectedVariant
		? {
				id: selectedVariant.id,
				name: product.name,
				variant: selectedVariant.name,
				sku: selectedVariant.sku ?? undefined,
				price: selectedGross?.amount ?? 0,
				currency: selectedGross?.currency ?? bulkCurrency,
			}
		: undefined;
	// Product-view item: the active variant's price, else the range-start price.
	const viewGross = selectedGross ?? product.pricing?.priceRange?.start?.gross;
	const viewItem = {
		id: selectedVariantID ?? product.id,
		name: product.name,
		variant: selectedVariant?.name,
		sku: selectedVariant?.sku ?? undefined,
		price: viewGross?.amount ?? 0,
		quantity: 1,
	};
	const viewCurrency = viewGross?.currency ?? bulkCurrency;

	// Server action for adding to cart
	async function addToCart(_state: AddToCartActionState, formData: FormData): Promise<AddToCartActionState> {
		"use server";

		if (!selectedVariantID) {
			return { status: "error", message: "Please select an available option before adding to cart." };
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
				console.error("Add to cart: Failed to create checkout");
				return { status: "error", message: "Could not start a cart. Please try again." };
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
				return { status: "error", message: "Could not add this item. Please try again." };
			}

			revalidatePath(`/${channel}/cart`);
			return { status: "success" };
		} catch (error) {
			console.error("Add to cart failed:", error);
			return { status: "error", message: "Could not add this item. Please try again." };
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
				<RatingSummary avg={reviews.avg} count={reviews.count} />

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
			<AddToCartForm action={addToCart} className="order-4 mt-2 space-y-5" item={trackingItem}>
				{/* Variant Selectors — in bulk mode the packs are handled by the
				    bulk selector below, so the standard selector only sees singles. */}
				<VariantSelectionSection
					variants={isBulkMode ? singleVariants : variants}
					selectedVariantId={selectedVariantID}
					productSlug={product.slug}
					channel={channel}
				/>

				{/* Trust Row: cold-chain shipping + reconstitution calculator */}
				<PdpTrustRow channel={channel} />

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
				<AddToCart
					disabled={isAddToCartDisabled}
					disabledReason={disabledReason}
					lockQuantity={isPackSelected}
				/>

				{/* Buy in bulk & save — pack-tier selector (only when packs exist) */}
				{isBulkMode && bulkSingle && bulkPacks.length > 0 && (
					<BulkOrderSelector
						singleId={bulkSingle.id}
						singleUnitPrice={singleUnitPrice}
						currency={bulkCurrency}
						packs={bulkPacks}
						selectedVariantId={selectedVariantID}
						channel={channel}
						productSlug={product.slug}
					/>
				)}

				{/* Compact Research Use Only note (full detail lives in the policy pages) */}
				<div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
					<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
					<p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
						<span className="font-semibold">For Research Use Only.</span> Not for human consumption. Sold
						strictly for in-vitro laboratory research.
					</p>
				</div>

				{/* Sticky Add to Cart Bar (Mobile) */}
				<StickyBar productName={product.name} price={price} show={!isAddToCartDisabled} />
			</AddToCartForm>

			{/* Klaviyo Viewed Product (browse-abandonment signal) */}
			<ProductViewTracker item={viewItem} currency={viewCurrency} />
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
