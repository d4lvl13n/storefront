/**
 * Client-side analytics dispatcher.
 *
 * Single source of truth for conversion events. Each function fans a user action
 * out to BOTH destinations so callers never touch `dataLayer`/`klaviyo` directly:
 *
 *   - GA4 (via GTM): `dataLayer.push(...)`. Ecommerce events are nested under an
 *     `ecommerce` object and preceded by a `{ ecommerce: null }` clear, per GA4's
 *     data-layer spec. The GA4 event set is intentionally exactly the five
 *     conversion events — sign_up, newsletter_subscribe, add_to_cart,
 *     begin_checkout, purchase — so the GTM container's triggers map 1:1.
 *   - Klaviyo (onsite SDK): `klaviyo.push(['track', <metric>, {...}])` for
 *     browsing/intent events (Viewed Product, Added to Cart, Started Checkout).
 *     The money event (Placed Order) is sent server-side — see klaviyo-server.ts.
 *
 * Every function no-ops safely when `window`, `dataLayer`, or `klaviyo` is absent
 * (SSR or ad-blockers), so callers can fire unconditionally. NOTE: there is no
 * consent gate today — GTM and the Klaviyo SDK load unconditionally; a CMP /
 * Google Consent Mode is tracked as follow-up, not implemented here.
 *
 * All numeric outputs are coerced to finite Numbers; currency is whatever the
 * caller passes (expected 3-letter ISO 4217).
 */

export interface AnalyticsItem {
	/** Stable identifier (variant id, then SKU, then name as last resort). */
	id?: string;
	/** Product name. */
	name: string;
	/** Variant / dose label, if any. */
	variant?: string;
	sku?: string;
	/** Unit price in major currency units. */
	price: number;
	quantity: number;
}

const num = (n: unknown): number => {
	const v = Number(n);
	return Number.isFinite(v) ? v : 0;
};

/** Round to 2 dp to avoid float noise in reported values. */
const money = (n: number): number => Math.round(n * 100) / 100;

const sumValue = (items: AnalyticsItem[]): number =>
	money(items.reduce((s, i) => s + num(i.price) * num(i.quantity), 0));

// ── Low-level sinks ────────────────────────────────────────────────────────

function getDataLayer(): Record<string, unknown>[] | null {
	if (typeof window === "undefined") return null;
	window.dataLayer = window.dataLayer || [];
	return window.dataLayer;
}

/** Plain (non-ecommerce) GA4 event. */
function pushEvent(event: Record<string, unknown>): void {
	getDataLayer()?.push(event);
}

/** GA4 ecommerce event: clear the prior `ecommerce` object, then push the new one. */
function pushEcommerce(event: string, ecommerce: Record<string, unknown>): void {
	const dl = getDataLayer();
	if (!dl) return;
	dl.push({ ecommerce: null });
	dl.push({ event, ecommerce });
}

function klaviyoTrack(metric: string, properties: Record<string, unknown>): void {
	if (typeof window === "undefined" || !window.klaviyo) return;
	try {
		window.klaviyo.push(["track", metric, properties]);
	} catch {
		/* SDK not ready / blocked — drop silently */
	}
}

/** Attach subsequent onsite activity to a known email (back-stitches anonymous history). */
export function identify(email: string): void {
	if (!email || typeof window === "undefined" || !window.klaviyo) return;
	try {
		window.klaviyo.push(["identify", { $email: email }]);
	} catch {
		/* noop */
	}
}

// ── Item mappers ───────────────────────────────────────────────────────────

function ga4Item(item: AnalyticsItem): Record<string, unknown> {
	return {
		item_id: item.id ?? item.sku ?? item.name,
		item_name: item.name,
		...(item.variant ? { item_variant: item.variant } : {}),
		price: money(num(item.price)),
		quantity: num(item.quantity),
	};
}

function klaviyoItem(item: AnalyticsItem, currency: string): Record<string, unknown> {
	return {
		ProductID: item.id ?? item.sku ?? item.name,
		...(item.sku ? { SKU: item.sku } : {}),
		ProductName: item.name,
		...(item.variant ? { VariantName: item.variant } : {}),
		Quantity: num(item.quantity),
		ItemPrice: money(num(item.price)),
		RowTotal: money(num(item.price) * num(item.quantity)),
		Currency: currency,
	};
}

// ── Events ─────────────────────────────────────────────────────────────────

/** GA4 `sign_up` (after server-confirmed account creation). */
export function trackSignUp(input: { method: string; userId?: string }): void {
	pushEvent({
		event: "sign_up",
		method: input.method,
		...(input.userId ? { user_id: input.userId } : {}),
	});
}

/** GA4 `newsletter_subscribe`. Klaviyo subscription itself happens server-side. */
export function trackNewsletter(input: { formLocation: string }): void {
	pushEvent({ event: "newsletter_subscribe", form_location: input.formLocation });
}

/** Klaviyo `Viewed Product` (browse-abandonment signal). Not a GA4 conversion event. */
export function trackViewProduct(input: { item: AnalyticsItem; currency: string }): void {
	klaviyoTrack("Viewed Product", {
		...klaviyoItem(input.item, input.currency),
		$value: money(num(input.item.price)),
	});
}

/** GA4 `add_to_cart` + Klaviyo `Added to Cart`. */
export function trackAddToCart(input: { currency: string; items: AnalyticsItem[] }): void {
	const value = sumValue(input.items);
	pushEcommerce("add_to_cart", {
		currency: input.currency,
		value,
		items: input.items.map(ga4Item),
	});
	klaviyoTrack("Added to Cart", {
		$value: value,
		Currency: input.currency,
		ItemNames: input.items.map((i) => i.name),
		Items: input.items.map((i) => klaviyoItem(i, input.currency)),
	});
}

/** GA4 `begin_checkout` (fires once when the user enters the checkout flow). */
export function trackBeginCheckout(input: {
	currency: string;
	items: AnalyticsItem[];
	value?: number;
}): void {
	pushEcommerce("begin_checkout", {
		currency: input.currency,
		value: input.value ?? sumValue(input.items),
		items: input.items.map(ga4Item),
	});
}

/** Klaviyo `Started Checkout` (fires once the customer email is known). */
export function trackStartedCheckout(input: {
	currency: string;
	items: AnalyticsItem[];
	value?: number;
	checkoutId?: string;
}): void {
	klaviyoTrack("Started Checkout", {
		$value: input.value ?? sumValue(input.items),
		Currency: input.currency,
		ItemNames: input.items.map((i) => i.name),
		Items: input.items.map((i) => klaviyoItem(i, input.currency)),
		...(input.checkoutId ? { CheckoutID: input.checkoutId, $event_id: input.checkoutId } : {}),
	});
}

/**
 * GA4 `purchase`. Fires at most once per order: a localStorage flag keyed by the
 * order number survives page refresh AND a fresh tab/context (some PSPs return in
 * a new tab), and (best-effort) blocks re-fire even when storage is unavailable
 * since callers invoke this from a mount effect.
 */
export function trackPurchase(input: {
	transactionId: string;
	orderNumber: string;
	currency: string;
	value: number;
	tax?: number;
	shipping?: number;
	items: AnalyticsItem[];
}): void {
	if (typeof window === "undefined") return;
	const key = `ga4_purchase:${input.orderNumber}`;
	try {
		if (window.localStorage.getItem(key)) return;
		window.localStorage.setItem(key, "1");
	} catch {
		/* storage blocked — rely on the caller's once-per-mount effect */
	}
	pushEcommerce("purchase", {
		transaction_id: input.transactionId,
		value: money(num(input.value)),
		currency: input.currency,
		...(input.tax != null ? { tax: money(num(input.tax)) } : {}),
		...(input.shipping != null ? { shipping: money(num(input.shipping)) } : {}),
		items: input.items.map(ga4Item),
	});
}

// ── Convenience mappers (keep Saleor shapes out of components) ───────────────

/** Minimal structural shape of a Saleor checkout used for checkout events. */
export interface CheckoutLike {
	id: string;
	totalPrice?: { gross?: { amount?: number | null; currency?: string | null } | null } | null;
	lines: ReadonlyArray<{
		quantity: number;
		variant?: { name?: string | null; product?: { name?: string | null } | null } | null;
		unitPrice?: { gross?: { amount?: number | null } | null } | null;
	}>;
}

function checkoutToItems(checkout: CheckoutLike): { currency: string; items: AnalyticsItem[] } {
	const currency = checkout.totalPrice?.gross?.currency ?? "USD";
	const items: AnalyticsItem[] = checkout.lines.map((l) => ({
		name: l.variant?.product?.name ?? l.variant?.name ?? "Product",
		variant: l.variant?.name ?? undefined,
		price: num(l.unitPrice?.gross?.amount),
		quantity: num(l.quantity),
	}));
	return { currency, items };
}

export function trackBeginCheckoutFromCheckout(checkout: CheckoutLike): void {
	// Omit value → defaults to the item subtotal (sum of price × qty), matching
	// GA4's begin_checkout/add_to_cart convention and the nested items[].
	const { currency, items } = checkoutToItems(checkout);
	trackBeginCheckout({ currency, items });
}

export function trackStartedCheckoutFromCheckout(checkout: CheckoutLike, email?: string): void {
	const { currency, items } = checkoutToItems(checkout);
	if (email) identify(email);
	trackStartedCheckout({ currency, items, checkoutId: checkout.id });
}

/** Minimal structural shape of a Saleor order used for the purchase event. */
export interface OrderLike {
	id: string;
	number: string;
	total?: {
		gross?: { amount?: number | null; currency?: string | null } | null;
		tax?: { amount?: number | null } | null;
	} | null;
	shippingPrice?: { gross?: { amount?: number | null } | null } | null;
	lines: ReadonlyArray<{
		quantity: number;
		productName: string;
		variantName?: string | null;
		unitPrice?: { gross?: { amount?: number | null } | null } | null;
	}>;
}

export function trackPurchaseFromOrder(order: OrderLike): void {
	const currency = order.total?.gross?.currency ?? "USD";
	const items: AnalyticsItem[] = order.lines.map((l) => ({
		name: l.productName,
		variant: l.variantName ?? undefined,
		price: num(l.unitPrice?.gross?.amount),
		quantity: num(l.quantity),
	}));
	trackPurchase({
		transactionId: order.number,
		orderNumber: order.number,
		currency,
		value: num(order.total?.gross?.amount),
		tax: order.total?.tax?.amount != null ? num(order.total.tax.amount) : undefined,
		shipping: order.shippingPrice?.gross?.amount != null ? num(order.shippingPrice.gross.amount) : undefined,
		items,
	});
}
