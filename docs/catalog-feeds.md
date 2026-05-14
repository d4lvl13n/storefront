# Catalog Feeds

The storefront exposes catalog feeds for Google Merchant Center and Klaviyo:

- `/api/feeds/google` - Google Merchant XML feed
- `/api/feeds/klaviyo` - Klaviyo custom catalog JSON feed
- `/api/feeds/diagnostics` - operational report with included/excluded counts and reasons

Saleor remains the source of truth. Feed-specific merchandising and compliance choices live in public Saleor metadata so the storefront product name and product page copy can stay unchanged.

## Environment

| Variable                     | Default                       | Purpose                                                                                                                     |
| ---------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `FEED_CHANNEL`               | `NEXT_PUBLIC_DEFAULT_CHANNEL` | Saleor channel slug to export.                                                                                              |
| `FEED_ITEM_ID_SOURCE`        | `variant_id`                  | Stable item ID source. Use `sku` only after SKU uniqueness is verified.                                                     |
| `FEED_BRAND_NAME`            | `InfinityBio`                 | Default brand value when no Saleor metadata override exists.                                                                |
| `NEXT_PUBLIC_STOREFRONT_URL` | `http://localhost:3000`       | Public storefront base URL used for product links. Must be production HTTPS before submitting feeds externally.             |
| `FEED_DIAGNOSTICS_TOKEN`     | _unset_                       | Required to access `/api/feeds/diagnostics`. When unset the route 404s. Generate with `openssl rand -hex 32`. Runtime-only. |
| `FEED_CACHE_TTL_MS`          | `900000` (15 min)             | In-process cache TTL shared by `/api/feeds/google` and `/api/feeds/klaviyo`. Single-flight guarded.                         |
| `FEED_STALE_TTL_MS`          | `3600000` (60 min)            | Window after `FEED_CACHE_TTL_MS` during which a stale catalog snapshot may be served if Saleor refresh fails.               |
| `FEED_GRAPHQL_TIMEOUT_MS`    | `15000`                       | Per-page Saleor GraphQL timeout. Hung requests abort after this.                                                            |
| `FEED_MAX_PAGES`             | `200`                         | Hard cap on paginated feed pages (`pageSize=100`). Defense against runaway catalogs.                                        |

## Saleor Metadata Contract

Set these keys on Product or ProductVariant public metadata. Variant metadata overrides Product metadata. Category metadata can provide `google_category_id` as a fallback.

| Key                     | Required                  | Feed        | Purpose                                                                                  |
| ----------------------- | ------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| `is_marketable_for_gmc` | Yes, for GMC inclusion    | Google      | Must be exactly enabled with `true`, `1`, `yes`, or `y`; otherwise the item is excluded. |
| `gmc_title`             | Yes, for GMC inclusion    | Google      | Google-safe title. Website product names are not used as a fallback.                     |
| `gmc_description`       | Yes, for GMC inclusion    | Google      | Google-safe description. Website descriptions are not used as a fallback.                |
| `gmc_product_type`      | Recommended               | Google      | Internal product taxonomy path. Falls back to category name.                             |
| `google_category_id`    | Recommended               | Google      | Google taxonomy ID. Can live on Product, ProductVariant, or Category metadata.           |
| `gmc_exclusion_reason`  | Recommended when excluded | Diagnostics | Staff-facing reason for keeping the item out of GMC.                                     |
| `klaviyo_title`         | Optional                  | Klaviyo     | Klaviyo-specific title. Falls back to website product name plus variant suffix.          |
| `brand`                 | Optional                  | Both        | Overrides `FEED_BRAND_NAME`.                                                             |

## Safety Rules

- Google Merchant export fails closed. Nothing is included unless `is_marketable_for_gmc=true`.
- GMC requires explicit `gmc_title` and `gmc_description` so regulated catalog copy is reviewed before export.
- Klaviyo does not use the GMC eligibility gate, but items still need the required catalog fields.
- The same item ID must be used later in Klaviyo event payloads as `ProductID`.
- `FEED_ITEM_ID_SOURCE=variant_id` is the safest default. Do not switch to `sku` after launch unless every SKU is stable and the migration impact is accepted.
- Image links must be HTTPS on a public host for both Google and Klaviyo. Localhost, private RFC1918 ranges, link-local, multicast, and bare IPv6 are rejected — this prevents an accidental Saleor media URL from publishing internal hostnames to crawlers.
- `/api/feeds/diagnostics` is fail-closed. Without `FEED_DIAGNOSTICS_TOKEN` set on the server it returns 404. Authenticate with `Authorization: Bearer <token>` (preferred) or `?token=<token>` (avoid in shared logs).
- The Google and Klaviyo feeds are cached in-process per `FEED_CACHE_TTL_MS`. Concurrent requests during a refresh share a single Saleor fetch (single-flight). Saleor failures fall back to the last good snapshot for up to `FEED_STALE_TTL_MS`.

## Pre-Submission Checklist

1. Populate and review Saleor metadata for products intended for GMC.
2. Set `FEED_DIAGNOSTICS_TOKEN` on the server (`openssl rand -hex 32`). Confirm `/api/feeds/diagnostics` returns 404 without a token and JSON with it.
3. `curl -H "Authorization: Bearer $FEED_DIAGNOSTICS_TOKEN" .../api/feeds/diagnostics` and confirm `googleExcluded` only contains expected exclusions.
4. Open `/api/feeds/google` and verify XML loads.
5. Open `/api/feeds/klaviyo` and verify JSON loads as a flat array.
6. Confirm public feed URLs are served over HTTPS before adding them to Google Merchant Center or Klaviyo.
