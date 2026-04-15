# Spec 02 — Newsletter API Route

## File

`src/app/api/newsletter/route.ts`

## Summary

Server-side API route that handles newsletter signup. Receives an email, creates a unique Saleor voucher, subscribes the profile to a Klaviyo list with the voucher code as a custom property, and returns the code to the frontend.

## Endpoint

```
POST /api/newsletter
Content-Type: application/json

Request Body:
{
  "email": "user@example.com"
}

Success Response (200):
{
  "success": true,
  "code": "WELCOME-A3F8K2"
}

Error Responses:
- 400: { "error": "A valid email address is required" }
- 409: { "error": "This email is already subscribed" }
- 429: { "error": "Too many attempts. Please try again later." }
- 500: { "error": "Something went wrong. Please try again." }
- 503: { "error": "Newsletter signup is temporarily unavailable." }
```

## Implementation Steps (in order)

### Step 1: Rate Limiting

Reuse the pattern from `src/app/api/contact/route.ts`:

```typescript
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3; // Max 3 newsletter signups per window per IP

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
```

Note: Stricter than contact form (3 vs 5) since newsletter signup is more abusable.

### Step 2: Input Validation

- `email` must be a string
- Must match basic email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Trim and lowercase the email
- Max length: 254 characters (RFC 5321)

### Step 3: Check Klaviyo for Existing Subscription

Before creating a voucher, check if the email is already subscribed to the welcome list:

```
GET https://a.klaviyo.com/api/profiles/
?filter=equals(email,"{email}")

Headers:
  Authorization: Klaviyo-API-Key {KLAVIYO_PRIVATE_API_KEY}
  Content-Type: application/json
  Revision: 2024-10-15
```

If the profile exists AND is already in the welcome list, return 409.

**Implementation note:** This is a soft check. If it fails (Klaviyo API error), proceed with subscription anyway — Klaviyo handles duplicates gracefully.

### Step 4: Generate Unique Voucher Code

Format: `WELCOME-{6 random alphanumeric chars}`

```typescript
function generateVoucherCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
	let code = "WELCOME-";
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}
```

### Step 5: Create Saleor Voucher

Use `executeRawGraphQL` from `src/lib/graphql.ts` with the Saleor staff/app token.

GraphQL Mutation:

```graphql
mutation CreateWelcomeVoucher($input: VoucherInput!) {
	voucherCreate(input: $input) {
		errors {
			field
			message
			code
		}
		voucher {
			id
			codes(first: 1) {
				edges {
					node {
						code
					}
				}
			}
		}
	}
}
```

Variables:

```json
{
	"input": {
		"name": "Welcome 10% - user@example.com",
		"type": "ENTIRE_ORDER",
		"discountValueType": "PERCENTAGE",
		"addCodes": ["WELCOME-A3F8K2"],
		"applyOncePerCustomer": true,
		"applyOncePerOrder": true,
		"singleUse": true,
		"usageLimit": 1,
		"startDate": "2026-04-03T00:00:00Z",
		"endDate": "2026-07-03T00:00:00Z"
	}
}
```

**Important parameters:**

| Parameter              | Value                | Reason                                                    |
| ---------------------- | -------------------- | --------------------------------------------------------- |
| `type`                 | `ENTIRE_ORDER`       | Discount applies to entire order                          |
| `discountValueType`    | `PERCENTAGE`         | 10% off                                                   |
| `addCodes`             | `["WELCOME-XXXXXX"]` | Saleor 3.18+ uses `addCodes` instead of deprecated `code` |
| `singleUse`            | `true`               | Code can only be used once                                |
| `usageLimit`           | `1`                  | Total uses across all customers = 1                       |
| `applyOncePerCustomer` | `true`               | One use per customer                                      |
| `endDate`              | +90 days from now    | Code expires after 3 months                               |

**Authentication:** The mutation requires `MANAGE_DISCOUNTS` permission. Send with the `Authorization: Bearer {SALEOR_ADMIN_TOKEN}` header.

```typescript
const result = await executeRawGraphQL({
	query: VOUCHER_CREATE_MUTATION,
	variables: { input },
	headers: {
		Authorization: `Bearer ${process.env.SALEOR_ADMIN_TOKEN}`,
	},
});
```

**After the voucher channel listing update:**

After creating the voucher, we need to set the discount value per channel using `voucherChannelListingUpdate`:

```graphql
mutation VoucherChannelListingUpdate($id: ID!, $input: VoucherChannelListingInput!) {
	voucherChannelListingUpdate(id: $id, input: $input) {
		errors {
			field
			message
			code
		}
	}
}
```

Variables:

```json
{
	"id": "{voucher_id from step above}",
	"input": {
		"addChannels": [
			{
				"channelId": "{SALEOR_CHANNEL_ID}",
				"discountValue": 10
			}
		]
	}
}
```

**Note:** The channel ID must be resolved from the channel slug. This can be hardcoded or fetched once at startup. See [06-env-config.md](./06-env-config.md) for the `SALEOR_CHANNEL_ID` env var.

### Step 6: Subscribe to Klaviyo List

```
POST https://a.klaviyo.com/api/lists/{KLAVIYO_WELCOME_LIST_ID}/subscribe

Headers:
  Authorization: Klaviyo-API-Key {KLAVIYO_PRIVATE_API_KEY}
  Content-Type: application/json
  Revision: 2024-10-15

Body:
{
  "data": [
    {
      "type": "profile",
      "attributes": {
        "email": "user@example.com",
        "properties": {
          "welcome_discount_code": "WELCOME-A3F8K2",
          "signup_source": "popup",
          "signup_date": "2026-04-03T12:00:00Z"
        }
      }
    }
  ]
}
```

### Step 7: Return Response

On success: `{ success: true, code: "WELCOME-A3F8K2" }`

## Error Handling

| Step                                | Failure Mode            | Response                                                                                           |
| ----------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| Rate limit exceeded                 | IP over limit           | 429                                                                                                |
| Invalid email                       | Validation fails        | 400                                                                                                |
| Already subscribed                  | Klaviyo duplicate check | 409                                                                                                |
| Saleor voucher creation fails       | GraphQL error           | 500, log error                                                                                     |
| Saleor channel listing update fails | GraphQL error           | 500, log error (voucher exists but has no value — needs cleanup)                                   |
| Klaviyo subscribe fails             | API error               | 500, log error (voucher exists in Saleor but user isn't subscribed — orphaned voucher, acceptable) |
| Missing env vars                    | Startup check           | 503                                                                                                |

### Partial Failure Strategy

The operations are **not transactional**. If Saleor voucher creation succeeds but Klaviyo subscribe fails:

- The voucher exists in Saleor (harmless — unused, single-use, will expire)
- The user doesn't get the email (they see the code in the popup success state)
- Log the error for manual investigation
- Still return 200 with the code (user can use it even without the email)

If Klaviyo subscribe succeeds but Saleor voucher failed:

- Return 500 — user doesn't get a code
- The Klaviyo profile exists but has no `welcome_discount_code` property
- The welcome flow in Klaviyo should have a conditional: if `welcome_discount_code` is empty, show a fallback message ("Contact us for your welcome discount")

## Code Structure

```typescript
import { NextRequest, NextResponse } from "next/server";
import { subscribeToKlaviyo, isAlreadySubscribed } from "@/lib/klaviyo";
import { createWelcomeVoucher } from "@/lib/saleor-admin";

// Rate limiting (same pattern as /api/contact)
// ...

export async function POST(request: NextRequest) {
	// 1. Rate limit
	// 2. Parse & validate email
	// 3. Check environment variables
	// 4. Check if already subscribed (soft check)
	// 5. Generate voucher code
	// 6. Create Saleor voucher
	// 7. Subscribe to Klaviyo with voucher code as property
	// 8. Return success with code
}
```

## Dependencies

- `src/lib/klaviyo.ts` — Klaviyo API client (see [03-klaviyo-setup.md](./03-klaviyo-setup.md))
- `src/lib/saleor-admin.ts` — Saleor admin mutations (see [04-saleor-voucher.md](./04-saleor-voucher.md))
- `src/lib/graphql.ts` — existing `executeRawGraphQL` function

## Testing Notes

- Test with valid email → should return 200 + code
- Test with invalid email → should return 400
- Test rate limit: 4th request within 15min → should return 429
- Test with Saleor down → should return 500
- Test with Klaviyo down → should still return 200 (partial success, user gets code from popup)
- Verify voucher appears in Saleor Dashboard under Discounts
- Verify profile appears in Klaviyo under the welcome list
- Verify the `welcome_discount_code` property is set on the Klaviyo profile
