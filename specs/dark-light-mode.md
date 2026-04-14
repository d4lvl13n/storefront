# Dark/Light Mode Implementation Spec

## Status: COMPLETE

All phases implemented. `next-themes` installed, theme provider wired, toggle in header, and all files refactored from hardcoded neutrals to semantic tokens.

## Verification Results

- TypeScript: 0 errors
- Tests: 104/104 passing
- Lint: 0 errors (3 pre-existing warnings)

---

## Phase 1: Infrastructure -- DONE

- [x] `src/ui/providers/theme-provider.tsx` -- Created (next-themes wrapper)
- [x] `src/app/layout.tsx` -- Removed hardcoded `dark` class, wrapped with `<ThemeProvider>`
- [x] `src/ui/components/theme-toggle.tsx` -- Created (sun/moon/monitor cycle)
- [x] `src/ui/components/header.tsx` -- Toggle added before user menu

---

## Phase 2: Token Mapping

| Hardcoded            | Semantic Token                              |
| -------------------- | ------------------------------------------- |
| `text-white`         | `text-foreground`                           |
| `text-neutral-200`   | `text-foreground`                           |
| `text-neutral-300`   | `text-foreground` / `text-muted-foreground` |
| `text-neutral-400`   | `text-muted-foreground`                     |
| `text-neutral-500`   | `text-muted-foreground`                     |
| `text-neutral-600`   | `text-muted-foreground`                     |
| `bg-neutral-950`     | `bg-background`                             |
| `bg-neutral-900`     | `bg-card`                                   |
| `bg-neutral-800`     | `bg-secondary`                              |
| `border-neutral-800` | `border-border`                             |
| `border-neutral-700` | `border-border`                             |

---

## Phase 3: File-by-File Refactoring

### High Priority -- ALL DONE

| File                                                        | Status |
| ----------------------------------------------------------- | ------ |
| `src/app/[channel]/(main)/page.tsx`                         | DONE   |
| `src/ui/components/reconstitution/calculator-view.tsx`      | DONE   |
| `src/ui/components/footer.tsx`                              | DONE   |
| `src/ui/components/plp/filter-bar.tsx`                      | DONE   |
| `src/ui/components/how-ordering-works.tsx`                  | DONE   |
| `src/ui/components/verified-story-card.tsx`                 | DONE   |
| `src/ui/components/sign-up-form.tsx`                        | DONE   |
| `src/app/[channel]/(main)/contact/page.tsx`                 | DONE   |
| `src/app/[channel]/(main)/affiliate/application-form.tsx`   | DONE   |
| `src/app/[channel]/(main)/account/orders/[number]/page.tsx` | DONE   |
| `src/ui/components/shop-goal-card.tsx`                      | DONE   |
| `src/ui/components/auth/login-mode.tsx`                     | DONE   |

### Medium Priority -- ALL DONE

| File                                                       | Status |
| ---------------------------------------------------------- | ------ |
| `src/ui/components/account/account-skeleton.tsx`           | DONE   |
| `src/ui/components/reconstitution/history-view.tsx`        | DONE   |
| `src/app/[channel]/(main)/cart/page.tsx`                   | DONE   |
| `src/app/[channel]/(main)/search/page.tsx`                 | DONE   |
| `src/app/[channel]/(main)/about/page.tsx`                  | DONE   |
| `src/app/[channel]/(main)/signup/page.tsx`                 | DONE   |
| `src/ui/components/homepage-faq.tsx`                       | DONE   |
| `src/app/[channel]/(main)/product-tabs.tsx`                | DONE   |
| `src/app/[channel]/(main)/affiliate/page.tsx`              | DONE   |
| `src/ui/components/account/account-nav.tsx`                | DONE   |
| `src/ui/components/user-menu.tsx`                          | DONE   |
| `src/ui/components/reconstitution/handling-guide-view.tsx` | DONE   |
| `src/app/[channel]/(main)/login/page.tsx`                  | DONE   |
| `src/app/[channel]/(main)/account/page.tsx`                | DONE   |
| `src/ui/components/reconstitution/worked-example-view.tsx` | DONE   |
| `src/ui/components/pagination.tsx`                         | DONE   |
| `src/ui/components/legal-layout.tsx`                       | DONE   |

### Low Priority -- ALL DONE

| File                                                                  | Status                          |
| --------------------------------------------------------------------- | ------------------------------- |
| `src/ui/components/plp/category-hero.tsx`                             | DONE                            |
| `src/ui/components/plp/product-card.tsx`                              | DONE                            |
| `src/ui/components/account/order-row.tsx`                             | DONE                            |
| `src/ui/components/reconstitution/faq-view.tsx`                       | DONE                            |
| `src/app/[channel]/(main)/faq/page.tsx`                               | DONE                            |
| `src/app/[channel]/(main)/pages/[slug]/page.tsx`                      | DONE                            |
| `src/app/[channel]/(main)/peptide-calculator/page.tsx`                | DONE                            |
| `src/app/[channel]/(main)/products/page.tsx`                          | DONE                            |
| `src/app/[channel]/(main)/account/settings/page.tsx`                  | DONE                            |
| `src/ui/components/search-results.tsx`                                | DONE                            |
| `src/checkout/components/express-checkout/express-checkout.tsx`       | DONE (brand button colors kept) |
| `src/ui/components/reconstitution/calculator-page-client.tsx`         | DONE                            |
| `src/app/[channel]/(main)/products/products-client.tsx`               | DONE                            |
| `src/app/[channel]/(main)/categories/[slug]/client.tsx`               | DONE                            |
| `src/app/[channel]/(main)/collections/[slug]/client.tsx`              | DONE                            |
| `src/ui/atoms/loader.tsx`                                             | DONE                            |
| `src/app/[channel]/(main)/account/layout.tsx`                         | DONE                            |
| `src/app/[channel]/(main)/account/addresses/page.tsx`                 | DONE                            |
| `src/app/[channel]/(main)/account/orders/page.tsx`                    | DONE                            |
| `src/app/[channel]/(main)/cart/checkout-link.tsx`                     | DONE                            |
| `src/app/[channel]/(main)/cart/delete-line-button.tsx`                | DONE                            |
| `src/ui/components/nav/components/user-menu/components/user-info.tsx` | DONE                            |
| `src/app/checkout/layout.tsx`                                         | DONE                            |
| `src/app/checkout/page.tsx`                                           | DONE                            |
| `src/checkout/views/saleor-checkout/saleor-checkout.tsx`              | DONE                            |
| `src/checkout/views/empty-cart-page/empty-cart-page.tsx`              | DONE                            |
| `src/checkout/views/page-not-found/page-not-found.tsx`                | DONE                            |
| `src/checkout/views/saleor-checkout/checkout-skeleton.tsx`            | DONE                            |
| `src/app/[channel]/(main)/layout.tsx` (footer skeleton)               | DONE                            |

### Intentionally Unchanged

| File                                                            | Reason                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/checkout/components/express-checkout/express-checkout.tsx` | `bg-black`/`text-white` on Apple Pay button = brand requirement |
| `src/ui/components/dev/graphql-monitor.tsx`                     | Dev-only debug tool, uses zinc scale                            |
| `src/_reference/**`                                             | Reference code, not in production                               |
| Any `text-white` on `bg-emerald-*` buttons                      | Correct contrast on colored backgrounds                         |

---

## Remaining `text-white` Instances (24 total -- all legitimate)

All are `text-white` on colored backgrounds where white is the correct contrast color:

- `bg-emerald-500 text-white` (CTA buttons) -- 12 instances
- `bg-emerald-600 text-white` (affiliate submit) -- 1 instance
- `bg-black text-white` (Apple Pay button) -- 1 instance
- `bg-pink-500 text-white` (payment badge) -- 1 instance
- `bg-red-700 text-white` (error state) -- 1 instance
- `bg-zinc-900 text-white` (dev monitor) -- 5 instances
- `bg-neutral-900 text-white` (reference code) -- 1 instance
- Filter selected state on emerald bg -- 2 instances
