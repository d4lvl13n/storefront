import { test, expect } from "@playwright/test";
import { landAndAcceptGate, fetchConfirmationLink, MAILPIT_URL } from "./helpers";

/**
 * Account creation + email confirmation. Requires a mail-capture service, so
 * this spec only runs against the local stack (Saleor + Mailpit):
 *
 *   E2E_BASE_URL=http://localhost:3000 E2E_MAILPIT_URL=http://localhost:8025 pnpm test:e2e
 *
 * Covers: signup → confirmation email → "Verify my email" (button-gated, the
 * token is single-use) → /login?confirmed=1 banner with the email pre-filled →
 * sign-in with the password chosen at signup.
 */

test("new researcher: signup → email confirm → first sign-in", async ({ page }) => {
	test.skip(!MAILPIT_URL, "Set E2E_MAILPIT_URL (local stack with Mailpit) to run");

	const channel = await landAndAcceptGate(page);
	const email = `e2e+${Date.now()}@example.com`;
	const password = "E2e-test-password-1";

	// ── Signup ──
	await page.goto(`/${channel}/signup`);
	await page.locator("#firstName").fill("E2E");
	await page.locator("#lastName").fill("Suite");
	await page.locator("#email").fill(email);
	await page.locator("#password").fill(password);
	await page.locator("#confirmPassword").fill(password);
	await page.getByRole("button", { name: /^Create Account$/i }).click();
	await expect(page.getByText("Account Created")).toBeVisible({ timeout: 20_000 });

	// ── Email confirmation (link fished out of Mailpit) ──
	const confirmLink = await fetchConfirmationLink(email);
	await page.goto(confirmLink);
	await page.getByRole("button", { name: /Verify my email/i }).click();
	await expect(page.getByText("Email verified")).toBeVisible({ timeout: 20_000 });

	// Auto-redirects to /login?confirmed=1 with the email pre-filled.
	await page.waitForURL("**/login**confirmed=1**", { timeout: 15_000 });
	await expect(page.getByText("Your email is verified")).toBeVisible();
	await expect(page.locator("#email")).toHaveValue(email);

	// ── First sign-in with the password chosen at signup ──
	await page.locator("#password").fill(password);
	await page.getByRole("button", { name: /^Sign In$/i }).click();
	await page.waitForURL(`**/${channel}**`, { timeout: 20_000 });
	await expect(page.getByRole("button", { name: /Open user menu/i })).toBeVisible({ timeout: 20_000 });
});
