import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./safe-url";

describe("safeHttpUrl", () => {
	it("accepts http and https URLs", () => {
		expect(safeHttpUrl("https://example.com")).toBe("https://example.com/");
		expect(safeHttpUrl("http://example.com/path?q=1")).toBe("http://example.com/path?q=1");
	});

	it("assumes https for a scheme-less bare domain", () => {
		expect(safeHttpUrl("example.com")).toBe("https://example.com/");
		expect(safeHttpUrl("  example.com/affiliates  ")).toBe("https://example.com/affiliates");
	});

	it("rejects javascript: and other dangerous schemes", () => {
		expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
		expect(safeHttpUrl("JavaScript:alert(document.cookie)")).toBeNull();
		expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
		expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
	});

	it("rejects empty, whitespace, and non-string input", () => {
		expect(safeHttpUrl("")).toBeNull();
		expect(safeHttpUrl("   ")).toBeNull();
		expect(safeHttpUrl(null)).toBeNull();
		expect(safeHttpUrl(undefined)).toBeNull();
		expect(safeHttpUrl(42)).toBeNull();
	});
});
