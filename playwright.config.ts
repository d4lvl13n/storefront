import { defineConfig, devices } from "@playwright/test";

/**
 * E2E regression suite for the customer journey.
 *
 * Run against any environment by setting E2E_BASE_URL:
 *   E2E_BASE_URL=https://www.infinitybiolabs.com pnpm test:e2e
 *
 * See e2e/README.md for the full env-var matrix (test account, Mailpit, payment).
 */
export default defineConfig({
	testDir: "./e2e",
	// Live + staging-PSP legs are slow (cold prod add, transactionInitialize, the
	// SellAbroad widget's sequential cart→settings→links→Stripe chain).
	timeout: 150_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	// One worker: these run against a single live backend, so concurrent workers
	// just contend (rate limits, shared cart/session) and cause flakiness.
	workers: 1,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
	use: {
		baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
