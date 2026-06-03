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
	await expect(page.getByText("Order Summary")).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText(productName, { exact: false }).first()).toBeVisible();

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

	await page.getByRole("button", { name: /^Continue to payment$/i }).click();

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

	// ── Payment leg (best-effort: tune the in-widget selectors on first run) ──
	// The SellAbroad widget renders Stripe Elements in iframes. Stripe's test
	// card on the staging widget: 4242 4242 4242 4242 / any future date / any CVC.
	const stripeFrame = page.frameLocator('iframe[src*="stripe"]').first();
	await stripeFrame.locator('[name="number"], [name="cardnumber"]').first().fill("4242424242424242");
	await stripeFrame.locator('[name="expiry"], [name="exp-date"]').first().fill("12/34");
	await stripeFrame.locator('[name="cvc"]').first().fill("123");

	// The widget's own pay button lives inside the container — label may differ.
	await page
		.locator("[data-sellabroad-payment-container]")
		.getByRole("button", { name: /pay/i })
		.first()
		.click();

	// Success URL: /checkout?checkout=…&step=confirmation → confirmation view.
	await page.waitForURL("**step=confirmation**", { timeout: 90_000 });
});
