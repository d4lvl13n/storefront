# Production Hydration Investigation

## Goal

Find why the storefront works in local development but fails after production deploy with React hydration error `#418`, then identify the most likely fix or set of fixes.

## Phases

- [completed] Audit current config and likely hydration mismatch sources
- [completed] Reproduce production build locally
- [completed] Narrow the failing route/component
- [completed] Apply fix and verify with production build

## Errors Encountered

| Error                                                      | Attempt | Resolution                                                                                                                 |
| ---------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `use cache` build errors after disabling `cacheComponents` | 1       | Removed `use cache` / `cacheLife` / `cacheTag` from affected routes and components, kept fetch-level `revalidate` behavior |

# Task Plan

## Goal

Run the premium UX/UI audit for `CODA-115` against the local Infinity BioLabs storefront and produce a concise Paperclip report with prioritized findings across trust, brand, hierarchy, merchandising, funnel clarity, and mobile polish.

## Phases

| Phase                                                  | Status   | Notes                                                                                                                             |
| ------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1. Load task and environment context                   | complete | `CODA-115` checked out; Paperclip heartbeat context, board update, and repo guidance reviewed                                     |
| 2. Verify local prerequisites and service availability | complete | Local storefront is serving on `http://localhost:3000`; `.env` points to the local Saleor API on `http://localhost:8000/graphql/` |
| 3. Run browser audit across key storefront surfaces    | complete | Fresh desktop/mobile screenshots captured for homepage, PLP, PDP, login, checkout, privacy, and terms after the server recovered  |
| 4. Summarize findings back to Paperclip                | complete | Posted the audit summary and then converted the findings into six follow-up delivery issues                                       |

## Errors Encountered

| Error                                                                                        | Attempt | Resolution                                                                                         |
| -------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| Local planning files referenced a different Paperclip task                                   | 1       | Rebased working notes to active issue `CODA-115` before continuing                                 |
| Playwright skill wrapper failed with `playwright-cli: command not found`                     | 1       | Switched to `pnpm dlx playwright` for direct CLI access                                            |
| macOS screenshot capture was blocked by missing Screen Recording permission                  | 1       | Avoided OS-level capture and used Playwright CLI screenshots instead                               |
| Live storefront temporarily returned `500 Internal Server Error` during the first audit pass | 1       | Paused and reported the blocker, then resumed once the board confirmed the server was back online  |
| Paperclip API rejected subtask assignment with `403 Missing permission: tasks:assign`        | 1       | Created the follow-up issues unassigned and documented `Suggested owner: Avery` for Sofia to apply |
