import { describe, it, expect } from "vitest";

import { isSafeNextPath, isAllowedRedirectUrl } from "./safe-next";

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

describe("isAllowedRedirectUrl", () => {
	const origin = "https://www.infinitybiolabs.com";

	it("accepts an absolute URL on the same origin as the request", () => {
		expect(isAllowedRedirectUrl(`${origin}/us-us/login?mode=confirm`, origin)).toBe(true);
		expect(isAllowedRedirectUrl(`${origin}/us-us/login`, origin)).toBe(true);
	});

	it("rejects a URL on a different origin", () => {
		expect(isAllowedRedirectUrl("https://evil.example/steal", origin)).toBe(false);
		// host-confusion attempt
		expect(isAllowedRedirectUrl(`https://evil.example/${origin}`, origin)).toBe(false);
	});

	it("rejects non-absolute / malformed values", () => {
		expect(isAllowedRedirectUrl("/us-us/login", origin)).toBe(false);
		expect(isAllowedRedirectUrl("//evil.example", origin)).toBe(false);
		expect(isAllowedRedirectUrl("not a url", origin)).toBe(false);
		expect(isAllowedRedirectUrl(null, origin)).toBe(false);
	});

	it("rejects a foreign origin when there is no request origin to match against", () => {
		expect(isAllowedRedirectUrl("https://some-random-origin.test/x", null)).toBe(false);
	});
});
