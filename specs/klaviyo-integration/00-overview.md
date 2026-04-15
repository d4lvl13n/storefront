# Klaviyo Integration — Architecture Overview

## Goal

Implement a complete email marketing pipeline for InfinityBio Labs:

1. **Email capture popup** — timed modal (5-10s delay) offering 10% off first order
2. **Automated welcome sequence** — 3-email flow (discount code, brand intro, product showcase)
3. **Ongoing automation** — abandoned cart recovery, new product announcements, promotional campaigns

## Platform Choice

**Klaviyo** — e-commerce-first email marketing platform.

- Profile-based pricing (~$20/month at 500 profiles)
- Deep e-commerce automation (abandoned cart, browse abandonment, predictive analytics)
- API-first architecture compatible with headless commerce
- Flow triggers: list subscription, custom events via API, metrics

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Frontend (Client)                                       │
│                                                                   │
│  ┌────────────────────┐     ┌──────────────────────────────┐     │
│  │  NewsletterPopup    │────▶│  POST /api/newsletter         │     │
│  │  (Radix Dialog)     │     │  (Next.js API Route)          │     │
│  │  - 5-10s delay      │     │                                │     │
│  │  - localStorage     │     │  1. Validate email             │     │
│  │    dismiss flag      │     │  2. Create Saleor voucher      │     │
│  └────────────────────┘     │  3. Subscribe to Klaviyo list   │     │
│                              │  4. Return success + code       │     │
│  ┌────────────────────┐     └──────────────────────────────┘     │
│  │  klaviyo.js SDK     │                                          │
│  │  - identify()       │     ┌──────────────────────────────┐     │
│  │  - track() events   │     │  POST /api/klaviyo/webhook     │     │
│  │  - page views       │     │  (Saleor webhook receiver)     │     │
│  └────────────────────┘     │                                │     │
│                              │  Receives Saleor events:       │     │
│                              │  - ORDER_CREATED               │     │
│                              │  - ORDER_FULFILLED             │     │
│                              │  Forwards to Klaviyo Events API│     │
│                              └──────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────┘
                                       │
              ┌────────────────────────┼─────────────────────────┐
              │                        │                          │
              ▼                        ▼                          ▼
     ┌─────────────┐        ┌──────────────┐          ┌──────────────┐
     │  Saleor API  │        │  Klaviyo API  │          │  Klaviyo     │
     │  (GraphQL)   │        │  (REST v3)    │          │  Dashboard   │
     │              │        │               │          │              │
     │  voucherCreate│       │  Subscribe    │          │  Flows:      │
     │  (unique code)│       │  Track events │          │  - Welcome   │
     │              │        │  Profiles     │          │  - Abandoned │
     │  Webhooks ────┼──────▶│               │          │    cart       │
     │  ORDER_*     │        │               │          │  - Winback   │
     └─────────────┘        └──────────────┘          └──────────────┘
```

## Key Design Decisions

### 1. Coupon codes are generated in Saleor, not Klaviyo

Klaviyo's dynamic coupon auto-generation **only works with Shopify/WooCommerce/Magento**. For headless stores:

- We generate unique voucher codes via Saleor's `voucherCreate` GraphQL mutation
- The code is passed to Klaviyo as a **profile custom property** (`welcome_discount_code`)
- Klaviyo email templates reference `{{ person|lookup:'welcome_discount_code' }}` to display the code

### 2. Server-side Klaviyo API (not client-side subscription)

We use the **server-side** `POST /api/lists/{list_id}/subscribe` endpoint (private API key) instead of the client-side subscription endpoint because:

- We need to create the Saleor voucher atomically with the subscription
- We can set custom profile properties (discount code) in the same call
- Better error handling and rate limiting on our API route
- No exposure of Klaviyo keys to the browser

### 3. klaviyo.js SDK for client-side tracking only

The Klaviyo JavaScript SDK loads on the frontend for:

- `identify()` — associates browsing session with email after signup
- `track("Viewed Product", ...)` — browse abandonment data
- Page view tracking for analytics

It does **not** handle the popup or subscription — that's our custom UI + API route.

### 4. Saleor webhooks forward to Klaviyo Events API

Saleor emits webhooks for order events. A dedicated API route (`/api/klaviyo/webhook`) receives these and forwards them to Klaviyo's Events API as custom metrics:

- `Placed Order` — from `ORDER_CREATED`
- `Order Fulfilled` — from `ORDER_FULFILLED`
- `Started Checkout` — from `CHECKOUT_CREATED` (optional, Phase 2)

### 5. Popup uses localStorage, not cookies

The popup dismiss state is stored in `localStorage` (not a cookie) because:

- It's purely a client-side UI concern
- No need to send it to the server on every request
- Simple key: `infinitybio_popup_dismissed` with timestamp value

## Implementation Phases

### Phase 1: Email Capture + Welcome Flow (this spec)

- [ ] Newsletter popup component
- [ ] `/api/newsletter` API route (Saleor voucher + Klaviyo subscribe)
- [ ] Klaviyo account setup + welcome flow (3 emails)
- [ ] Environment variables + secrets

### Phase 2: Event Tracking + Abandoned Cart

- [ ] klaviyo.js SDK integration (identify, track)
- [ ] `/api/klaviyo/webhook` route for Saleor events
- [ ] Saleor webhook configuration (ORDER_CREATED, ORDER_FULFILLED)
- [ ] Klaviyo abandoned cart flow
- [ ] Klaviyo browse abandonment flow

### Phase 3: Advanced Campaigns

- [ ] Customer segmentation based on purchase history
- [ ] Winback flows (inactive customers)
- [ ] New product announcement campaigns
- [ ] VIP/loyalty tier emails

## Files to Create/Modify

### New Files

| File                                     | Purpose                                                             |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `src/ui/components/newsletter-popup.tsx` | Client component — timed modal with email input                     |
| `src/app/api/newsletter/route.ts`        | API route — validate, create voucher, subscribe to Klaviyo          |
| `src/lib/klaviyo.ts`                     | Klaviyo API client — typed functions for subscribe, track, identify |
| `src/lib/saleor-admin.ts`                | Saleor admin API client — voucher creation with app token           |
| `src/graphql/VoucherCreate.graphql`      | GraphQL mutation for voucher creation                               |
| `src/ui/components/klaviyo-script.tsx`   | Client component — loads klaviyo.js SDK (Phase 2)                   |
| `src/app/api/klaviyo/webhook/route.ts`   | Webhook receiver — Saleor events to Klaviyo (Phase 2)               |

### Modified Files

| File                                  | Change                                             |
| ------------------------------------- | -------------------------------------------------- |
| `src/app/[channel]/(main)/layout.tsx` | Mount `<NewsletterPopup />` inside layout          |
| `.env.example`                        | Add Klaviyo + Saleor admin env vars                |
| `.gitignore`                          | Ensure `.env.local` is ignored (already should be) |

## Dependencies

No new npm packages required. Everything uses:

- `@radix-ui/react-dialog` (already installed) — popup modal
- Native `fetch` — Klaviyo API calls
- `executeRawGraphQL` from `src/lib/graphql.ts` — Saleor voucher creation

## Related Specs

- [01-popup-component.md](./01-popup-component.md) — Popup UI spec
- [02-api-route.md](./02-api-route.md) — Newsletter API route
- [03-klaviyo-setup.md](./03-klaviyo-setup.md) — Klaviyo account + flow configuration
- [04-saleor-voucher.md](./04-saleor-voucher.md) — Saleor voucher generation
- [05-event-tracking.md](./05-event-tracking.md) — Saleor webhook to Klaviyo events (Phase 2)
- [06-env-config.md](./06-env-config.md) — Environment variables & secrets
