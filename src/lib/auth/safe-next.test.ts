import { describe, it, expect } from "vitest";

import { isSafeNextPath } from "./safe-next";

describe("isSafeNextPath", () => {
	it("accepts same-origin root-relative paths", () => {
		expect(isSafeNextPath("/")).toBe(true);
		expect(isSafeNextPath("/default-channel")).toBe(true);
		expect(isSafeNextPath("/default-channel/products")).toBe(true);
		expect(isSafeNextPath("/bpc-157")).toBe(true); // hyphens must survive
		expect(isSafeNextPath("/checkout?checkout=abc123")).toBe(true);
		expect(isSafeNextPath("/page#section")).toBe(true);
	});

	it("rejects empty / non-root values", () => {
		expect(isSafeNextPath(null)).toBe(false);
		expect(isSafeNextPath("")).toBe(false);
		expect(isSafeNextPath("products")).toBe(false);
		expect(isSafeNextPath("https://evil.com")).toBe(false);
		expect(isSafeNextPath("http://evil.com")).toBe(false);
	});

	it("rejects protocol-relative URLs", () => {
		expect(isSafeNextPath("//evil.com")).toBe(false);
		expect(isSafeNextPath("//evil.com/path")).toBe(false);
	});

	it("rejects backslash tricks browsers normalize to an external host", () => {
		// searchParams.get() decodes %5C → "\", so these are the post-decode values.
		expect(isSafeNextPath("/\\evil.com")).toBe(false);
		expect(isSafeNextPath("/\\/evil.com")).toBe(false);
		expect(isSafeNextPath("/a\\b")).toBe(false);
	});

	it("rejects control-char splices (tab / newline / CR)", () => {
		expect(isSafeNextPath("/\t/evil.com")).toBe(false);
		expect(isSafeNextPath("/\n/evil.com")).toBe(false);
		expect(isSafeNextPath("/\r/evil.com")).toBe(false);
		expect(isSafeNextPath("/\x00evil")).toBe(false);
	});
});
