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
	// The PSP/widget legs are slow (transactionInitialize + widget boot).
	timeout: 90_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
	use: {
		baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
