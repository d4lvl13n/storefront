# Storefront — InfinityBio Labs

## Project Overview

E-commerce storefront for InfinityBio Labs, a biotech/peptide research supplier. Built on Saleor (headless commerce) with a Next.js frontend.

**Brand**: InfinityBio Labs — pharmaceutical-grade research peptides
**Theme**: Full dark design (emerald/teal accents on near-black backgrounds)

## Tech Stack

- **Framework**: Next.js 16 (App Router) with Turbopack
- **Backend**: Saleor GraphQL (headless commerce)
- **Styling**: Tailwind CSS with OKLCH CSS variables (`src/styles/brand.css`)
- **Fonts**: Geist Sans / Geist Mono (via Next.js font system)
- **Language**: TypeScript
- **Package manager**: pnpm
- **GraphQL codegen**: auto-runs via `predev`/`prebuild` scripts

## Commands

```bash
pnpm dev              # Start dev server (webpack mode, runs codegen first)
pnpm dev:turbopack    # Start dev server (turbopack mode)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm test             # Vitest
pnpm generate:all     # Regenerate GraphQL types
```

To start dev server directly (skip codegen): `npx next dev --turbopack`

## Key Directories

```
src/
  app/[channel]/(main)/     # Main storefront pages (layout, page, homepage-faq)
  app/globals.css            # Global CSS (header transparency rules, utilities)
  styles/brand.css           # Design tokens (OKLCH colors, light/dark themes)
  ui/components/             # Shared components (header, footer, cart, nav)
  ui/atoms/                  # Atomic components (links, image wrappers)
  lib/                       # Utilities, GraphQL client
  gql/                       # Auto-generated GraphQL types (DO NOT EDIT)
```

## Critical Gotchas

### OKLCH + Tailwind opacity modifiers DO NOT WORK

`bg-background/95` generates invalid CSS when `--background` is an OKLCH value. Use inline `style={{ backgroundColor: "var(--background)" }}` or explicit colors instead.

### Turbopack cache causes hydration mismatches

If server and client render different HTML after code changes, clear `.next` and restart:

```bash
rm -rf .next && npx next dev --turbopack
```

### Header transparency system

- `ScrollHeader` (`src/ui/components/scroll-header.tsx`): Client component that makes the header transparent on the homepage at scroll top, solid when scrolled
- Uses `data-transparent` HTML attribute to trigger CSS color inversion rules in `globals.css`
- Hero section has `-mt-16 pt-16` to extend behind the sticky header
- `suppressHydrationWarning` is intentional (client-only state difference)

### Next.js 16 caching

Uses `"use cache"` directive with `cacheLife()` and `cacheTag()` — NOT the old `revalidate` export pattern.

## Design System

- **All homepage sections are dark** (`bg-foreground text-white`)
- Dark cards: `bg-neutral-900/60 border-neutral-800`
- Text hierarchy: `text-white` > `text-neutral-200` > `text-neutral-400` > `text-neutral-500`
- Accent: `text-emerald-400`, `bg-emerald-500`
- Section labels: `text-sm font-medium uppercase tracking-[0.25em] text-emerald-400`
- Section padding: `py-24 sm:py-32`
- Headings: `text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl`
- Custom utilities in globals.css: `.noise-overlay`, `.glow-emerald`, `.card-lift`
- Logo size: `h-9` in header

## Homepage Sections (in order)

1. Hero (dark, gradient orbs, hero image, `-mt-16` overlap)
2. Trust Bar (dark marquee)
3. Stats Banner (dark, 4-col grid)
4. Shop by Goal (dark, collection grid with glow-emerald hover)
5. Featured Products (dark, product cards)
6. Science & Quality (dark, COA card + quality pillars)
7. Best Sellers (dark, product cards)
8. Testimonials (dark, 3-col cards)
9. FAQ (dark, accordion — `homepage-faq.tsx`)
10. Newsletter (dark, gradient border card)

## Affiliate System

**Not a Saleor app** — built into this storefront. Saleor only ever sees ordinary vouchers; all affiliate semantics (applications, commission rates, payout status) live in **Neon Postgres** (Vercel↔Neon integration, `DATABASE_URL`). Full spec: `docs/affiliate-system.md`.

### Customer flow

```
?ref=CODE on any URL
  → middleware sanitizes + UPPERCASES code, sets `affiliate_code` cookie (30d), 307s to clean URL
  → useAffiliateCode hook auto-applies the code at checkout (checkoutAddPromoCode; never overrides a manual voucher)
  → Saleor applies the voucher discount
  → ORDER_PAID webhook (HMAC) → mirrors the order to Klaviyo + records commission in Neon
    (order_total × commission_rate; skipped when buyer email == affiliate email — no self-referral)
  → ORDER_REFUNDED / ORDER_FULLY_REFUNDED / ORDER_CANCELLED (same endpoint) → commission marked `reversed`
```

### Operator flow

1. Visitor applies at `/affiliate` → row in Neon + **ops alert email** + applicant confirmation (Resend)
2. Operator opens **`/[channel]/affiliate/admin`** (operator console) → approves with code + commission % + customer discount %
3. Approval creates the affiliate in Neon and emails them their code + `?ref=` link. Voucher minting is **best-effort**: if `SALEOR_APP_TOKEN` is configured and the mint succeeds, the Saleor voucher (ENTIRE_ORDER percentage, channel-listed, `applyOncePerCustomer`) is created automatically; if the token is absent or the mint fails, **approval still completes** and an amber banner tells the operator to create the voucher manually in the Saleor Dashboard (`{discount}%` off entire order, this channel, apply once per customer). Approval is never blocked on Saleor.
4. Commissions appear on paid orders → operator marks approved → paid (actual payment is off-platform). Refunded/cancelled orders auto-reverse to status `reversed` (excluded from payout; approve/pay actions hidden in the console)

### Console auth

Operators log in with their **normal storefront (Saleor) account**; access requires their email in `AFFILIATE_ADMIN_EMAILS` (comma-separated, fail-closed). Anonymous → login redirect; non-whitelisted → 404. Server actions re-verify the whitelist on every submit. A Bearer-token API (`/api/affiliate/admin`, `AFFILIATE_ADMIN_SECRET`) remains for scripts — note it does NOT mint vouchers.

### Key files

| File                                           | Responsibility                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `src/middleware.ts` (§3)                       | `?ref=` capture → uppercase cookie + clean-URL redirect                  |
| `src/checkout/hooks/use-affiliate-code.ts`     | Auto-apply cookie code at checkout                                       |
| `src/lib/affiliate/db.ts`                      | Neon storage (affiliates / commissions / applications)                   |
| `src/lib/affiliate/notify.ts`                  | Resend emails (ops alert, confirmation, approval, rejection) — fail-soft |
| `src/lib/affiliate/saleor-voucher.ts`          | Voucher minting (rollback on partial failure; duplicate code = reuse)    |
| `src/lib/affiliate/admin-auth.ts`              | Email-whitelist gate for the console                                     |
| `src/app/[channel]/(main)/affiliate/`          | Public landing + application form; `admin/` = operator console           |
| `src/app/api/affiliate/{apply,webhook,admin}/` | Public apply, order webhook (paid + refund/cancel), Bearer API           |
| `src/lib/analytics/klaviyo-server.ts`          | Server-side Klaviyo "Placed Order" mirror, called from the webhook       |
| `src/lib/rate-limit.ts`                        | Shared durable (Neon) rate limiter used by apply + other public routes   |

### Env vars (Vercel)

| Var                       | Purpose                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Neon Postgres (injected by the Vercel↔Neon integration)                                        |
| `RESEND_API_KEY`          | Email notifications (shared with contact form)                                                  |
| `AFFILIATE_NOTIFY_EMAIL`  | Ops alert recipient (falls back to `CONTACT_EMAIL`, then support@)                              |
| `AFFILIATE_ADMIN_EMAILS`  | Console whitelist (must match Saleor account emails)                                            |
| `AFFILIATE_ADMIN_SECRET`  | Bearer token for the script API (optional)                                                      |
| `SALEOR_WEBHOOK_SECRET`   | HMAC for the affiliate webhook (ORDER_PAID + ORDER_REFUNDED/FULLY_REFUNDED/CANCELLED)           |
| `SALEOR_APP_TOKEN`        | App 1 token (MANAGE_DISCOUNTS for minting + MANAGE_ORDERS for track-order & Klaviyo line fetch) |
| `SALEOR_CHANNEL_ID`       | Optional channel GID fast-path (else resolved from slug)                                        |
| `KLAVIYO_PRIVATE_API_KEY` | Server-side Klaviyo key for the webhook's "Placed Order" mirror (fail-soft when unset)          |

### Affiliate gotchas

- **Codes are canonical UPPERCASE everywhere** — Saleor's checkout promo match is case-sensitive. Approval uppercases the code; the middleware uppercases the `?ref=` capture. Don't introduce lowercase codes anywhere.
- **Commission ≠ discount.** `commission_rate` (Neon, what the affiliate earns, used by the webhook) and the voucher's `discountValue` (what the customer saves) are independent numbers set separately at approval.
- **`?ref=` is reserved** by the middleware for affiliate capture (it strips the param with a redirect and sets a cookie). Never use a `ref` query param for anything else — use `via=` etc.
- **Voucher minting is best-effort, but the mint itself is atomic**: when minting is attempted and channel listing fails after `voucherCreate`, the orphan voucher is deleted — but the approval no longer aborts. With no token / a failed mint, the affiliate is still created (with a null `voucher_id`) and the operator is told to make the voucher by hand. Because the affiliate now exists after the first approve, re-approving the same code is blocked ("code already in use") — provision the voucher manually instead of re-approving.
- **Webhook is race-proof**: commissions insert with `ON CONFLICT (order_id) DO NOTHING`; duplicate/concurrent Saleor retries return 2xx skips, never double-credit.
- The webhook accepts `Saleor-Signature` and the deprecated `X-Saleor-Signature` (HMAC-SHA256 hex of the raw body).
- **One endpoint, many events**: the webhook dispatches on the `Saleor-Event` header. Register ORDER_PAID **and** ORDER_REFUNDED / ORDER_FULLY_REFUNDED / ORDER_CANCELLED at `/api/affiliate/webhook`, and make the subscription select `order { userEmail }` (needed for the self-referral guard and the Klaviyo mirror). A missing event header is treated as ORDER_PAID for back-compat.
- **No self-referral**: a commission is skipped when `order.userEmail` matches the affiliate's email (case-insensitive).
- **Refunds reverse, never delete**: refund/cancel events set the commission to `reversed` (idempotent, wins over `paid` to flag clawback); reversed rows are excluded from the payout totals and lose their console approve/pay actions.

## Infrastructure & Deployment

### Architecture

The **storefront** (this repo) is deployed on **Vercel** — production is
`https://www.infinitybiolabs.com`, auto-built and deployed on push to `main` via
the Vercel Git integration, with Neon Postgres attached through the Vercel↔Neon
integration. It is NOT the Hetzner container described below (that path is legacy).

The Saleor **backend** (API, worker, DB, cache) and the **dashboard** run on a
single Hetzner VPS (`46.224.112.183`):

| Service       | Image                                            | Port | Repo                               |
| ------------- | ------------------------------------------------ | ---- | ---------------------------------- |
| Dashboard     | `infinitybio-dashboard:latest` (built on server) | 9000 | `d4lvl13n/saleor-dashboard` (fork) |
| Saleor API    | `ghcr.io/saleor/saleor:3.22`                     | 8000 | Official image                     |
| Celery Worker | `ghcr.io/saleor/saleor:3.22`                     | —    | Official image                     |
| Postgres      | `postgres:15-alpine`                             | —    | Official image                     |
| Valkey/Redis  | `valkey:8.1-alpine`                              | —    | Official image                     |

### Repos

| Repo                        | Purpose                                           | CI/CD                                                  |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `d4lvl13n/storefront`       | Next.js storefront (this repo)                    | Push to `main` → Vercel auto-build & deploy            |
| `d4lvl13n/saleor-platform`  | Infra: docker-compose, nginx, scripts, env config | Push → SSH to Hetzner → pull images → restart services |
| `d4lvl13n/saleor-dashboard` | Saleor Dashboard fork (admin UI)                  | Push → SSH to Hetzner → build Docker image → restart   |

### Infra Repo (`saleor-platform`) Key Files

```
docker-compose.yml          # Local dev (all services, Jaeger, Mailpit)
docker-compose.prod.yml     # Production (API, worker, DB, cache + profiles for frontend)
backend.prod.env            # Prod secrets (gitignored, written from GitHub Secrets)
common.prod.env             # Prod common config (gitignored)
.env.prod                   # Prod env vars for compose (gitignored)
nginx/                      # Reverse proxy config (for when domains are added)
scripts/backup-db.sh        # Postgres backup (14-day retention)
scripts/deploy.sh           # Manual deploy helper
scripts/init-ssl.sh         # First-time Let's Encrypt cert setup
.github/workflows/deploy.yml  # Auto-deploy on push
```

### CI/CD Flow

**Storefront push (current — Vercel):**

1. Push to `main` triggers a Vercel build & deploy via the Git integration
2. `next build` runs on Vercel; env vars come from the Vercel project settings
3. Promoted to production at `https://www.infinitybiolabs.com`

> Legacy (Hetzner Docker) flow, kept for reference / self-hosting: GitHub Actions
> SSHs into Hetzner, pulls to `/opt/storefront`, builds the image with
> `--network=host` (so `next build` can reach the Saleor API on localhost:8000),
> and restarts via `docker compose --profile frontend up -d`. The Build Gotchas
> below describe that Dockerfile and do not apply to the Vercel deploy.

**Infra push:**

1. GitHub Actions SSHs into Hetzner
2. Pulls latest code to `/opt/saleor`
3. Writes env files from GitHub Secrets
4. Pulls remote images (Saleor API, Postgres, etc.) and restarts

### Docker Compose Profiles

Backend services (api, worker, db, cache) run by default. Storefront and dashboard use the `frontend` profile since their images are built locally:

```bash
# Backend only (default deploy)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Include frontend services
docker compose -f docker-compose.prod.yml --profile frontend --env-file .env.prod up -d
```

### Build Gotchas

- **Generated GraphQL types must be committed** — `src/gql/` and `src/checkout/graphql/generated/` are checked in because codegen can't run during Docker build (needs live Saleor API)
- **Storefront Docker build uses `--network=host`** — so `next build` prerender can reach the Saleor API at `localhost:8000`
- **`NEXT_OUTPUT=standalone`** env var in Dockerfile enables standalone output mode
- **Dockerfile runs `npx next build` directly** (not `pnpm build`) to skip the `prebuild` codegen step

### GitHub Secrets

**`d4lvl13n/saleor-platform`**: `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY`, `GH_PAT`, `BACKEND_PROD_ENV`, `COMMON_PROD_ENV`, `DOT_ENV_PROD`

**`d4lvl13n/storefront`**: `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY`, `GH_PAT`

**`d4lvl13n/storefront` vars**: `NEXT_PUBLIC_SALEOR_API_URL`, `NEXT_PUBLIC_STOREFRONT_URL`, `NEXT_PUBLIC_DEFAULT_CHANNEL`

### Pending

- Domain names + nginx SSL (run `scripts/init-ssl.sh` after DNS is pointed)
- DB migration from local to production
- Postgres backup cron job on server
