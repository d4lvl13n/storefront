import { test } from "@playwright/test/index.js";
import fs from "node:fs";

type StepResult = {
	status: "passed" | "failed";
	url?: string;
	details?: string;
	error?: string;
};

test("storefront smoke pass", async ({ page }) => {
	const results: Record<string, StepResult> = {};
	const consoleMessages: string[] = [];
	const pageErrors: string[] = [];

	page.on("console", (msg) => {
		if (msg.type() === "error" || msg.type() === "warning") {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		}
	});

	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});

	const runStep = async (name: string, fn: () => Promise<Omit<StepResult, "status">>) => {
		try {
			const result = await fn();
			results[name] = { status: "passed", ...result };
		} catch (error) {
			results[name] = {
				status: "failed",
				url: page.url(),
				error: error instanceof Error ? error.message : String(error),
			};
		}
	};

	await runStep("home", async () => {
		await page.goto("http://localhost:3000/us", { waitUntil: "networkidle", timeout: 60000 });
		await page.locator('a[href="/us/products"]').first().waitFor({ state: "visible" });
		const title = await page.title();
		return { url: page.url(), details: title };
	});

	await runStep("plp", async () => {
		await page.goto("http://localhost:3000/us/products", { waitUntil: "networkidle", timeout: 60000 });
		const productLinks = page.locator('a[href^="/us/products/"]');
		const count = await productLinks.count();
		if (count < 1) {
			throw new Error("No product links rendered on PLP");
		}
		return { url: page.url(), details: `${count} product links visible` };
	});

	await runStep("pdp", async () => {
		await page.goto("http://localhost:3000/us/products/5-amino-1mq", {
			waitUntil: "networkidle",
			timeout: 60000,
		});
		await page.locator("h1").waitFor({ state: "visible" });
		const heading = await page.locator("h1").first().textContent();

		const variantButton = page.getByRole("button", { name: /5mg vial/i });
		await variantButton.click();

		const addToCartButton = page.getByRole("button", { name: /add to cart|add to bag/i });
		await addToCartButton.waitFor({ state: "visible" });
		const disabled = await addToCartButton.isDisabled();
		if (disabled) {
			throw new Error("Add to cart remained disabled after selecting a variant");
		}
		await addToCartButton.click();

		return { url: page.url(), details: heading?.trim() ?? "PDP loaded" };
	});

	await runStep("cart", async () => {
		const cartButton = page.getByTestId("CartNavItem");
		await cartButton.click();

		const checkoutLink = page.getByRole("link", { name: /checkout/i });
		await checkoutLink.waitFor({ state: "visible", timeout: 15000 });

		const drawerText = await page.locator("body").textContent();
		return {
			url: page.url(),
			details: drawerText?.includes("5-Amino-1MQ")
				? "Cart drawer shows added product"
				: "Checkout CTA visible, product name not confirmed",
		};
	});

	await runStep("login", async () => {
		await page.goto("http://localhost:3000/us/login", { waitUntil: "networkidle", timeout: 60000 });
		await page.locator('input[type="email"]').waitFor({ state: "visible" });
		await page.locator('input[type="password"]').waitFor({ state: "visible" });
		return { url: page.url(), details: await page.title() };
	});

	await runStep("about", async () => {
		await page.goto("http://localhost:3000/us/pages/about", {
			waitUntil: "networkidle",
			timeout: 60000,
		});
		const bodyText = (await page.locator("body").textContent()) ?? "";
		if (!/about|infinitybio/i.test(bodyText)) {
			throw new Error("About page content did not render expected copy");
		}
		return { url: page.url(), details: await page.title() };
	});

	await runStep("privacy", async () => {
		await page.goto("http://localhost:3000/privacy", { waitUntil: "networkidle", timeout: 60000 });
		const title = await page.title();
		const allLinkHref = await page.locator('a[href*="/products"]').first().getAttribute("href");
		const bodyText = (await page.locator("body").textContent()) ?? "";
		return {
			url: page.url(),
			details: JSON.stringify({
				title,
				allLinkHref,
				hasPrivacyHeading: /privacy/i.test(bodyText),
			}),
		};
	});

	await runStep("terms", async () => {
		await page.goto("http://localhost:3000/terms", { waitUntil: "networkidle", timeout: 60000 });
		const title = await page.title();
		const allLinkHref = await page.locator('a[href*="/products"]').first().getAttribute("href");
		const bodyText = (await page.locator("body").textContent()) ?? "";
		return {
			url: page.url(),
			details: JSON.stringify({
				title,
				allLinkHref,
				hasTermsHeading: /terms/i.test(bodyText),
			}),
		};
	});

	const report = {
		generatedAt: new Date().toISOString(),
		results,
		consoleMessages,
		pageErrors,
	};

	fs.writeFileSync("output/playwright/qa-smoke-results.json", `${JSON.stringify(report, null, 2)}\n`);
	console.log(JSON.stringify(report, null, 2));
});
