import { test, expect } from "@playwright/test";
import fs from "node:fs";

type StepResult = {
	status: "passed" | "failed";
	url?: string;
	details?: string;
	error?: string;
	screenshot?: string;
};

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const channel = "us-us";
const artifactDir = "output/playwright";

test("Infinity BioLabs regression pass", async ({ page }) => {
	test.setTimeout(120000);
	const results: Record<string, StepResult> = {};
	const consoleMessages: string[] = [];
	const failedRequests: Array<{ url: string; failure: string }> = [];
	const pageErrors: string[] = [];

	page.on("console", (msg) => {
		if (msg.type() === "error" || msg.type() === "warning") {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		}
	});

	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});

	page.on("response", async (response) => {
		if (response.status() >= 400) {
			failedRequests.push({
				url: response.url(),
				failure: `HTTP ${response.status()}`,
			});
		}
	});

	const runStep = async (name: string, fn: () => Promise<Omit<StepResult, "status" | "screenshot">>) => {
		try {
			const result = await fn();
			results[name] = { status: "passed", ...result };
		} catch (error) {
			const screenshot = `${artifactDir}/${name}-failure.png`;
			if (!page.isClosed()) {
				await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
			}
			results[name] = {
				status: "failed",
				url: page.url(),
				error: error instanceof Error ? error.message : String(error),
				screenshot,
			};
		}
	};

	await runStep("home", async () => {
		await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
		await expect(page).toHaveURL(new RegExp(`/${channel}$`));
		const primaryCta = page
			.getByRole("link")
			.filter({ hasText: /explore compounds|shop all|all/i })
			.first();
		await expect(primaryCta).toBeVisible();
		const title = await page.title();
		await page.screenshot({ path: `${artifactDir}/regression-home.png`, fullPage: true });
		return { url: page.url(), details: title };
	});

	await runStep("nav-to-plp", async () => {
		await page.getByRole("link").filter({ hasText: /^all$/i }).first().click();
		await page.waitForURL(new RegExp(`/${channel}/products`), { timeout: 30000 });
		await expect(page).toHaveURL(new RegExp(`/${channel}/products`));
		const productCards = page.locator('a[href^="/us-us/products/"]');
		const count = await productCards.count();
		if (count < 1) {
			throw new Error("No product links rendered on PLP");
		}
		return { url: page.url(), details: `${count} product links visible` };
	});

	await runStep("pdp", async () => {
		const firstProduct = page.locator('a[href^="/us-us/products/"]').first();
		const firstProductHref = await firstProduct.getAttribute("href");
		if (!firstProductHref) {
			throw new Error("First product link missing href");
		}
		await firstProduct.click();
		await page.waitForLoadState("networkidle");
		await expect(page.locator("h1").first()).toBeVisible();
		const heading = (await page.locator("h1").first().textContent())?.trim() ?? "PDP loaded";
		const variantButton = page
			.getByRole("button")
			.filter({ hasText: /mg|capsule|vial|kit/i })
			.first();
		if (await variantButton.isVisible().catch(() => false)) {
			await variantButton.click();
		}
		const addToCartButton = page.getByRole("button", { name: /add to cart|add to bag/i });
		await expect(addToCartButton).toBeVisible();
		await expect(addToCartButton).toBeEnabled();
		await addToCartButton.click();
		return { url: page.url(), details: heading };
	});

	await runStep("cart", async () => {
		const cartButton = page.getByTestId("CartNavItem");
		await cartButton.click();
		const checkoutLink = page.getByRole("link", { name: /checkout/i });
		await expect(checkoutLink).toBeVisible({ timeout: 15000 });
		const checkoutHref = await checkoutLink.getAttribute("href");
		const cartText = (await page.locator("body").textContent()) ?? "";
		await page.screenshot({ path: `${artifactDir}/regression-cart.png`, fullPage: true });
		return {
			url: page.url(),
			details: JSON.stringify({
				checkoutHref,
				hasExpectedCartCopy: /subtotal|checkout/i.test(cartText),
			}),
		};
	});

	await runStep("checkout-entry", async () => {
		const checkoutLink = page.getByRole("link", { name: /checkout/i });
		const checkoutHref = await checkoutLink.getAttribute("href");
		if (!checkoutHref?.startsWith("/checkout?checkout=")) {
			throw new Error(`Unexpected checkout href: ${checkoutHref ?? "null"}`);
		}
		await Promise.all([page.waitForURL(/\/checkout\?checkout=/, { timeout: 30000 }), checkoutLink.click()]);
		await page.waitForLoadState("domcontentloaded");
		const bodyText = (await page.locator("body").textContent()) ?? "";
		await page.screenshot({ path: `${artifactDir}/regression-checkout.png`, fullPage: true });
		return {
			url: page.url(),
			details: JSON.stringify({
				checkoutHref,
				hasExpectedCheckoutCopy: /checkout|email|shipping|sign in/i.test(bodyText),
			}),
		};
	});

	await runStep("login", async () => {
		await page.goto(`${baseUrl}/${channel}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
		return { url: page.url(), details: await page.title() };
	});

	await runStep("mobile-home", async () => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`${baseUrl}/${channel}`, { waitUntil: "domcontentloaded", timeout: 60000 });
		await expect(page.locator("body")).toContainText(/explore compounds|research peptides/i);
		await page.screenshot({ path: `${artifactDir}/regression-mobile-home.png`, fullPage: true });
		return { url: page.url(), details: "Mobile homepage rendered at 390x844" };
	});

	await runStep("privacy", async () => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto(`${baseUrl}/privacy`, { waitUntil: "domcontentloaded", timeout: 60000 });
		const firstProductsLink = page.locator('a[href*="products"]').first();
		await expect(firstProductsLink).toBeVisible();
		const href = await firstProductsLink.getAttribute("href");
		const bodyText = (await page.locator("body").textContent()) ?? "";
		if (href !== `/${channel}/products`) {
			throw new Error(`Privacy page product link href was ${href ?? "null"}`);
		}
		return {
			url: page.url(),
			details: JSON.stringify({
				href,
				hasPrivacyCopy: /privacy/i.test(bodyText),
			}),
		};
	});

	await runStep("terms", async () => {
		await page.goto(`${baseUrl}/terms`, { waitUntil: "domcontentloaded", timeout: 60000 });
		const firstProductsLink = page.locator('a[href*="products"]').first();
		await expect(firstProductsLink).toBeVisible();
		const href = await firstProductsLink.getAttribute("href");
		const bodyText = (await page.locator("body").textContent()) ?? "";
		if (href !== `/${channel}/products`) {
			throw new Error(`Terms page product link href was ${href ?? "null"}`);
		}
		return {
			url: page.url(),
			details: JSON.stringify({
				href,
				hasTermsCopy: /terms/i.test(bodyText),
			}),
		};
	});

	const report = {
		generatedAt: new Date().toISOString(),
		baseUrl,
		channel,
		results,
		consoleMessages,
		pageErrors,
		failedRequests,
	};

	fs.writeFileSync(`${artifactDir}/qa-regression-results.json`, `${JSON.stringify(report, null, 2)}\n`);
	console.log(JSON.stringify(report, null, 2));
});
