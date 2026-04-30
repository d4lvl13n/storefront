# COA Checker — Specification

**Version:** 1.0
**Status:** Approved for implementation
**Owner:** Storefront (this repo) + Saleor backend

---

## Purpose

Customers receive a vial labelled with a QR code. Scanning it must open a page on
`infinitybiolabs.com` that displays the **specific Certificate of Analysis (PDF)
issued by the lab** for the batch/audit represented by that QR code.

COA records are immutable by token: once a token is printed on a vial label, that
token must continue to resolve to the same original PDF permanently. A later lab
audit creates a new PDF, a new token, and a new QR code. It must not overwrite or
break older tokens.

That's the full feature. Three moving parts:

1. A unique token per COA record (e.g. `A8K2-9F4R-X2P7`).
2. That token mapped immutably to one PDF URL.
3. A page that takes a token and shows the PDF.

### Mutability rules

- **PDF files are immutable.** Once `<token>.pdf` is written, it is never
  overwritten or replaced. New lab audits publish under a new token.
- **JSON records are write-once for content fields, mutable on status fields
  only.** The publish script and any later admin script must:
  - Refuse to mutate `token`, `pdfUrl`, `pdfSha256`, `batchNumber`,
    `peptideName`, `issuedAt`, `labName`, or `saleorVariantId` after the
    record is first created.
  - Allow mutation only on `status`, `recallReason`, and `supersededByToken`,
    and only via a dedicated admin command (recall / supersede), never through
    the publish path.

### Privacy & access model

COA data is **token-bearer access**: the 12-character random token IS the access
key. Anyone holding a valid token URL can fetch the PDF and JSON directly. This
is intentional — it's how the QR code works, and it matches the model used by
Stripe receipt URLs, Linear file links, and most other "scan to verify" systems.

What "private" means in this design:

- ✅ Not indexed by search engines (`X-Robots-Tag: noindex, nofollow, noarchive`).
- ✅ Not enumerable (random ~2^60 keyspace).
- ✅ Not exposed in any public storefront query (`me`, `products`, etc.).
- ✅ Not tied to any customer account, order, or PII.
- ❌ **Not** auth-gated. We do not check who's holding the token. By design.

---

## End-to-end flow

```
[Lab issues new COA PDF]
         │
         │  ops runs COA publish script
         │  script mints a random token
         │  script stores PDF + JSON record on Hetzner
         │  ops generates QR encoding https://infinitybiolabs.com/coa/<token>
         │  ops sticks QR onto vial label
         │
         ▼
[Vial ships to customer]
         │
         │  customer scans QR
         ▼
[Storefront /coa/<token> page]
         │
         │  storefront API fetches the COA record by token
         │  record returns pdfUrl + batch + peptide name + status
         │
         ▼
[Page renders with the PDF embedded inline + batch info above]
```

---

## Token format

- 12 characters, **Crockford base32** (excludes `I`, `L`, `O`, `U`, `0`, `1` to avoid
  visual ambiguity in print).
- Displayed as three groups of four: `A8K2-9F4R-X2P7`.
- ~2^60 keyspace — not enumerable, no need to obscure further.
- QR encodes the **full canonical URL**:
  `https://infinitybiolabs.com/coa/A8K2-9F4R-X2P7` (uppercase letters in the path).
- Storefront URL handler accepts both with and without dashes, both upper and
  lowercase, and normalises before lookup.

---

## Storefront work (this repo)

### Files to create

| File                                            | Responsibility                                                                                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/[channel]/(main)/coa/[token]/page.tsx` | Server component. Fetches the COA bundle. Renders the page with the PDF embedded. Returns `notFound()` on miss.                                                                                                                           |
| `src/app/[channel]/(main)/coa/page.tsx`         | Manual entry form. User pastes a token, form 302s to `/[channel]/coa/<token>`.                                                                                                                                                            |
| `src/app/coa/[token]/page.tsx`                  | Root canonical QR handler. Redirects `/coa/<token>` to `/<default-channel>/coa/<token>` so printed QR codes do not depend on a channel slug.                                                                                              |
| `src/app/api/coa/[token]/route.ts`              | GET endpoint. Rate-limited (10 req / 15 min / IP). Fetches the token's COA JSON record from the backend COA registry. Validates with the Zod schema before returning sanitized `{ pdfUrl, pdfSha256, peptide, batch, issuedAt, status }`. |
| `src/lib/coa/token.ts`                          | Token format helpers — normalise, validate, format with dashes for display.                                                                                                                                                               |
| `src/lib/coa/schema.ts`                         | **Zod schema** for the COA JSON record. Single source of truth shared between the API route (runtime validation) and the page (TypeScript type via `z.infer<>`). API route returns 502 if validation fails.                               |

### Page layout

Top of page (above the PDF):

- **Big check icon** + headline `Authentic InfinityBio Labs COA`.
- Two-column block:
  - Left: peptide name, batch number, issued date.
  - Right: the token in monospace, with a "copy" button.
- One-line note: `If anything below doesn't match the label on your vial, contact us.`

Below: **the PDF embedded inline**, full width, ~85vh tall, via `<iframe>` or
`<embed>`. Above the embed, a "Download PDF" link that opens the file in a new
tab as a fallback for browsers that block embeds (mobile Safari, etc.).

Bottom: a small RUO-research-use-only disclaimer line and a link to the contact
page if something looks wrong.

### Behaviour

- **Status normalisation.** API returns `status: "active" | "superseded" | "recalled"`.
  - `active` → render normally.
  - `superseded` → amber banner above the PDF: `A newer COA exists for this batch. View latest →` linking to the new token if available.
  - `recalled` → red full-width banner replacing the PDF: `This batch was recalled.` + recall reason + contact CTA. **Do not 404** — the customer needs to learn the truth.
- **Token not found.** Return Next.js `notFound()`; render the storefront's standard 404 page so a typo doesn't leak existence.
- **Rate limiting.** Use the same in-memory limiter pattern as `/api/track-order`
  (`RATE_LIMIT_MAX = 10`, `RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000`).
- **No PII.** The COA bundle is intentionally public-by-token; nothing in the
  response is tied to an order or customer.
- **Channel-scoped URL.** The page lives at `/[channel]/coa/[token]` so the same
  token rendered in `/us-us/` versus `/eu-en/` shows under the right channel
  shell. The lookup itself does not filter by channel — a token is global.
- **Canonical QR URL.** Printed QR codes use `https://infinitybiolabs.com/coa/<token>`.
  The root route redirects to the current default channel before rendering.

### Footer link

Add **"Verify a COA"** to the Saleor `footer` menu under the Support column,
linking to `/coa`. (Frontend fallback already supports this; the live menu lives
in the Saleor Dashboard.)

### Estimate

~3–4 hours.

---

## Backend / COA registry work — required from the backend dev

The backend dev does not need to write a full service or database. They need to
host an **append-only COA registry** on the existing Hetzner backend server,
ship CLI scripts for publishing/generating tokens/QRs, and make each token
resolve to exactly one PDF record.

Saleor product variants may store an optional pointer to the latest COA token
for internal convenience, but Saleor variant metadata is **not** the source of
truth for lookup. A product variant can have multiple lab audits over time; old
COA tokens must stay online even after newer audits are uploaded.

### What the backend dev must deliver

1. **Storage location: append-only files on Hetzner.**
   Each COA has two public-by-token files:

   - `/var/www/coa/<token>.pdf`
   - `/var/www/coa/<token>.json`

   The JSON record is the lookup source of truth. The PDF file for a token must
   never be replaced with a different lab document after labels are printed.
   If a new lab audit is issued, publish a new token/PDF/JSON record instead.

2. **Required JSON record fields** (`/var/www/coa/<token>.json`):

   | Field               | Required                          | Type          | Example                                                        | Notes                                                                           |
   | ------------------- | --------------------------------- | ------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
   | `token`             | ✅                                | string        | `A8K2-9F4R-X2P7`                                               | The lookup primary key. Globally unique.                                        |
   | `pdfUrl`            | ✅                                | string (URL)  | `https://api.infinitybiolabs.com/media/coa/A8K2-9F4R-X2P7.pdf` | HTTPS URL on the same Hetzner server as Saleor.                                 |
   | `pdfSha256`         | ✅                                | string        | `9e107d9d372bb6826bd81d3542a419d6...`                          | Integrity fingerprint captured at upload time.                                  |
   | `batchNumber`       | ✅                                | string        | `IBL-2026-04-A`                                                | Customer reads this on the vial label. Used for the side-by-side eyeball check. |
   | `peptideName`       | ✅                                | string        | `Semaglutide 5mg`                                              | Customer reads this on the vial label.                                          |
   | `issuedAt`          | ✅                                | ISO 8601 date | `2026-04-15`                                                   | When the lab issued the COA.                                                    |
   | `status`            | ✅                                | enum          | `active` / `superseded` / `recalled`                           | Defaults to `active`.                                                           |
   | `labName`           | optional                          | string        | `Janoski Analytical`                                           | Displayed in the page footer for trust signaling.                               |
   | `recallReason`      | required if `status = recalled`   | string        | `Heavy metal limit exceeded — see notice`                      | Shown to the customer in the red banner.                                        |
   | `supersededByToken` | required if `status = superseded` | string        | `B6K4-8M2P-Q9R3`                                               | Storefront uses this to link to the latest COA.                                 |
   | `saleorVariantId`   | optional                          | string        | `UHJvZHVjdFZhcmlhbnQ6...`                                      | Internal traceability only. Lookup must not depend on this.                     |

3. **COA publish CLI script.** Backend dev ships a **bundled CLI script** ops can
   run on their machine or via SSH into the server. Requirements:

   - Generates uniformly-random Crockford base32 string of length 12 (excludes
     `I`, `L`, `O`, `U`, `0`, `1`).
   - Formats output as `XXXX-XXXX-XXXX` (uppercase, dashes).
   - Checks uniqueness by verifying neither `/var/www/coa/<token>.pdf` nor
     `/var/www/coa/<token>.json` already exists; loops until a fresh token is
     found.
   - **Rejects PDFs larger than 10 MB.** Typical COA PDFs are 1–3 MB; anything
     larger is almost certainly a misexport from the lab. An optional
     `--allow-large` flag bypasses the check for legitimate edge cases and
     prints a warning.
   - Copies the lab PDF into `/var/www/coa/<token>.pdf`.
   - Calculates `pdfSha256`.
   - Writes `/var/www/coa/<token>.json` with the required fields above.
   - Refuses to overwrite an existing PDF or JSON record unless a separate
     explicit admin-only repair flag is used.
   - **If `--saleor-variant-id <id>` is passed**, the script also writes the new
     token to that variant's public `metadata` under the key `latest_coa_token`,
     using the Saleor admin API. This is staff convenience only (so ops can see
     "current COA" inside the Dashboard) and is never used for customer lookup.
     If the Saleor write fails, the publish itself still succeeds — the script
     prints a warning and exits 0.
   - Single-command usage:
     `python scripts/coa-publish.py lab.pdf --peptide "Semaglutide 5mg" --batch IBL-2026-04-A --issued-at 2026-04-15 [--saleor-variant-id <id>]`
     outputs the token and canonical URL.
   - Language: Python or Node, matching whatever the rest of the backend tooling
     uses.

4. **QR-generator CLI script.** Backend dev also ships a **bundled CLI script**
   that takes a token, URL, or a list of tokens and produces print-ready QR PNGs.
   Requirements:

   - Input: token string OR a CSV/text file of tokens.
   - Output: one PNG per token, sized for the label printer (typical: 300 DPI,
     22×22 mm = ~260×260 px). Output directory configurable.
   - QR content: the **canonical full URL** —
     `https://infinitybiolabs.com/coa/<token>`.
   - Includes error correction level **M** (15%) so partial print damage on the
     vial label is recoverable.
   - Single-command usage: `python scripts/coa-qr.py A8K2-9F4R-X2P7` writes
     `A8K2-9F4R-X2P7.png`. Bulk: `python scripts/coa-qr.py --batch tokens.txt`
     writes one PNG per line.
   - Language: Python (with `qrcode` package) or Node (with `qrcode` package).
     ~80 lines.

5. **Host the PDF and JSON record on the Hetzner backend server.**

   - Decision: COA files live **on the same Hetzner VPS as Saleor**, not on
     external storage (R2 / S3).
   - Suggested layout:
     - `/var/www/coa/<token>.pdf` served as
       `https://api.infinitybiolabs.com/media/coa/<token>.pdf`
     - `/var/www/coa/<token>.json` served as
       `https://api.infinitybiolabs.com/media/coa/<token>.json`
   - **Critical:** nginx config must serve PDFs with `Content-Type: application/pdf`
     and JSON with `Content-Type: application/json`.
   - **Critical:** do not emit `X-Frame-Options: DENY` or `SAMEORIGIN` on the
     PDF route. The storefront and Saleor backend are different origins
     (`infinitybiolabs.com` vs `api.infinitybiolabs.com`), so `SAMEORIGIN`
     would block the inline PDF. If using CSP, set:
     `Content-Security-Policy: frame-ancestors https://infinitybiolabs.com`.
   - **Indexing:** send `X-Robots-Tag: noindex, nofollow, noarchive` for COA
     PDFs and JSON records.
   - **Backups:** include the COA directory in the existing Postgres backup
     cron job (or its own daily snapshot). COAs are evidence — losing them is
     unacceptable.
   - **Permissions:** COA PDFs and JSON records are publicly readable by token.
     Anyone with a token can fetch them directly; that's by design (the token is
     the access key). Do **not** require auth for the PDF GET — it would break
     iframe embed and customer downloads.
   - **Rate limiting at the nginx layer.** Apply a per-IP `limit_req_zone` to
     `/media/coa/` of roughly 30 req/min. Random tokens make enumeration
     impractical, but this is one config line and removes a class of "what if"
     scrape concerns.
   - **CORS.** No CORS header needed for v1 — the storefront fetches JSON
     server-side from the Next.js Node runtime, which is server-to-server. If
     a future admin tool needs client-side fetch, add
     `Access-Control-Allow-Origin: https://infinitybiolabs.com` then.

6. **Storefront lookup.** The storefront calls:

   `https://api.infinitybiolabs.com/media/coa/<token>.json`

   If the JSON record exists and validates, the storefront renders it. If it
   404s or fails validation, the storefront returns `notFound()`.

7. **Saleor pointer (optional, written by the publish script).** When the
   publish script is run with `--saleor-variant-id <id>`, it writes the freshly
   minted token to that variant's public `metadata` under the key
   `latest_coa_token`. This gives ops a one-glance "current COA for this
   variant" inside the Saleor Dashboard. Constraints:

   - Used for **staff convenience only**, never for customer lookup.
   - Customer lookup always reads `<token>.json` from the COA registry.
   - Mutable by design (it changes every time a new audit publishes), so it
     would be a footgun if anything else depended on it.
   - If the publish script is run without `--saleor-variant-id`, the metadata
     is not written and the COA still publishes successfully — useful for
     batches that don't have a clean variant mapping.

8. **Operator workflow SOP.** Backend dev writes a one-page doc covering:

   - Receive PDF from lab → save locally.
   - Run `python scripts/coa-publish.py ...` with peptide, batch, issued date,
     optional lab name, and optional Saleor variant ID.
   - Confirm the script outputs a token, PDF URL, JSON URL, hash, and canonical
     customer URL.
   - Run `python scripts/coa-qr.py <token>` → get PNG.
   - Send QR PNG to label printer.
   - The Saleor variant's `latest_coa_token` metadata is set automatically by
     the publish script when `--saleor-variant-id` is passed; no manual paste
     needed.

9. **Recall / superseded workflow.**
   - A recall may update the existing JSON record's `status` and `recallReason`.
     The original PDF URL must remain unchanged.
   - A superseded COA may update the old JSON record's `status` to `superseded`
     and set `supersededByToken` to the newer token. The old token must still
     render and explain that a newer COA exists.
   - The storefront page picks status changes up on the next request (cache TTL:
     60s).

### What the backend dev does **not** need to deliver right now

These are explicitly out of scope for v1 to keep the slice small:

- ❌ A custom Saleor App
- ❌ A new database
- ❌ A custom Dashboard panel
- ❌ Bulk CSV import
- ❌ Lab API integration
- ❌ Email-on-recall to past customers
- ❌ Audit log of who issued / recalled which COA

If volume exceeds ~20 COAs per week, or if regulator asks for an audit trail,
revisit and build a dedicated Saleor App. **The storefront work doesn't change
when that happens** — only the data source behind `/api/coa/[token]` changes.

---

## API contract between storefront and backend

The storefront's `/api/coa/[token]/route.ts` returns to the page exactly this
shape (single source of truth):

```ts
type CoaLookupSuccess = {
	ok: true;
	coa: {
		token: string; // echoed back
		peptideName: string; // from JSON record peptideName
		batchNumber: string; // from JSON record batchNumber
		issuedAt: string; // ISO date from JSON record issuedAt
		pdfUrl: string; // from JSON record pdfUrl
		pdfSha256: string; // from JSON record pdfSha256
		status: "active" | "superseded" | "recalled";
		labName?: string; // from JSON record labName
		recallReason?: string; // from JSON record recallReason (only if recalled)
		supersededByToken?: string; // from JSON record supersededByToken (only if superseded)
	};
};

type CoaLookupFailure = {
	ok: false;
	error: "not_found" | "rate_limited" | "server_error";
	message: string;
};
```

The API route validates and sanitizes the JSON record before returning it to the
page. Unknown fields in the JSON record are ignored.

---

## Acceptance criteria

- [ ] Customer scans the QR on a real vial → lands on `/coa/[token]` → redirects
      to `/[channel]/coa/[token]` → sees the correct lab PDF inline within 2
      seconds on a 4G connection.
- [ ] Manually typing the token at `/coa` and submitting redirects to the same
      page and renders identically.
- [ ] An older token still renders its original PDF after a newer lab audit has
      been uploaded for the same peptide/batch family.
- [ ] An invalid / unknown token renders the standard 404 page, not a custom
      "not found" message that leaks existence.
- [ ] A recalled COA shows the red banner with reason, does **not** show the PDF.
- [ ] A superseded COA shows the amber banner with a link to the latest token.
- [ ] Rate limit triggers after 10 lookups per IP per 15 minutes; HTTP 429
      returned with a clear error.
- [ ] Mobile Safari, Chrome Android, desktop Chrome / Firefox / Safari all
      render the embedded PDF (or fall back gracefully to the "Download PDF"
      link).
- [ ] No customer PII anywhere in the response payload.

---

## Confirmed decisions (resolved with client)

1. **COA storage:** PDFs and JSON records live **on the Hetzner backend server**
   alongside Saleor. No external bucket, no S3 / R2. Served via nginx from paths
   like `/var/www/coa/<token>.pdf` and `/var/www/coa/<token>.json`.
2. **COA publish script:** Backend dev ships a CLI script (Python or Node).
   Generates a unique Crockford-base32 token, stores the PDF, calculates the
   SHA-256 fingerprint, writes the JSON record, optionally sets the Saleor
   variant pointer, and outputs the canonical URL.
3. **QR generator:** Backend dev ships a CLI script (Python or Node).
   Takes a token (single or batch) and outputs print-ready PNGs at 300 DPI with
   error correction level M. See §4 above.
4. **Permanent token mapping:** one token resolves to one JSON record and one
   original PDF. PDF is fully immutable; JSON is mutable only on
   `status` / `recallReason` / `supersededByToken`. New lab audits create new
   tokens; they do not replace older token/PDF mappings.
5. **Saleor metadata pointer:** the publish script auto-writes
   `latest_coa_token` to the Saleor variant when `--saleor-variant-id` is
   passed. Staff convenience only; customer lookup always reads the JSON
   registry, never Saleor.
6. **Privacy model:** token-bearer access. Anyone with the token URL can fetch
   the PDF. Not indexed by search engines, not enumerable, no PII, no auth gate.
7. **Schema validation on the storefront:** Zod, single source of truth at
   `src/lib/coa/schema.ts`, shared between the API route runtime check and the
   page TypeScript types.
8. **PDF size cap:** 10 MB hard limit at the publish script, bypassable with
   `--allow-large` for legitimate edge cases.
9. **nginx rate limiting on the COA host:** ~30 req/min/IP via
   `limit_req_zone`. Cheap insurance on top of the random-token design.

---

## Estimated effort

| Slice                                                                                                                        | Owner          | Effort     |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------- |
| Storefront page + root QR redirect + manual entry form + lookup API + token utils + footer wiring                            | Storefront dev | 3–4 hours  |
| Backend: COA publish CLI, QR-generator CLI, nginx config for `/media/coa/`, SOP doc, first 3 sample COAs uploaded end-to-end | Backend dev    | 1–1.5 days |
| End-to-end smoke test with a real QR printed on a real vial                                                                  | Joint          | 30 min     |

**Total: ~1.5 days end-to-end** if backend and storefront work in parallel.
