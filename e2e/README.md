# E2E regression suite

Codifies the manual QA journey so every deploy gets the walkthrough for free:

| Spec                                   | Covers                                                             | Needs                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `checkout-journey.spec.ts` test 1      | gate → add to cart → checkout → auth redirect                      | nothing — safe against prod                                                               |
| `checkout-journey.spec.ts` test 2      | sign-in → basket persists → info step → **payment widget renders** | `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` (a confirmed account)                              |
| `checkout-journey.spec.ts` payment leg | card entry → pay → confirmation                                    | `E2E_DO_PAYMENT=1` (staging PSP only!) — tune the in-widget Stripe selectors on first run |
| `registration-journey.spec.ts`         | signup → confirmation email → verify → first sign-in               | `E2E_MAILPIT_URL` (local stack only)                                                      |

## Running

```bash
# against production (credential-less test only)
E2E_BASE_URL=https://www.infinitybiolabs.com pnpm test:e2e

# the full signed-in money path against a preview/prod deploy
E2E_BASE_URL=https://<deploy-url> \
E2E_TEST_EMAIL=qa@yourdomain.com E2E_TEST_PASSWORD=... \
pnpm test:e2e

# full local stack incl. registration/email (Saleor + Mailpit running)
E2E_MAILPIT_URL=http://localhost:8025 pnpm test:e2e
```

First time: `npx playwright install chromium`.

## Env vars

| Var                                    | Default                         | Purpose                                                |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| `E2E_BASE_URL`                         | `http://localhost:3000`         | Target storefront                                      |
| `E2E_CHANNEL`                          | auto-detected from `/` redirect | Channel slug override                                  |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | —                               | Confirmed test account (enables signed-in tests)       |
| `E2E_MAILPIT_URL`                      | —                               | Mailpit API (enables the registration spec)            |
| `E2E_DO_PAYMENT`                       | —                               | `1` to actually enter the test card and pay (staging!) |

## Notes

- Never set `E2E_DO_PAYMENT=1` against a production-PSP environment.
- The suite auto-clicks the Research-Use attestation gate.
- Tests that lack their env vars **skip** (not fail), so the suite is safe to
  wire into CI immediately and tighten over time.
