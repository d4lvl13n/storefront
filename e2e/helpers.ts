import { expect, type Page } from "@playwright/test";

/** Channel slug override; auto-detected from the homepage redirect when unset. */
export const CHANNEL_OVERRIDE = process.env.E2E_CHANNEL;

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;
export const MAILPIT_URL = process.env.E2E_MAILPIT_URL; // e.g. http://localhost:8025

/**
 * Land on the storefront, click through the Research-Use attestation gate if it
 * is showing, and return the active channel slug (read from the URL so the
 * suite works against any environment without configuration).
 */
/**
 * Click through the Research-Use attestation modal if present. Acceptance runs
 * a server action that sets the `ruo_acknowledged` cookie and refreshes — we
 * wait on the COOKIE (not just the modal hiding) so the gate can't reappear on
 * the next navigation.
 */
async function dismissResearchGate(page: Page, { wait }: { wait: boolean }): Promise<void> {
	// Tolerant of copy changes (affirm/confirm) — anchor on the stable suffix.
	const gateButton = page.getByRole("button", { name: /continue to research catalog/i });

	const present = wait
		? await gateButton
				.waitFor({ state: "visible", timeout: 8_000 })
				.then(() => true)
				.catch(() => false)
		: await gateButton.isVisible().catch(() => false);
	if (!present) return;

	await gateButton.click();
	await expect
		.poll(
			async () =>
				(await page.context().cookies()).some((c) => c.name === "ruo_acknowledged" && c.value === "1"),
			{ timeout: 15_000 },
		)
		.toBe(true);
	await expect(gateButton).toBeHidden({ timeout: 15_000 });
}

export async function landAndAcceptGate(page: Page): Promise<string> {
	// Klaviyo's newsletter popup overlays the page and intercepts clicks; it is
	// not under test, so block it for deterministic runs.
	await page.route(/klaviyo\.com/, (route) => route.abort());

	await page.goto("/");
	await dismissResearchGate(page, { wait: true });

	if (CHANNEL_OVERRIDE) return CHANNEL_OVERRIDE;
	const segment = new URL(page.url()).pathname.split("/").filter(Boolean)[0];
	return segment || "default-channel";
}

/**
 * Open the catalog and add the first quick-addable product to the cart.
 * Returns the product name. The cart drawer auto-opens on success.
 */
export async function addFirstProductToCart(page: Page, channel: string): Promise<string> {
	await page.goto(`/${channel}/products`);
	// Defensive: re-dismiss the gate if a race left it showing (no wait cost).
	await dismissResearchGate(page, { wait: false });

	const productLinks = page.locator(`a[href*="/${channel}/products/"]`);
	await expect(productLinks.first()).toBeVisible();

	// Try the first few products until one has an enabled "Add to cart"
	// (multi-variant products show "Select options" until a variant is chosen).
	const candidates = Math.min(await productLinks.count(), 4);
	for (let i = 0; i < candidates; i++) {
		await productLinks.nth(i).click();
		await page.waitForURL(`**/${channel}/products/**`);

		const addToCart = page.getByRole("button", { name: /^Add to cart$/i }).first();
		if (await addToCart.isEnabled({ timeout: 8_000 }).catch(() => false)) {
			const name = (await page.getByRole("heading", { level: 1 }).first().textContent())?.trim() ?? "";
			await addToCart.click();
			// AddToCartSync opens the drawer after the server action completes.
			await expect(page.getByText("Your Bag")).toBeVisible({ timeout: 20_000 });
			return name;
		}
		await page.goBack();
	}

	throw new Error("No quick-addable product found in the first products on the PLP");
}

/** Sign in on the storefront /login page (assumes it is currently displayed). */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
	await page.locator("#email").fill(email);
	await page.locator("#password").fill(password);
	await page.getByRole("button", { name: /^Sign In$/i }).click();
}

// ── Mailpit (local stack only) ───────────────────────────────────────────────

type MailpitSearch = { messages?: Array<{ ID: string }> };

/**
 * Poll Mailpit for the most recent message to `email` and extract the account
 * confirmation link (the /login?mode=confirm&email=&token= URL).
 */
export async function fetchConfirmationLink(email: string): Promise<string> {
	if (!MAILPIT_URL) throw new Error("E2E_MAILPIT_URL not set");

	const deadline = Date.now() + 30_000;
	while (Date.now() < deadline) {
		const search = (await (
			await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
		).json()) as MailpitSearch;

		const id = search.messages?.[0]?.ID;
		if (id) {
			const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json()) as {
				HTML?: string;
				Text?: string;
			};
			const body = `${message.HTML ?? ""}\n${message.Text ?? ""}`;
			const match = body.match(/https?:\/\/[^\s"'<>]+mode=confirm[^\s"'<>]*/);
			if (match) return match[0].replace(/&amp;/g, "&");
		}
		await new Promise((r) => setTimeout(r, 1_500));
	}

	throw new Error(`No confirmation email for ${email} arrived in Mailpit within 30s`);
}
