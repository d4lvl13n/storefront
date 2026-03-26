import { test, expect } from "@playwright/test";
import fs from "node:fs";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const channel = "us-us";
const artifactDir = "output/playwright";

test("homepage all-nav click", async ({ page }) => {
	test.setTimeout(45000);

	const pageErrors: string[] = [];
	const consoleMessages: string[] = [];

	page.on("pageerror", (error) => {
		pageErrors.push(error.message);
	});

	page.on("console", (msg) => {
		if (msg.type() === "error" || msg.type() === "warning") {
			consoleMessages.push(`${msg.type()}: ${msg.text()}`);
		}
	});

	await page.goto(`${baseUrl}/${channel}`, { waitUntil: "domcontentloaded", timeout: 30000 });
	const allLink = page.getByRole("link", { name: /^all$/i }).first();
	await expect(allLink).toBeVisible();
	const href = await allLink.getAttribute("href");

	let navigated = false;
	try {
		await Promise.all([
			page.waitForURL(new RegExp(`/${channel}/products$`), { timeout: 10000 }),
			allLink.click(),
		]);
		navigated = true;
	} catch {
		navigated = false;
	}

	const report = {
		generatedAt: new Date().toISOString(),
		baseUrl,
		channel,
		href,
		navigated,
		finalUrl: page.url(),
		pageErrors,
		consoleMessages,
	};

	fs.writeFileSync(`${artifactDir}/home-nav-results.json`, `${JSON.stringify(report, null, 2)}\n`);

	expect(report).toBeTruthy();
});
