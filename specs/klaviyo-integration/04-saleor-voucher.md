# Spec 04 — Saleor Voucher Generation

## Summary

Server-side module for creating unique single-use vouchers in Saleor via GraphQL. These vouchers are created on-the-fly when a user signs up through the newsletter popup.

## File

`src/lib/saleor-admin.ts`

## Authentication

Voucher creation requires the `MANAGE_DISCOUNTS` permission. This is a **staff-level** or **app-level** operation — it cannot be done with anonymous or customer-authenticated requests.

### Option A: Staff Token (Simpler)

Create a Saleor staff account specifically for the storefront backend:

1. In Saleor Dashboard, go to **Configuration > Staff Members > Add Staff**
2. Create a user (e.g., `storefront-bot@infinitybiolabs.com`)
3. Assign permissions: `MANAGE_DISCOUNTS` only (principle of least privilege)
4. Generate a token via the `tokenCreate` mutation or use the Dashboard to get a JWT

**Problem:** Staff JWTs expire. You'd need token refresh logic.

### Option B: App Token (Recommended)

Create a Saleor App with the required permissions:

1. In Saleor Dashboard, go to **Apps > Create App** (or via CLI)
2. Name: `Storefront Newsletter`
3. Permissions: `MANAGE_DISCOUNTS`
4. Generate an auth token — this is a **permanent token** (no expiry)

The token goes into `SALEOR_ADMIN_TOKEN` env var.

**This is the recommended approach.** App tokens don't expire and have scoped permissions.

## GraphQL Mutations

### Mutation 1: Create Voucher

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

### Mutation 2: Set Channel Discount Value

The `voucherCreate` mutation creates the voucher but **does not set the discount value per channel**. That requires a separate mutation:

```graphql
mutation VoucherSetChannelListing($id: ID!, $input: VoucherChannelListingInput!) {
	voucherChannelListingUpdate(id: $id, input: $input) {
		errors {
			field
			message
			code
		}
		voucher {
			id
			channelListings {
				channel {
					slug
				}
				discountValue
			}
		}
	}
}
```

**Why two mutations?** Saleor's `VoucherInput` type does not include `channelListings`. The discount value (10%) must be set per-channel via the separate `voucherChannelListingUpdate` mutation. This is a known Saleor API design pattern.

## Implementation

```typescript
import { executeRawGraphQL } from "@/lib/graphql";

// ── Constants ──────────────────────────────────────────────────

const VOUCHER_EXPIRY_DAYS = 90;
const DISCOUNT_PERCENTAGE = 10;
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1
const CODE_LENGTH = 6;
const CODE_PREFIX = "WELCOME-";

// ── Types ──────────────────────────────────────────────────────

interface VoucherCreateResult {
	ok: true;
	voucherId: string;
	code: string;
}

interface VoucherCreateError {
	ok: false;
	error: string;
}

type CreateVoucherResult = VoucherCreateResult | VoucherCreateError;

// ── Public API ─────────────────────────────────────────────────

/**
 * Creates a unique single-use welcome voucher for a newsletter subscriber.
 *
 * Performs two Saleor mutations:
 * 1. voucherCreate — creates the voucher with code and usage rules
 * 2. voucherChannelListingUpdate — sets the 10% discount value for the channel
 *
 * @param email - Subscriber email (used in voucher name for tracking)
 * @returns The voucher code on success, or an error message on failure
 */
export async function createWelcomeVoucher(email: string): Promise<CreateVoucherResult> {
	const adminToken = process.env.SALEOR_ADMIN_TOKEN;
	const channelId = process.env.SALEOR_CHANNEL_ID;

	if (!adminToken || !channelId) {
		return { ok: false, error: "Saleor admin not configured" };
	}

	const code = generateVoucherCode();
	const now = new Date();
	const endDate = new Date(now.getTime() + VOUCHER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

	// Step 1: Create the voucher
	const createResult = await executeRawGraphQL<{
		voucherCreate: {
			errors: Array<{ field: string | null; message: string; code: string | null }>;
			voucher: { id: string; codes: { edges: Array<{ node: { code: string } }> } } | null;
		};
	}>({
		query: VOUCHER_CREATE_MUTATION,
		variables: {
			input: {
				name: `Welcome 10% — ${email}`,
				type: "ENTIRE_ORDER",
				discountValueType: "PERCENTAGE",
				addCodes: [code],
				applyOncePerCustomer: true,
				applyOncePerOrder: true,
				singleUse: true,
				usageLimit: 1,
				startDate: now.toISOString(),
				endDate: endDate.toISOString(),
			},
		},
		headers: {
			Authorization: `Bearer ${adminToken}`,
		},
	});

	if (!createResult.ok) {
		console.error("[Saleor] Voucher creation failed:", createResult.error.message);
		return { ok: false, error: createResult.error.message };
	}

	const { voucherCreate } = createResult.data;

	if (voucherCreate.errors.length > 0) {
		const errorMsg = voucherCreate.errors.map((e) => e.message).join(", ");
		console.error("[Saleor] Voucher creation validation error:", errorMsg);
		return { ok: false, error: errorMsg };
	}

	if (!voucherCreate.voucher) {
		return { ok: false, error: "Voucher created but no data returned" };
	}

	const voucherId = voucherCreate.voucher.id;

	// Step 2: Set discount value for the channel
	const listingResult = await executeRawGraphQL<{
		voucherChannelListingUpdate: {
			errors: Array<{ field: string | null; message: string; code: string | null }>;
		};
	}>({
		query: VOUCHER_CHANNEL_LISTING_MUTATION,
		variables: {
			id: voucherId,
			input: {
				addChannels: [
					{
						channelId,
						discountValue: DISCOUNT_PERCENTAGE,
					},
				],
			},
		},
		headers: {
			Authorization: `Bearer ${adminToken}`,
		},
	});

	if (!listingResult.ok) {
		console.error("[Saleor] Channel listing update failed:", listingResult.error.message);
		// Voucher exists but has no discount value — it won't work at checkout
		// This is a critical failure
		return { ok: false, error: "Failed to set discount value" };
	}

	const { voucherChannelListingUpdate } = listingResult.data;

	if (voucherChannelListingUpdate.errors.length > 0) {
		const errorMsg = voucherChannelListingUpdate.errors.map((e) => e.message).join(", ");
		console.error("[Saleor] Channel listing validation error:", errorMsg);
		return { ok: false, error: errorMsg };
	}

	return { ok: true, voucherId, code };
}

// ── Helpers ────────────────────────────────────────────────────

function generateVoucherCode(): string {
	let code = CODE_PREFIX;
	for (let i = 0; i < CODE_LENGTH; i++) {
		code += CODE_CHARSET[Math.floor(Math.random() * CODE_CHARSET.length)];
	}
	return code;
}

// ── GraphQL Strings ────────────────────────────────────────────

const VOUCHER_CREATE_MUTATION = `
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
`;

const VOUCHER_CHANNEL_LISTING_MUTATION = `
  mutation VoucherSetChannelListing($id: ID!, $input: VoucherChannelListingInput!) {
    voucherChannelListingUpdate(id: $id, input: $input) {
      errors {
        field
        message
        code
      }
      voucher {
        id
        channelListings {
          channel {
            slug
          }
          discountValue
        }
      }
    }
  }
`;
```

## Saleor Dashboard Setup (One-Time)

### Create the App Token

1. Go to **Saleor Dashboard > Apps**
2. Click **Create App** (or **Install third-party app** depending on Saleor version)
3. For a custom/local app:
   - Name: `Storefront Newsletter`
   - Permissions: check `MANAGE_DISCOUNTS`
4. After creation, go to the app's settings and generate an **auth token**
5. Copy the token — it's shown only once
6. Set it as `SALEOR_ADMIN_TOKEN` in your environment

### Get the Channel ID

The channel ID is needed for the `voucherChannelListingUpdate` mutation. To find it:

**Option A: Saleor Dashboard**
Navigate to Configuration > Channels, open your channel, the ID is in the URL.

**Option B: GraphQL**

```graphql
query {
	channels {
		id
		slug
		name
	}
}
```

Set the ID as `SALEOR_CHANNEL_ID` in your environment.

## Voucher Lifecycle

```
Newsletter signup
  ↓
voucherCreate (code: WELCOME-A3F8K2, singleUse: true, usageLimit: 1, expires: +90d)
  ↓
voucherChannelListingUpdate (10% percentage discount for channel)
  ↓
Customer receives code via popup + email
  ↓
Customer applies code at checkout
  ↓
Saleor validates: single-use, not expired, not already used
  ↓
10% discount applied to order
  ↓
Voucher marked as used (cannot be reused)
```

## Edge Cases

| Case                                               | Handling                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Code collision (unlikely with 6-char alphanumeric) | Saleor will return an error. Retry with a new code (max 3 attempts).                         |
| Channel doesn't exist                              | `voucherChannelListingUpdate` returns error. Log and return 500.                             |
| App token lacks permissions                        | GraphQL returns permission error. Log and return 503.                                        |
| Saleor API is down                                 | `executeRawGraphQL` returns network error. Return 500.                                       |
| Voucher created but channel listing fails          | Orphaned voucher with no discount value. Harmless — won't work at checkout. Log for cleanup. |

## Code Collision Retry Logic

```typescript
async function createVoucherWithRetry(email: string, maxAttempts = 3): Promise<CreateVoucherResult> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const result = await createWelcomeVoucher(email);
		if (result.ok) return result;

		// Check if the error is a code collision
		const isCollision =
			result.error.toLowerCase().includes("code") && result.error.toLowerCase().includes("unique");
		if (!isCollision) return result; // Non-collision error, don't retry
	}
	return { ok: false, error: "Failed to generate unique voucher code after multiple attempts" };
}
```

## Monitoring

Track in application logs:

- Total vouchers created per day
- Failed voucher creation attempts
- Orphaned vouchers (created but channel listing failed)

A periodic cleanup job (manual or cron) should check for vouchers with:

- Empty channel listings
- Zero usage and past expiry date
