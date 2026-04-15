# Spec 06 — Environment Variables & Secrets

## Summary

All environment variables required for the Klaviyo integration, where to get them, and how to configure them across environments.

## Variables

### Phase 1 (Email Capture + Welcome Flow)

| Variable                  | Type        | Required | Example              | Where to Get                                                                          |
| ------------------------- | ----------- | -------- | -------------------- | ------------------------------------------------------------------------------------- |
| `KLAVIYO_PRIVATE_API_KEY` | Server-only | Yes      | `pk_abc123def456...` | Klaviyo Dashboard > Account > Settings > API Keys > Create Private Key                |
| `KLAVIYO_WELCOME_LIST_ID` | Server-only | Yes      | `UbCdef`             | Klaviyo Dashboard > Audience > Lists > Newsletter - Welcome > List ID in URL          |
| `SALEOR_ADMIN_TOKEN`      | Server-only | Yes      | `eyJ0eXAi...`        | Saleor Dashboard > Apps > Storefront Newsletter > Auth Token                          |
| `SALEOR_CHANNEL_ID`       | Server-only | Yes      | `Q2hhbm5lbDox`       | Saleor Dashboard > Configuration > Channels > Channel ID in URL, or via GraphQL query |

### Phase 2 (Event Tracking + Abandoned Cart)

| Variable                         | Type            | Required | Example           | Where to Get                                                                 |
| -------------------------------- | --------------- | -------- | ----------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_KLAVIYO_COMPANY_ID` | Public (client) | Yes      | `XyZ123`          | Klaviyo Dashboard > Account > Settings > API Keys > Public API Key / Site ID |
| `SALEOR_WEBHOOK_SECRET`          | Server-only     | Yes      | `whsec_abc123...` | Saleor Dashboard > Apps > Webhooks > Secret Key                              |

### Already Configured (No Change Needed)

| Variable                      | Purpose                                                                  |
| ----------------------------- | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SALEOR_API_URL`  | Saleor GraphQL endpoint (used by `executeRawGraphQL`)                    |
| `NEXT_PUBLIC_STOREFRONT_URL`  | Storefront URL (used for webhook target URLs)                            |
| `NEXT_PUBLIC_DEFAULT_CHANNEL` | Channel slug (already exists, but we also need the channel ID)           |
| `RESEND_API_KEY`              | Resend API key (existing, used by contact form — not needed for Klaviyo) |

## `.env.example` Changes

Add to the existing `.env.example`:

```bash
# ── Klaviyo Email Marketing ──────────────────────────────────────
# Private API key (server-side only) — get from Klaviyo > Settings > API Keys
# KLAVIYO_PRIVATE_API_KEY=pk_xxxxxxxxxxxxxxxxxxxx

# Welcome list ID — get from Klaviyo > Audience > Lists > list URL
# KLAVIYO_WELCOME_LIST_ID=

# Public API key / Site ID (client-side, for klaviyo.js SDK) — Phase 2
# NEXT_PUBLIC_KLAVIYO_COMPANY_ID=

# ── Saleor Admin (for voucher creation) ──────────────────────────
# App token with MANAGE_DISCOUNTS permission
# Create via Saleor Dashboard > Apps > Create App
# SALEOR_ADMIN_TOKEN=

# Channel ID (not slug) — get from Saleor Dashboard > Channels or GraphQL
# SALEOR_CHANNEL_ID=

# Webhook secret for verifying Saleor webhook signatures — Phase 2
# SALEOR_WEBHOOK_SECRET=
```

## `.env.local` (Development)

```bash
# Klaviyo (use test/sandbox keys in development)
KLAVIYO_PRIVATE_API_KEY=pk_xxxxxxxx
KLAVIYO_WELCOME_LIST_ID=XxXxXx
NEXT_PUBLIC_KLAVIYO_COMPANY_ID=YyYyYy

# Saleor Admin
SALEOR_ADMIN_TOKEN=your-app-token-here
SALEOR_CHANNEL_ID=Q2hhbm5lbDox
```

## Production (GitHub Secrets)

Add to `d4lvl13n/storefront` repository secrets:

| Secret Name               | Notes                          |
| ------------------------- | ------------------------------ |
| `KLAVIYO_PRIVATE_API_KEY` | Production Klaviyo private key |
| `KLAVIYO_WELCOME_LIST_ID` | Production welcome list ID     |
| `SALEOR_ADMIN_TOKEN`      | Production Saleor app token    |
| `SALEOR_CHANNEL_ID`       | Production channel ID          |

Add to `d4lvl13n/storefront` repository **variables** (not secrets, since they're public):

| Variable Name                    | Notes                        |
| -------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_KLAVIYO_COMPANY_ID` | Klaviyo public key (Phase 2) |

### Docker Build

The Klaviyo variables are **runtime-only** (not needed at build time) except for `NEXT_PUBLIC_KLAVIYO_COMPANY_ID` which is inlined at build time by Next.js.

In `docker-compose.prod.yml` or the Dockerfile, pass environment variables:

```yaml
storefront:
  environment:
    - KLAVIYO_PRIVATE_API_KEY=${KLAVIYO_PRIVATE_API_KEY}
    - KLAVIYO_WELCOME_LIST_ID=${KLAVIYO_WELCOME_LIST_ID}
    - SALEOR_ADMIN_TOKEN=${SALEOR_ADMIN_TOKEN}
    - SALEOR_CHANNEL_ID=${SALEOR_CHANNEL_ID}
```

For `NEXT_PUBLIC_KLAVIYO_COMPANY_ID`, it must be available at **build time** (passed as build arg or in `.env.production`).

## Security Notes

- `KLAVIYO_PRIVATE_API_KEY` — **never expose to client**. Has read/write access to all Klaviyo data.
- `SALEOR_ADMIN_TOKEN` — **never expose to client**. Has `MANAGE_DISCOUNTS` permission, can create/modify vouchers.
- `SALEOR_WEBHOOK_SECRET` — **never expose to client**. Used to verify webhook authenticity.
- `NEXT_PUBLIC_KLAVIYO_COMPANY_ID` — safe for client exposure, it's the public site ID used by klaviyo.js.

All server-only variables must **not** have the `NEXT_PUBLIC_` prefix.

## Validation at Startup

The `/api/newsletter` route should check for required env vars and return 503 if missing:

```typescript
const REQUIRED_ENV = [
	"KLAVIYO_PRIVATE_API_KEY",
	"KLAVIYO_WELCOME_LIST_ID",
	"SALEOR_ADMIN_TOKEN",
	"SALEOR_CHANNEL_ID",
] as const;

function checkConfig(): string | null {
	for (const key of REQUIRED_ENV) {
		if (!process.env[key]) return key;
	}
	return null;
}

// In the POST handler:
const missingVar = checkConfig();
if (missingVar) {
	console.error(`[Newsletter] Missing env var: ${missingVar}`);
	return NextResponse.json({ error: "Newsletter signup is temporarily unavailable." }, { status: 503 });
}
```

## How to Get Each Value

### KLAVIYO_PRIVATE_API_KEY

1. Log into Klaviyo
2. Click your account name (bottom-left) > **Settings**
3. Go to **API Keys** tab
4. Click **Create Private API Key**
5. Name: `infinitybio-storefront`
6. Select scopes: `lists:read`, `lists:write`, `profiles:read`, `profiles:write`, `events:read`, `events:write`
7. Copy the key (starts with `pk_`)

### KLAVIYO_WELCOME_LIST_ID

1. In Klaviyo, go to **Audience > Lists & Segments**
2. Click on your "Newsletter - Welcome" list
3. The list ID is in the URL: `https://www.klaviyo.com/lists/LIST_ID/...`

### NEXT_PUBLIC_KLAVIYO_COMPANY_ID

1. In Klaviyo, go to **Settings > API Keys**
2. The public key is shown at the top (6-character alphanumeric code)
3. This is also your "Company ID" or "Site ID"

### SALEOR_ADMIN_TOKEN

1. In Saleor Dashboard, go to **Apps**
2. Click **Create Local App** (or **Install third-party app** if using webhooks)
3. Name: `Storefront Newsletter`
4. Permissions: check **Manage discounts**
5. Click **Create**
6. Go to the app's settings, click **Create Token**
7. Copy the token (shown only once)

### SALEOR_CHANNEL_ID

Option A — Dashboard:

1. Go to **Configuration > Channels**
2. Click your channel
3. The ID is in the URL (base64-encoded, e.g., `Q2hhbm5lbDox`)

Option B — GraphQL:

```graphql
query {
	channels {
		id
		slug
		name
	}
}
```

Run this in the Saleor GraphQL Playground.

### SALEOR_WEBHOOK_SECRET

1. In Saleor Dashboard, go to **Apps > Storefront Newsletter**
2. Under **Webhooks**, create or edit a webhook
3. The secret key is generated when the webhook is created
4. Copy it from the webhook configuration
