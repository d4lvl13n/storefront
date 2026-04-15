# Spec 03 — Klaviyo Account Setup & Flow Configuration

## Summary

Step-by-step Klaviyo configuration and the `src/lib/klaviyo.ts` API client. This covers both the dashboard setup (manual, one-time) and the code that talks to Klaviyo's API.

---

## Part A: Klaviyo Dashboard Setup (Manual)

### A1. Create Klaviyo Account

1. Sign up at https://www.klaviyo.com
2. During onboarding, select "Other" for e-commerce platform (not Shopify)
3. Set company name: "InfinityBio Labs"
4. Set website URL: (production domain, or `http://localhost:3000` for now)
5. Set timezone to match business operations

### A2. Get API Keys

Navigate to **Account > Settings > API Keys**:

| Key Type                     | Name                     | Where Used                                                            |
| ---------------------------- | ------------------------ | --------------------------------------------------------------------- |
| **Private API Key**          | `infinitybio-storefront` | Server-side (`KLAVIYO_PRIVATE_API_KEY` env var)                       |
| **Public API Key / Site ID** | (auto-generated)         | Client-side klaviyo.js SDK (`NEXT_PUBLIC_KLAVIYO_COMPANY_ID` env var) |

The private key starts with `pk_` and has scopes. Required scopes:

- `lists:read`
- `lists:write`
- `profiles:read`
- `profiles:write`
- `events:read`
- `events:write`
- `coupon-codes:read`
- `coupon-codes:write`

### A3. Create the Welcome List

Navigate to **Audience > Lists & Segments > Create List**:

| Field          | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Name           | `Newsletter - Welcome`                                                   |
| Type           | List (not segment)                                                       |
| Opt-in process | Single opt-in (no double opt-in — the popup is already explicit consent) |

**Save the List ID** — it looks like `UbCdef`. This becomes the `KLAVIYO_WELCOME_LIST_ID` env var.

### A4. Create the Welcome Flow

Navigate to **Flows > Create Flow > Build your own**:

**Flow name:** `Welcome Series`  
**Trigger:** List trigger — "When someone is added to `Newsletter - Welcome`"

#### Email 1: Welcome + Discount Code (Immediate)

| Field        | Value                                                  |
| ------------ | ------------------------------------------------------ |
| Subject      | Welcome to InfinityBio Labs — Your 10% Discount Inside |
| Preview text | Your exclusive code is waiting...                      |
| Send time    | Immediately after trigger                              |

**Template content:**

```
Hi {{ first_name|default:"there" }},

Welcome to InfinityBio Labs.

As promised, here's your exclusive 10% discount code:

{{ person|lookup:'welcome_discount_code' }}

Use it at checkout on your first order. This code is single-use and expires in 90 days.

[Shop Now →]

— The InfinityBio Labs Team
```

**Conditional block (important):** If `welcome_discount_code` is empty/null, replace the code section with:

```
Contact us at support@infinitybiolabs.com to receive your welcome discount.
```

#### Time Delay: Wait 2 Days

#### Email 2: Brand Introduction (Day 2)

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| Subject      | Why Researchers Choose InfinityBio Labs        |
| Preview text | Pharmaceutical-grade quality, rigorous testing |
| Send time    | 2 days after Email 1                           |

Content: Brand story, quality standards, COA commitment, lab certifications. No hard sell — credibility building.

#### Time Delay: Wait 3 Days

#### Email 3: Product Showcase (Day 5)

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| Subject      | Our Most Popular Research Peptides          |
| Preview text | See what's trending in the lab              |
| Send time    | 5 days after Email 1 (3 days after Email 2) |

Content: Top 3-5 best-selling products with images, brief descriptions, and links. Reminder that the welcome discount is still active.

### A5. Configure Webhooks (Optional, for debugging)

Navigate to **Account > Settings > Webhooks**:

For Phase 1, no webhooks FROM Klaviyo are needed. The data flow is one-way (we push to Klaviyo).

In Phase 2, configure a webhook for unsubscribe events to sync back to Saleor.

---

## Part B: Klaviyo API Client (`src/lib/klaviyo.ts`)

### File

`src/lib/klaviyo.ts`

### Environment Variables Required

```
KLAVIYO_PRIVATE_API_KEY=pk_xxxxxxxxxxxx
KLAVIYO_WELCOME_LIST_ID=UbCdef
```

### API Constants

```typescript
const KLAVIYO_BASE_URL = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2024-10-15"; // API revision header — pin to tested version
```

### Functions

#### `subscribeToWelcomeList(email: string, properties: Record<string, string>)`

Subscribes a profile to the welcome list with custom properties.

```typescript
export async function subscribeToWelcomeList(
	email: string,
	properties: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
	const listId = process.env.KLAVIYO_WELCOME_LIST_ID;

	if (!apiKey || !listId) {
		return { ok: false, error: "Klaviyo not configured" };
	}

	const response = await fetch(`${KLAVIYO_BASE_URL}/lists/${listId}/subscribe`, {
		method: "POST",
		headers: {
			Authorization: `Klaviyo-API-Key ${apiKey}`,
			"Content-Type": "application/json",
			Revision: KLAVIYO_REVISION,
		},
		body: JSON.stringify({
			data: [
				{
					type: "profile",
					attributes: {
						email,
						properties,
					},
				},
			],
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		console.error(`[Klaviyo] Subscribe failed: ${response.status} ${body}`);
		return { ok: false, error: `Klaviyo API error: ${response.status}` };
	}

	return { ok: true };
}
```

**Expected response:** `202 Accepted` (async processing — Klaviyo doesn't confirm immediately)

#### `isProfileSubscribed(email: string)`

Checks if a profile already exists and is subscribed.

```typescript
export async function isProfileSubscribed(
	email: string,
): Promise<{ subscribed: boolean } | { error: string }> {
	const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

	if (!apiKey) {
		return { error: "Klaviyo not configured" };
	}

	const response = await fetch(
		`${KLAVIYO_BASE_URL}/profiles/?filter=equals(email,"${encodeURIComponent(email)}")`,
		{
			method: "GET",
			headers: {
				Authorization: `Klaviyo-API-Key ${apiKey}`,
				"Content-Type": "application/json",
				Revision: KLAVIYO_REVISION,
			},
		},
	);

	if (!response.ok) {
		return { error: `Klaviyo API error: ${response.status}` };
	}

	const body = await response.json();
	const profiles = body?.data ?? [];
	return { subscribed: profiles.length > 0 };
}
```

**Note:** This is a soft check. A profile existing doesn't necessarily mean they're on the welcome list — it means they've interacted with Klaviyo before. For Phase 1, this is sufficient to prevent duplicate voucher creation. For stricter checks, query list membership.

#### `trackEvent(email: string, eventName: string, properties: Record<string, unknown>)` (Phase 2)

Tracks a custom event for a profile.

```typescript
export async function trackEvent(
	email: string,
	eventName: string,
	properties: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

	if (!apiKey) {
		return { ok: false, error: "Klaviyo not configured" };
	}

	const response = await fetch(`${KLAVIYO_BASE_URL}/events`, {
		method: "POST",
		headers: {
			Authorization: `Klaviyo-API-Key ${apiKey}`,
			"Content-Type": "application/json",
			Revision: KLAVIYO_REVISION,
		},
		body: JSON.stringify({
			data: {
				type: "event",
				attributes: {
					metric: {
						data: {
							type: "metric",
							attributes: {
								name: eventName,
							},
						},
					},
					profile: {
						data: {
							type: "profile",
							attributes: {
								email,
							},
						},
					},
					properties,
					time: new Date().toISOString(),
				},
			},
		}),
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		console.error(`[Klaviyo] Track event "${eventName}" failed: ${response.status} ${body}`);
		return { ok: false, error: `Klaviyo API error: ${response.status}` };
	}

	return { ok: true };
}
```

### Rate Limits

Klaviyo API rate limits:

| Key Type | Burst | Steady  |
| -------- | ----- | ------- |
| Private  | 75/s  | 700/min |
| Public   | 100/s | 700/min |

For our use case (newsletter signups), we'll never approach these limits. No client-side rate limiting needed beyond the `/api/newsletter` route's IP-based limiter.

### Error Logging

All Klaviyo API errors should be logged with:

- Endpoint called
- HTTP status code
- Response body (truncated to 500 chars)
- Email (hashed or redacted in production logs)

### Type Definitions

```typescript
export interface KlaviyoSubscribeResult {
  ok: true;
} | {
  ok: false;
  error: string;
}

export interface KlaviyoProfileCheck {
  subscribed: boolean;
} | {
  error: string;
}
```

---

## Part C: Klaviyo Email Template Notes

### Dynamic Properties in Templates

In Klaviyo's email template editor, reference profile properties using:

| Property              | Template Syntax                                | Example Output    |
| --------------------- | ---------------------------------------------- | ----------------- |
| Welcome discount code | `{{ person\|lookup:'welcome_discount_code' }}` | `WELCOME-A3F8K2`  |
| Signup source         | `{{ person\|lookup:'signup_source' }}`         | `popup`           |
| First name            | `{{ first_name\|default:"there" }}`            | `John` or `there` |

### Conditional Content

To handle missing discount codes:

```django
{% if person|lookup:'welcome_discount_code' %}
  Your code: {{ person|lookup:'welcome_discount_code' }}
{% else %}
  Contact support@infinitybiolabs.com for your discount.
{% endif %}
```

### Auto-Apply Discount Link

Since Saleor doesn't support URL-based discount auto-application (unlike Shopify's `/discount/CODE` pattern), the email should instruct users to:

1. Copy the code
2. Apply it at checkout

Format in email:

```
Use code {{ person|lookup:'welcome_discount_code' }} at checkout.
```

A future enhancement could add a query parameter to the storefront URL (`?voucher=CODE`) that pre-fills the checkout voucher field.

---

## Checklist: Klaviyo Setup

- [ ] Create Klaviyo account
- [ ] Generate private API key with required scopes
- [ ] Note the public API key (Site ID / Company ID)
- [ ] Create "Newsletter - Welcome" list (single opt-in)
- [ ] Note the list ID
- [ ] Create Welcome Series flow (3 emails with delays)
- [ ] Test flow with a test email
- [ ] Set env vars: `KLAVIYO_PRIVATE_API_KEY`, `KLAVIYO_WELCOME_LIST_ID`, `NEXT_PUBLIC_KLAVIYO_COMPANY_ID`
- [ ] Implement `src/lib/klaviyo.ts`
