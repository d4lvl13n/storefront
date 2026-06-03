import { test, expect } from "@playwright/test";
import { landAndAcceptGate, addFirstProductToCart, signIn, TEST_EMAIL, TEST_PASSWORD } from "./helpers";

/**
 * The money path. Mirrors the manual QA script:
 *   land → attestation gate → add to cart → checkout → auth gate → sign in →
 *   basket intact → information step → payment widget renders → (pay).
 *
 * Test 1 needs no configuration and is safe against production (worst case it
 * abandons an anonymous cart). Test 2 needs E2E_TEST_EMAIL/E2E_TEST_PASSWORD
 * for a confirmed account. The actual card entry is gated behind E2E_DO_PAYMENT
 * because it charges the (staging) PSP.
 */

test("guest hitting checkout is gated to the login portal, cart in hand", async ({ page }) => {
	const channel = await landAndAcceptGate(page);

	await addFirstProductToCart(page, channel);

	// Drawer → Checkout. The middleware must bounce an unauthenticated visitor
	// to /login with a ?next= pointing back at the checkout.
	await page.getByRole("link", { name: /Checkout/ }).click();
	await page.waitForURL("**/login**");

	expect(page.url()).toContain("/login");
	expect(page.url()).toContain("next=");
	await expect(page.locator("#email")).toBeVisible();
	await expect(page.getByRole("button", { name: /^Sign In$/i })).toBeVisible();
});

test("signed-in checkout: basket survives login and reaches the payment widget", async ({ page }) => {
	test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Set E2E_TEST_EMAIL / E2E_TEST_PASSWORD to run");

	const channel = await landAndAcceptGate(page);
	const productName = await addFirstProductToCart(page, channel);

	await page.getByRole("link", { name: /Checkout/ }).click();
	await page.waitForURL("**/login**");
	await signIn(page, TEST_EMAIL!, TEST_PASSWORD!);

	// The ?next= must carry us back into the checkout, basket intact.
	await page.waitForURL("**/checkout**", { timeout: 30_000 });
	// Order summary renders twice (mobile + desktop blocks) — scope to the heading + first().
	await expect(page.getByRole("heading", { name: /Order Summary/i }).first()).toBeVisible({
		timeout: 30_000,
	});
	// Basket persisted: the product is present in the summary (rendered in both a
	// mobile + desktop block, so assert attached rather than a specific one visible).
	await expect(page.getByText(productName, { exact: false }).first()).toBeAttached();

	// Information step: saved address (radio) or a fresh address form.
	const addressForm = page.locator('[name="streetAddress1"]');
	if (await addressForm.isVisible({ timeout: 10_000 }).catch(() => false)) {
		await page.locator('[name="firstName"]').fill("E2E");
		await page.locator('[name="lastName"]').fill("Suite");
		await addressForm.fill("47 W 13th St");
		await page.locator('[name="city"]').fill("New York");
		await page.locator('[name="postalCode"]').fill("10011");
		const area = page.locator('[name="countryArea"]');
		if (await area.isVisible().catch(() => false)) {
			await area.selectOption({ label: "New York" }).catch(() => area.fill("NY"));
		}
	}

	// Desktop + mobile-sticky both render this button — click the first (desktop).
	await page
		.getByRole("button", { name: /^Continue to payment$/i })
		.first()
		.click();

	// PaymentStep: transactionInitialize → SellAbroad widget container mounts.
	// This is the slow leg (PSP staging can take ~10s), hence the long timeout.
	await expect(page.locator("[data-sellabroad-payment-container]")).toBeAttached({ timeout: 60_000 });

	if (process.env.E2E_DO_PAYMENT !== "1") {
		test.info().annotations.push({
			type: "note",
			description: "Stopped before card entry — set E2E_DO_PAYMENT=1 to exercise the payment leg.",
		});
		return;
	}

	// ── Payment leg ──
	// SellAbroad renders Stripe's Payment Element. In Chrome it defaults to the
	// express "Google Pay" tab (a single GPay button, no card fields), so select
	// the "Card" tab first to surface the card form. Stripe test card on the
	// staging widget: 4242 4242 4242 4242 / any future date / any CVC.
	const container = page.locator("[data-sellabroad-payment-container]");
	const cardTab = container.getByRole("button", { name: /^Card$/i });
	if (await cardTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await cardTab.click();
	}

	// The widget requires an email (a labeled textbox, not a placeholder) — submit
	// is blocked with "Please enter a valid email address" if it's left empty.
	await page.getByRole("textbox", { name: /email/i }).first().fill(TEST_EMAIL!);
	// Each titled field iframe contains a disabled anti-autofill decoy
	// (name="hidden" class="StripeField--fake") plus the real input — target the
	// enabled one (name-agnostic, since Stripe's internal field names vary).
	const realInput = (title: string) =>
		page.frameLocator(`iframe[title="${title}"]`).locator("input:not([disabled])").first();
	await realInput("Secure card number input frame").fill("4242424242424242");
	await realInput("Secure expiration date input frame").fill("1234");
	await realInput("Secure CVC input frame").fill("123");

	// Submit. Anchor at the start of the accessible name so this matches the
	// "Pay $65.00" / "Pay now" submit button and NOT the "Google Pay" tab.
	await container
		.getByRole("button", { name: /^Pay\b/i })
		.first()
		.click();

	// Success URL: /checkout?checkout=…&step=confirmation → confirmation view.
	await page.waitForURL("**step=confirmation**", { timeout: 90_000 });
});
