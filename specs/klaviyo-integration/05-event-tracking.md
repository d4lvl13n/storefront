# Spec 05 — Event Tracking & Abandoned Cart (Phase 2)

## Summary

Phase 2 integrates deeper e-commerce events between Saleor and Klaviyo, enabling abandoned cart recovery, browse abandonment, and order-triggered automation. This spec covers:

1. **Client-side**: klaviyo.js SDK for identify + browse tracking
2. **Server-side**: Saleor webhooks forwarded to Klaviyo Events API

---

## Part A: Client-Side — klaviyo.js SDK

### File

`src/ui/components/klaviyo-script.tsx`

### Purpose

Loads the Klaviyo JavaScript SDK on the frontend for:

- **Identifying** users (linking browsing sessions to email profiles)
- **Tracking product views** (browse abandonment data)
- **Page view tracking** (general analytics)

### Implementation

```tsx
"use client";

import Script from "next/script";

const KLAVIYO_COMPANY_ID = process.env.NEXT_PUBLIC_KLAVIYO_COMPANY_ID;

export function KlaviyoScript() {
	if (!KLAVIYO_COMPANY_ID) return null;

	return (
		<>
			<Script
				id="klaviyo-sdk"
				src={`https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=${KLAVIYO_COMPANY_ID}`}
				strategy="afterInteractive"
			/>
		</>
	);
}
```

### Mounting Point

In `src/app/layout.tsx`, alongside the existing `<GoogleAnalytics />`:

```tsx
<KlaviyoScript />
```

### Client-Side Tracking Functions

Create a utility file `src/lib/klaviyo-client.ts` for use in client components:

```typescript
// Type declaration for the Klaviyo global object
declare global {
	interface Window {
		klaviyo?:
			| Array<unknown>
			| {
					identify: (properties: Record<string, unknown>) => void;
					track: (eventName: string, properties?: Record<string, unknown>) => void;
					trackViewedItem: (item: KlaviyoViewedItem) => void;
			  };
	}
}

interface KlaviyoViewedItem {
	Title: string;
	ItemId: string;
	ImageUrl: string;
	Url: string;
	Metadata: {
		Price: number;
		CompareAtPrice?: number;
		Brand?: string;
		Categories?: string[];
	};
}

/**
 * Identify a user in Klaviyo. Call after login or newsletter signup.
 */
export function klaviyoIdentify(email: string, properties?: Record<string, unknown>) {
	if (typeof window === "undefined" || !window.klaviyo) return;

	const payload = { $email: email, ...properties };

	if (Array.isArray(window.klaviyo)) {
		window.klaviyo.push(["identify", payload]);
	} else {
		window.klaviyo.identify(payload);
	}
}

/**
 * Track a custom event in Klaviyo.
 */
export function klaviyoTrack(eventName: string, properties?: Record<string, unknown>) {
	if (typeof window === "undefined" || !window.klaviyo) return;

	if (Array.isArray(window.klaviyo)) {
		window.klaviyo.push(["track", eventName, properties]);
	} else {
		window.klaviyo.track(eventName, properties);
	}
}

/**
 * Track a product view for browse abandonment.
 * Call on product detail pages.
 */
export function klaviyoTrackViewedProduct(item: KlaviyoViewedItem) {
	if (typeof window === "undefined" || !window.klaviyo) return;

	if (Array.isArray(window.klaviyo)) {
		window.klaviyo.push(["trackViewedItem", item]);
	} else {
		window.klaviyo.trackViewedItem(item);
	}
}
```

### Where to Call These Functions

| Function                             | Where                             | When                              |
| ------------------------------------ | --------------------------------- | --------------------------------- |
| `klaviyoIdentify(email)`             | Newsletter popup success callback | After successful subscription     |
| `klaviyoIdentify(email)`             | Login/register success            | After authentication              |
| `klaviyoTrackViewedProduct(item)`    | Product detail page               | On page load (`useEffect`)        |
| `klaviyoTrack("Added to Cart", ...)` | Cart add handler                  | After `checkoutLinesAdd` mutation |

### Product View Tracking Example

In the product detail page component:

```tsx
"use client";

import { useEffect } from "react";
import { klaviyoTrackViewedProduct } from "@/lib/klaviyo-client";

// Inside the component:
useEffect(() => {
	klaviyoTrackViewedProduct({
		Title: product.name,
		ItemId: product.id,
		ImageUrl: product.thumbnail?.url ?? "",
		Url: window.location.href,
		Metadata: {
			Price: product.pricing?.priceRange?.start?.gross?.amount ?? 0,
			Brand: "InfinityBio Labs",
			Categories: product.categories?.map((c) => c.name) ?? [],
		},
	});
}, [product.id]);
```

---

## Part B: Server-Side — Saleor Webhooks to Klaviyo

### File

`src/app/api/klaviyo/webhook/route.ts`

### Purpose

Receives Saleor webhook events and forwards them to Klaviyo's Events API as custom metrics. This enables Klaviyo flows triggered by:

- **Placed Order** — for post-purchase flows
- **Order Fulfilled** — for review request flows
- **Checkout Created** — for abandoned cart flows (optional)

### Saleor Webhook Configuration

In Saleor Dashboard, go to **Apps > [Storefront Newsletter App] > Webhooks** and create:

| Webhook         | Event             | Target URL                                     |
| --------------- | ----------------- | ---------------------------------------------- |
| Order Created   | `ORDER_CREATED`   | `https://{STOREFRONT_URL}/api/klaviyo/webhook` |
| Order Fulfilled | `ORDER_FULFILLED` | `https://{STOREFRONT_URL}/api/klaviyo/webhook` |

Each webhook sends a POST with the event payload. Configure the subscription query to include the data we need:

**ORDER_CREATED subscription query:**

```graphql
subscription {
	event {
		... on OrderCreated {
			order {
				id
				number
				created
				total {
					gross {
						amount
						currency
					}
				}
				lines {
					productName
					variantName
					quantity
					unitPrice {
						gross {
							amount
							currency
						}
					}
					thumbnail {
						url
					}
				}
				userEmail
				billingAddress {
					firstName
					lastName
					city
					country {
						code
					}
				}
				voucher {
					code
				}
				channel {
					slug
				}
			}
		}
	}
}
```

### Webhook Handler Implementation

```typescript
import { NextRequest, NextResponse } from "next/server";
import { trackEvent } from "@/lib/klaviyo";

// Saleor sends the event type in a header
const SALEOR_EVENT_HEADER = "saleor-event";
// Saleor signs webhooks with HMAC
const SALEOR_SIGNATURE_HEADER = "saleor-signature";

export async function POST(request: NextRequest) {
	const eventType = request.headers.get(SALEOR_EVENT_HEADER);
	const signature = request.headers.get(SALEOR_SIGNATURE_HEADER);

	// TODO: Verify webhook signature using HMAC-SHA256
	// For now, rely on the secret URL path or a shared secret header

	const body = await request.json();

	switch (eventType) {
		case "order_created":
			return handleOrderCreated(body);
		case "order_fulfilled":
			return handleOrderFulfilled(body);
		default:
			return NextResponse.json({ ignored: true }, { status: 200 });
	}
}

async function handleOrderCreated(payload: unknown) {
	// Extract order data from Saleor webhook payload
	const order = (payload as any)?.order;
	if (!order?.userEmail) {
		return NextResponse.json({ error: "No user email in order" }, { status: 200 });
	}

	await trackEvent(order.userEmail, "Placed Order", {
		OrderId: order.number,
		Value: order.total?.gross?.amount,
		Currency: order.total?.gross?.currency,
		ItemCount: order.lines?.length ?? 0,
		Items: order.lines?.map((line: any) => ({
			ProductName: line.productName,
			Variant: line.variantName,
			Quantity: line.quantity,
			Price: line.unitPrice?.gross?.amount,
			ImageUrl: line.thumbnail?.url,
		})),
		VoucherCode: order.voucher?.code ?? null,
	});

	return NextResponse.json({ ok: true });
}

async function handleOrderFulfilled(payload: unknown) {
	const order = (payload as any)?.order;
	if (!order?.userEmail) {
		return NextResponse.json({ error: "No user email" }, { status: 200 });
	}

	await trackEvent(order.userEmail, "Order Fulfilled", {
		OrderId: order.number,
		Value: order.total?.gross?.amount,
	});

	return NextResponse.json({ ok: true });
}
```

### Abandoned Cart Flow

Klaviyo's abandoned cart flow works through a combination of:

1. **Client-side**: klaviyo.js tracks "Started Checkout" when a user identifies themselves during checkout
2. **Server-side**: Saleor's `CHECKOUT_CREATED` webhook sends checkout data to Klaviyo

The flow triggers when Klaviyo detects that a "Started Checkout" event occurred but no corresponding "Placed Order" event followed within a configurable window (default: 2-4 hours).

**Klaviyo Flow Configuration:**

- Trigger: Metric — "Started Checkout"
- Flow filter: Has NOT "Placed Order" since starting this flow
- Time delay: 2 hours
- Email 1: Cart reminder (show cart items)
- Time delay: 24 hours
- Email 2: Urgency reminder
- Time delay: 3 days
- Email 3: Final nudge with incentive (optional small discount)

### Events to Track (Summary)

| Event Name         | Source              | Trigger                            |
| ------------------ | ------------------- | ---------------------------------- |
| `Viewed Product`   | Client (klaviyo.js) | Product detail page load           |
| `Added to Cart`    | Client (klaviyo.js) | After `checkoutLinesAdd`           |
| `Started Checkout` | Client (klaviyo.js) | Checkout page load (if identified) |
| `Placed Order`     | Server (webhook)    | Saleor `ORDER_CREATED`             |
| `Order Fulfilled`  | Server (webhook)    | Saleor `ORDER_FULFILLED`           |

### Webhook Security

Saleor signs webhook payloads with HMAC-SHA256. The signature is in the `saleor-signature` header. To verify:

```typescript
import { createHmac } from "crypto";

function verifyWebhookSignature(payload: string, signature: string, secretKey: string): boolean {
	const hmac = createHmac("sha256", secretKey);
	hmac.update(payload);
	const expected = hmac.digest("hex");
	return signature === expected;
}
```

The `secretKey` is the webhook's secret key from Saleor Dashboard. Store it as `SALEOR_WEBHOOK_SECRET` env var.

---

## Implementation Priority

Phase 2 should be implemented in this order:

1. **klaviyo.js SDK** (`klaviyo-script.tsx`) — quick win, enables basic tracking
2. **Product view tracking** — enables browse abandonment
3. **Webhook handler** — enables post-purchase flows
4. **Identify on login** — links sessions to profiles
5. **Abandoned cart flow** — highest ROI automation

---

## Checklist

- [ ] Create `src/ui/components/klaviyo-script.tsx`
- [ ] Add `<KlaviyoScript />` to root layout
- [ ] Create `src/lib/klaviyo-client.ts` (client-side tracking utilities)
- [ ] Add `klaviyoIdentify` call to newsletter popup success
- [ ] Add `klaviyoTrackViewedProduct` to product detail page
- [ ] Create `src/app/api/klaviyo/webhook/route.ts`
- [ ] Configure Saleor webhooks in Dashboard (ORDER_CREATED, ORDER_FULFILLED)
- [ ] Create Klaviyo "Placed Order" metric flow
- [ ] Create Klaviyo abandoned cart flow
- [ ] Add `SALEOR_WEBHOOK_SECRET` env var
- [ ] Add `NEXT_PUBLIC_KLAVIYO_COMPANY_ID` env var
