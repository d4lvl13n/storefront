import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
	getAffiliateByCode,
	recordCommission,
	getCommissionByOrderId,
	reverseCommissionByOrderId,
} from "@/lib/affiliate/db";
import { mirrorPaidOrderToKlaviyo } from "@/lib/analytics/klaviyo-server";

const WEBHOOK_SECRET = process.env.SALEOR_WEBHOOK_SECRET;

/**
 * Verify Saleor webhook HMAC signature: HMAC-SHA256 hex of the RAW request
 * body (unparsed bytes), keyed with SALEOR_WEBHOOK_SECRET.
 */
function verifySignature(payload: string, signature: string | null): boolean {
	if (!WEBHOOK_SECRET || !signature) return false;
	const hmac = createHmac("sha256", WEBHOOK_SECRET);
	hmac.update(payload);
	const expected = hmac.digest("hex");
	try {
		return timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(expected));
	} catch {
		return false;
	}
}

/**
 * Webhook handler for Saleor order events.
 *
 * Configure in Saleor Dashboard → Configuration → Webhooks:
 *   URL: https://your-site.com/api/affiliate/webhook
 *   Events: ORDER_PAID (records commission) plus ORDER_FULLY_REFUNDED,
 *           ORDER_REFUNDED and ORDER_CANCELLED (reverse the commission so a
 *           clawed-back order is never paid out).
 *   The handler dispatches on the `Saleor-Event` header, so all of these point
 *   at this one URL. The subscription MUST select `userEmail` (used for the
 *   self-referral guard and the Klaviyo mirror):
 *
 *   subscription {
 *     event {
 *       ... on OrderPaid { order { ...orderFields } }
 *       ... on OrderFullyRefunded { order { id } }
 *       ... on OrderRefunded { order { id } }
 *       ... on OrderCancelled { order { id } }
 *     }
 *   }
 *   fragment orderFields on Order {
 *     id
 *     number
 *     userEmail
 *     total { gross { amount currency } }
 *     discounts { amount { amount } }
 *     voucher { code }
 *     channel { slug }
 *   }
 */
export async function POST(request: NextRequest) {
	const rawBody = await request.text();

	// Verify webhook signature. Saleor sends `Saleor-Signature`; older
	// versions used the deprecated `X-Saleor-Signature` — accept either.
	const signature = request.headers.get("saleor-signature") ?? request.headers.get("x-saleor-signature");
	if (!verifySignature(rawBody, signature)) {
		console.warn("[Affiliate Webhook] Invalid signature");
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}

	// Extract order from Saleor webhook payload.
	// Saleor subscription webhooks wrap data differently than sync webhooks.
	const order = extractOrder(payload);
	if (!order) {
		console.log("[Affiliate Webhook] No order data in payload, skipping");
		return Response.json({ ok: true, skipped: true });
	}

	// Saleor sends the event name in the `Saleor-Event` header (e.g. "order_paid").
	// Dispatch on it so this one endpoint handles both payment and refund/cancel,
	// and so an unrelated order event can never be mistaken for a payment. An
	// absent header is treated as the legacy ORDER_PAID path for compatibility.
	const event = (request.headers.get("saleor-event") ?? "").toLowerCase();
	const isRefundOrCancel =
		event === "order_refunded" || event === "order_fully_refunded" || event === "order_cancelled";
	const isPaid = event === "order_paid" || event === "";

	// Refund / cancellation: reverse the commission so a clawed-back order is
	// never paid out. Idempotent — a re-delivery finds it already reversed.
	if (isRefundOrCancel) {
		const reversed = await reverseCommissionByOrderId(order.id);
		if (reversed) {
			console.log(`[Affiliate Webhook] Reversed commission for order ${order.id} (${event})`);
		}
		return Response.json({ ok: true, reversed: Boolean(reversed) });
	}

	if (!isPaid) {
		console.log(`[Affiliate Webhook] Unhandled event "${event}" for order ${order.id}, skipping`);
		return Response.json({ ok: true, skipped: true, reason: "unhandled-event" });
	}

	// Mirror EVERY paid order into Klaviyo (Placed Order + per-line Ordered
	// Product) — independent of affiliate status, so it runs before the
	// voucher/affiliate early-returns below. Never throws and dedups via unique_id
	// against Saleor retries; awaited so it finishes before this function returns.
	await mirrorPaidOrderToKlaviyo(order);

	const voucherCode = order.voucher?.code;
	if (!voucherCode) {
		console.log(`[Affiliate Webhook] Order #${order.number} has no voucher, skipping`);
		return Response.json({ ok: true, skipped: true });
	}

	// Check if we already recorded a commission for this order (idempotency)
	const existing = await getCommissionByOrderId(order.id);
	if (existing) {
		console.log(`[Affiliate Webhook] Commission already recorded for order ${order.id}`);
		return Response.json({ ok: true, skipped: true, reason: "duplicate" });
	}

	// Look up the affiliate by voucher code
	const affiliate = await getAffiliateByCode(voucherCode);
	if (!affiliate) {
		console.log(`[Affiliate Webhook] Voucher "${voucherCode}" is not an affiliate code, skipping`);
		return Response.json({ ok: true, skipped: true });
	}

	if (!affiliate.active) {
		console.log(`[Affiliate Webhook] Affiliate "${affiliate.code}" is inactive, skipping`);
		return Response.json({ ok: true, skipped: true, reason: "inactive" });
	}

	// Self-referral guard: an affiliate must not earn commission on their own
	// purchase (a fresh account + their own code). Compare the buyer email to the
	// affiliate's, case-insensitively.
	const buyerEmail = order.userEmail?.trim().toLowerCase();
	if (buyerEmail && buyerEmail === affiliate.email.trim().toLowerCase()) {
		console.log(
			`[Affiliate Webhook] Order #${order.number} is a self-referral by "${affiliate.code}", skipping commission`,
		);
		return Response.json({ ok: true, skipped: true, reason: "self-referral" });
	}

	// Calculate commission
	const orderTotal = order.total?.gross?.amount ?? 0;
	const currency = order.total?.gross?.currency ?? "USD";
	const discountAmount =
		order.discounts?.reduce(
			(sum: number, d: { amount?: { amount?: number } }) => sum + (d.amount?.amount ?? 0),
			0,
		) ?? 0;

	// Commission is calculated on the order total (after discount)
	const commissionAmount = Math.round(orderTotal * affiliate.commission_rate * 100) / 100;

	const commission = await recordCommission({
		affiliate_id: affiliate.id,
		order_id: order.id,
		order_number: order.number ?? "",
		order_total: orderTotal,
		discount_amount: discountAmount,
		commission_amount: commissionAmount,
		currency,
	});

	// Race-safe duplicate (a concurrent retry won the insert): still a 2xx so
	// Saleor stops retrying — never double-credits, never loops.
	if (!commission) {
		console.log(`[Affiliate Webhook] Commission already recorded for order ${order.id} (race)`);
		return Response.json({ ok: true, skipped: true, reason: "duplicate" });
	}

	const sanitizedCode = voucherCode.replace(/[\r\n]/g, "");
	const sanitizedNumber = (order.number ?? "").replace(/[\r\n]/g, "");
	console.log(
		`[Affiliate Webhook] Recorded commission: order #${sanitizedNumber}, ` +
			`affiliate "${sanitizedCode}", amount ${commissionAmount} ${currency}`,
	);

	return Response.json({
		ok: true,
		commission: {
			id: commission.id,
			order_number: order.number,
			affiliate_code: affiliate.code,
			commission_amount: commissionAmount,
			currency,
		},
	});
}

// ============================================================================
// Payload parsing
// ============================================================================

interface OrderPayload {
	id: string;
	number?: string;
	userEmail?: string;
	total?: { gross?: { amount?: number; currency?: string } };
	discounts?: Array<{ amount?: { amount?: number } }>;
	voucher?: { code?: string };
}

/**
 * Extract order data from various Saleor webhook payload formats.
 * Handles both subscription-based and legacy event payloads.
 */
function extractOrder(payload: unknown): OrderPayload | null {
	if (!payload || typeof payload !== "object") return null;
	const data = payload as Record<string, unknown>;

	// Subscription payload: { order: { ... } }
	if (data.order && typeof data.order === "object") {
		return data.order as OrderPayload;
	}

	// Legacy payload with event wrapper
	if (data.event && typeof data.event === "object") {
		const event = data.event as Record<string, unknown>;
		if (event.order && typeof event.order === "object") {
			return event.order as OrderPayload;
		}
	}

	return null;
}
