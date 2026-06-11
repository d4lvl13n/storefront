/**
 * Server-side Klaviyo event tracking for the money event.
 *
 * The ORDER_PAID webhook is the authoritative, ad-blocker-proof signal that an
 * order was paid, so the `Placed Order` (+ per-line `Ordered Product`) events are
 * sent from the server here rather than the browser. Uses Klaviyo's Events API
 * with a PRIVATE key (KLAVIYO_PRIVATE_API_KEY).
 *
 * Everything here is fail-soft: no key, no email, a Saleor/Klaviyo error — all
 * resolve quietly without throwing, so the webhook's affiliate flow and its 2xx
 * response are never affected. `unique_id` dedups against Saleor webhook retries.
 */
import { getKlaviyoPrivateApiKey } from "@/config/analytics";
import { executeRawGraphQL } from "@/lib/graphql";

const KLAVIYO_EVENTS_ENDPOINT = "https://a.klaviyo.com/api/events/";
const KLAVIYO_REVISION = "2024-10-15";
/**
 * Hard ceiling for each external call (Klaviyo POST, Saleor line fetch). The
 * webhook awaits this work before recording the affiliate commission, so a hung
 * analytics dependency must never stall (and ultimately fail) the commission path
 * — every call is bounded and falls back rather than blocking.
 */
const CALL_TIMEOUT_MS = 3500;

export interface PaidOrderInput {
	id: string;
	number?: string;
	userEmail?: string;
	total?: { gross?: { amount?: number; currency?: string } };
}

interface NormalizedLine {
	productName: string;
	variantName?: string;
	sku?: string;
	productId?: string;
	variantId?: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
}

const num = (n: unknown): number => {
	const v = Number(n);
	return Number.isFinite(v) ? v : 0;
};
const money = (n: number): number => Math.round(n * 100) / 100;

/**
 * Mirror a paid order into Klaviyo. Sends `Placed Order` (always, if we have an
 * email + key) and one `Ordered Product` per line (best-effort, only if the line
 * detail could be fetched). Never throws.
 */
export async function mirrorPaidOrderToKlaviyo(order: PaidOrderInput): Promise<void> {
	try {
		const apiKey = getKlaviyoPrivateApiKey();
		if (!apiKey) return; // not configured — fail-soft

		const email = order.userEmail?.trim();
		if (!email) {
			// Almost always a webhook-subscription misconfiguration (the ORDER_PAID
			// subscription must select `order { userEmail }`). Warn so it's visible.
			console.warn(`[Klaviyo] order ${order.number ?? order.id} has no userEmail; skipping Placed Order`);
			return;
		}

		const currency = order.total?.gross?.currency ?? "USD";
		const value = money(num(order.total?.gross?.amount));
		const orderNumber = order.number ?? order.id;

		const lines = await fetchOrderLines(order.id);
		const items = lines.map((l) => ({
			ProductID: l.productId ?? l.sku ?? l.productName,
			...(l.sku ? { SKU: l.sku } : {}),
			ProductName: l.productName,
			...(l.variantName ? { VariantName: l.variantName } : {}),
			Quantity: l.quantity,
			ItemPrice: l.unitPrice,
			RowTotal: l.lineTotal,
			Currency: currency,
		}));

		await sendEvent(apiKey, {
			metric: "Placed Order",
			email,
			value,
			uniqueId: order.id,
			properties: {
				OrderId: order.id,
				OrderNumber: orderNumber,
				$value: value,
				Currency: currency,
				ItemCount: lines.reduce((s, l) => s + l.quantity, 0),
				ItemNames: lines.map((l) => l.productName),
				Items: items,
			},
		});

		// Per-line product events (skipped silently when line detail is unavailable).
		await Promise.allSettled(
			lines.map((l, i) =>
				sendEvent(apiKey, {
					metric: "Ordered Product",
					email,
					value: l.lineTotal,
					// Stable per-line key (variant > sku > index) so Saleor retries dedup
					// even if line ordering shifts between fetches.
					uniqueId: `${order.id}:${l.variantId ?? l.sku ?? i}`,
					properties: {
						OrderId: order.id,
						OrderNumber: orderNumber,
						ProductID: l.productId ?? l.sku ?? l.productName,
						...(l.sku ? { SKU: l.sku } : {}),
						ProductName: l.productName,
						...(l.variantName ? { VariantName: l.variantName } : {}),
						Quantity: l.quantity,
						ItemPrice: l.unitPrice,
						RowTotal: l.lineTotal,
						Currency: currency,
						$value: l.lineTotal,
					},
				}),
			),
		);
	} catch (err) {
		console.error("[Klaviyo] mirrorPaidOrderToKlaviyo failed:", err);
	}
}

/**
 * POST a single event to Klaviyo's Events API. Resolves regardless of outcome;
 * logs non-2xx so failures are visible without breaking the caller.
 */
async function sendEvent(
	apiKey: string,
	event: {
		metric: string;
		email: string;
		value: number;
		uniqueId: string;
		properties: Record<string, unknown>;
	},
): Promise<void> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
	try {
		const res = await fetch(KLAVIYO_EVENTS_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Klaviyo-API-Key ${apiKey}`,
				revision: KLAVIYO_REVISION,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				data: {
					type: "event",
					attributes: {
						properties: event.properties,
						value: event.value,
						unique_id: event.uniqueId,
						metric: { data: { type: "metric", attributes: { name: event.metric } } },
						profile: { data: { type: "profile", attributes: { email: event.email } } },
					},
				},
			}),
			signal: controller.signal,
		});
		if (!res.ok) {
			console.error(
				`[Klaviyo] ${event.metric} event rejected:`,
				res.status,
				await res.text().catch(() => ""),
			);
		}
	} catch (err) {
		console.error(`[Klaviyo] ${event.metric} event failed:`, err);
	} finally {
		clearTimeout(timer);
	}
}

const ORDER_LINES_QUERY = `query OrderForKlaviyo($id: ID!) {
  order(id: $id) {
    lines {
      quantity
      productName
      variantName
      unitPrice { gross { amount } }
      totalPrice { gross { amount } }
      variant { id sku product { id } }
    }
  }
}`;

interface OrderLinesResponse {
	order?: {
		lines?: Array<{
			quantity?: number;
			productName?: string;
			variantName?: string | null;
			unitPrice?: { gross?: { amount?: number } };
			totalPrice?: { gross?: { amount?: number } };
			variant?: { id?: string; sku?: string | null; product?: { id?: string } } | null;
		}>;
	} | null;
}

/**
 * Fetch order line detail from Saleor using the app token (MANAGE_ORDERS). The
 * ORDER_PAID webhook payload omits lines, so we read them here for per-line
 * `Ordered Product` events. Returns `[]` (not an error) when the token is missing
 * or the query fails — `Placed Order` still goes out with the order total.
 */
async function fetchOrderLines(orderId: string): Promise<NormalizedLine[]> {
	const appToken = process.env.SALEOR_APP_TOKEN?.trim();
	if (!appToken) return [];

	// Bound the fetch: a hung Saleor API must not delay the webhook. On timeout we
	// fall back to an itemless Placed Order (revenue is still captured from the
	// webhook total) rather than blocking the commission path.
	const result = await Promise.race([
		executeRawGraphQL<OrderLinesResponse>({
			query: ORDER_LINES_QUERY,
			variables: { id: orderId },
			headers: { Authorization: `Bearer ${appToken}` },
		}),
		new Promise<null>((resolve) => setTimeout(() => resolve(null), CALL_TIMEOUT_MS)),
	]);

	if (!result) {
		console.error("[Klaviyo] order line fetch timed out");
		return [];
	}
	if (!result.ok) {
		console.error("[Klaviyo] order line fetch failed:", result.error.message);
		return [];
	}

	const lines = result.data.order?.lines ?? [];
	return lines.map((l) => {
		const quantity = num(l.quantity);
		const unitPrice = money(num(l.unitPrice?.gross?.amount));
		const lineTotal =
			l.totalPrice?.gross?.amount != null
				? money(num(l.totalPrice.gross.amount))
				: money(unitPrice * quantity);
		return {
			productName: l.productName ?? "Product",
			variantName: l.variantName ?? undefined,
			sku: l.variant?.sku ?? undefined,
			productId: l.variant?.product?.id ?? undefined,
			variantId: l.variant?.id ?? undefined,
			quantity,
			unitPrice,
			lineTotal,
		};
	});
}
