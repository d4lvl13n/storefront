import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDiagnosticsAuthorized } from "@/lib/feeds/auth";
import {
	FEED_METADATA_KEYS,
	type CatalogFeedOptions,
	__resetFeedCacheForTests,
	fetchNormalizedCatalogItems,
	getCachedNormalizedCatalogItems,
	isSafePublicMediaUrl,
	normalizeSaleorVariants,
	validateGoogleCatalogItems,
	validateKlaviyoCatalogItems,
} from "@/lib/feeds/catalog";
import { buildGoogleMerchantFeed, escapeXml } from "@/lib/feeds/google";
import { buildKlaviyoCatalogFeed } from "@/lib/feeds/klaviyo";

type SaleorVariantFixture = Parameters<typeof normalizeSaleorVariants>[0][number];

const options: CatalogFeedOptions = {
	channel: "us-us",
	storefrontUrl: "https://infinitybiolabs.com",
	brandName: "InfinityBio",
	itemIdSource: "variant_id",
};

function makeVariant(metadata: Array<{ key: string; value: string }> = []): SaleorVariantFixture {
	return {
		id: "UHJvZHVjdFZhcmlhbnQ6MTAw",
		name: "5mg",
		sku: "BPC-157-5MG",
		quantityAvailable: 12,
		trackInventory: true,
		metadata: [],
		pricing: {
			price: {
				gross: {
					amount: 49,
					currency: "USD",
				},
			},
			priceUndiscounted: null,
		},
		media: [],
		product: {
			id: "UHJvZHVjdDox",
			name: "BPC-157 5mg",
			slug: "bpc-157-5mg",
			description: JSON.stringify({
				blocks: [{ type: "paragraph", data: { text: "Website research peptide copy." } }],
			}),
			seoDescription: "Website SEO description.",
			seoTitle: null,
			metadata,
			thumbnail: {
				url: "https://media.example.com/bpc-157.webp",
				alt: "BPC-157 vial",
			},
			media: [],
			category: {
				id: "Q2F0ZWdvcnk6MQ==",
				name: "Research Peptides",
				slug: "research-peptides",
				googleCategoryId: "499676",
				metadata: [],
			},
		},
	};
}

describe("catalog feed normalization", () => {
	it("keeps Google Merchant feed fail-closed by default", () => {
		const [item] = normalizeSaleorVariants([makeVariant()], options);
		const google = validateGoogleCatalogItems([item]);

		expect(item.isMarketableForGmc).toBe(false);
		expect(google.items).toHaveLength(0);
		expect(google.exclusions[0]?.reason).toBe("not_marketable_for_gmc");
	});

	it("uses GMC metadata overrides without changing the Klaviyo/site title", () => {
		const [item] = normalizeSaleorVariants(
			[
				makeVariant([
					{ key: FEED_METADATA_KEYS.isMarketableForGmc, value: "true" },
					{ key: FEED_METADATA_KEYS.gmcTitle, value: "Research Peptide Reference Material" },
					{
						key: FEED_METADATA_KEYS.gmcDescription,
						value: "Laboratory reference material for qualified research use.",
					},
					{ key: FEED_METADATA_KEYS.gmcProductType, value: "Research Reagents > Reference Materials" },
				]),
			],
			options,
		);

		expect(item.googleTitle).toBe("Research Peptide Reference Material - 5mg");
		expect(item.klaviyoTitle).toBe("BPC-157 5mg");
		expect(validateGoogleCatalogItems([item]).items).toHaveLength(1);
	});

	it("excludes GMC-marketable items until safe GMC copy exists", () => {
		const [item] = normalizeSaleorVariants(
			[makeVariant([{ key: FEED_METADATA_KEYS.isMarketableForGmc, value: "true" }])],
			options,
		);
		const google = validateGoogleCatalogItems([item]);

		expect(google.items).toHaveLength(0);
		expect(google.exclusions[0]?.reason).toBe("missing_gmc_title");
	});

	it("requires HTTPS image links for Klaviyo catalog items", () => {
		const [item] = normalizeSaleorVariants([makeVariant()], {
			...options,
			storefrontUrl: "https://infinitybiolabs.com",
		});
		const klaviyo = validateKlaviyoCatalogItems([
			{ ...item, imageLink: "http://media.example.com/image.webp" },
		]);

		expect(klaviyo.items).toHaveLength(0);
		expect(klaviyo.exclusions[0]?.reason).toBe("invalid_image_link");
	});
});

describe("feed builders", () => {
	it("emits Google Merchant XML with required fields", () => {
		const [item] = normalizeSaleorVariants(
			[
				makeVariant([
					{ key: FEED_METADATA_KEYS.isMarketableForGmc, value: "true" },
					{ key: FEED_METADATA_KEYS.gmcTitle, value: "Research & Reference Material" },
					{ key: FEED_METADATA_KEYS.gmcDescription, value: "Lab-only reference material." },
				]),
			],
			options,
		);
		const feed = buildGoogleMerchantFeed([item], "https://infinitybiolabs.com/api/feeds/google");

		expect(feed.exclusions).toHaveLength(0);
		expect(feed.xml).toContain("<g:id>UHJvZHVjdFZhcmlhbnQ6MTAw</g:id>");
		expect(feed.xml).toContain("<g:title>Research &amp; Reference Material - 5mg</g:title>");
		expect(feed.xml).toContain("<g:price>49.00 USD</g:price>");
		expect(feed.xml).toContain("<g:condition>new</g:condition>");
	});

	it("emits a flat Klaviyo JSON item shape", () => {
		const [item] = normalizeSaleorVariants([makeVariant()], options);
		const feed = buildKlaviyoCatalogFeed([item]);

		expect(feed.exclusions).toHaveLength(0);
		expect(feed.items[0]).toMatchObject({
			id: "UHJvZHVjdFZhcmlhbnQ6MTAw",
			title: "BPC-157 5mg",
			link: "https://infinitybiolabs.com/us-us/products/bpc-157-5mg?variant=UHJvZHVjdFZhcmlhbnQ6MTAw",
			image_link: "https://media.example.com/bpc-157.webp",
			price: 49,
			inventory_quantity: 12,
			inventory_policy: 1,
		});
	});
});

describe("isSafePublicMediaUrl", () => {
	it.each(["https://media.example.com/x.webp", "https://cdn.infinitybiolabs.com/p/123.jpg"])(
		"accepts public HTTPS URL %s",
		(url) => {
			expect(isSafePublicMediaUrl(url)).toBe(true);
		},
	);

	it.each([
		["http://media.example.com/x.webp", "plain http"],
		["https://localhost/x.webp", "localhost"],
		["https://api.localhost/x.webp", "*.localhost"],
		["https://127.0.0.1/x.webp", "loopback"],
		["https://10.0.0.5/x.webp", "10/8"],
		["https://172.16.0.1/x.webp", "172.16/12"],
		["https://172.31.255.254/x.webp", "172.31 edge"],
		["https://192.168.1.1/x.webp", "192.168/16"],
		["https://169.254.169.254/meta", "AWS metadata link-local"],
		["https://224.0.0.1/x.webp", "multicast"],
		["https://[::1]/x.webp", "IPv6 literal"],
		["https://0.0.0.0/x.webp", "0.0.0.0"],
		["not a url", "garbage"],
		["", "empty"],
	])("rejects %s (%s)", (url) => {
		expect(isSafePublicMediaUrl(url)).toBe(false);
	});

	it("rejects non-string inputs", () => {
		expect(isSafePublicMediaUrl(null)).toBe(false);
		expect(isSafePublicMediaUrl(undefined)).toBe(false);
	});

	it("excludes Google items whose image_link is http (was accepted pre-hardening)", () => {
		const [item] = normalizeSaleorVariants(
			[
				makeVariant([
					{ key: FEED_METADATA_KEYS.isMarketableForGmc, value: "true" },
					{ key: FEED_METADATA_KEYS.gmcTitle, value: "Reference Material" },
					{ key: FEED_METADATA_KEYS.gmcDescription, value: "Lab only." },
				]),
			],
			options,
		);
		const google = validateGoogleCatalogItems([{ ...item, imageLink: "http://media.example.com/x.webp" }]);
		expect(google.items).toHaveLength(0);
		expect(google.exclusions[0]?.reason).toBe("invalid_image_link");
	});

	it("excludes items whose image points at a private IP", () => {
		const [item] = normalizeSaleorVariants([makeVariant()], options);
		const klaviyo = validateKlaviyoCatalogItems([{ ...item, imageLink: "https://192.168.1.5/x.webp" }]);
		expect(klaviyo.items).toHaveLength(0);
		expect(klaviyo.exclusions[0]?.reason).toBe("invalid_image_link");
	});
});

describe("escapeXml hardening", () => {
	it("strips XML 1.0 invalid control characters before escaping", () => {
		expect(escapeXml("hello\x00world\x07!")).toBe("helloworld!");
		expect(escapeXml("line1\x01line2")).toBe("line1line2");
	});

	it("preserves the legal whitespace controls (\\t, \\n, \\r)", () => {
		expect(escapeXml("a\tb\nc\rd")).toBe("a\tb\nc\rd");
	});

	it("still escapes XML metacharacters", () => {
		expect(escapeXml(`<tag attr="x" alt='y'>&</tag>`)).toBe(
			"&lt;tag attr=&quot;x&quot; alt=&apos;y&apos;&gt;&amp;&lt;/tag&gt;",
		);
	});

	it("produces a feed free of control characters even when metadata is hostile", () => {
		const [item] = normalizeSaleorVariants(
			[
				makeVariant([
					{ key: FEED_METADATA_KEYS.isMarketableForGmc, value: "true" },
					{ key: FEED_METADATA_KEYS.gmcTitle, value: "Title\x00 with bell\x07 char" },
					{ key: FEED_METADATA_KEYS.gmcDescription, value: "Lab \x01 only" },
				]),
			],
			options,
		);
		const feed = buildGoogleMerchantFeed([item], "https://infinitybiolabs.com/api/feeds/google");
		expect(feed.xml).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
		expect(feed.xml).toContain("Title with bell char");
	});
});

describe("isDiagnosticsAuthorized", () => {
	const ORIGINAL_TOKEN = process.env.FEED_DIAGNOSTICS_TOKEN;

	afterEach(() => {
		if (ORIGINAL_TOKEN === undefined) {
			delete process.env.FEED_DIAGNOSTICS_TOKEN;
		} else {
			process.env.FEED_DIAGNOSTICS_TOKEN = ORIGINAL_TOKEN;
		}
	});

	it("denies when no token is configured even with a header", () => {
		delete process.env.FEED_DIAGNOSTICS_TOKEN;
		expect(isDiagnosticsAuthorized({ authorization: "Bearer anything", queryToken: "anything" })).toBe(false);
	});

	it("accepts the correct token via Authorization header", () => {
		process.env.FEED_DIAGNOSTICS_TOKEN = "s3cret-token-value";
		expect(isDiagnosticsAuthorized({ authorization: "Bearer s3cret-token-value", queryToken: null })).toBe(
			true,
		);
		expect(isDiagnosticsAuthorized({ authorization: "bearer s3cret-token-value", queryToken: null })).toBe(
			true,
		);
	});

	it("accepts the correct token via ?token query param", () => {
		process.env.FEED_DIAGNOSTICS_TOKEN = "s3cret-token-value";
		expect(isDiagnosticsAuthorized({ authorization: null, queryToken: "s3cret-token-value" })).toBe(true);
	});

	it("rejects an incorrect token", () => {
		process.env.FEED_DIAGNOSTICS_TOKEN = "s3cret-token-value";
		expect(isDiagnosticsAuthorized({ authorization: "Bearer wrong", queryToken: null })).toBe(false);
		expect(isDiagnosticsAuthorized({ authorization: null, queryToken: "wrong" })).toBe(false);
	});

	it("rejects when no credential is supplied", () => {
		process.env.FEED_DIAGNOSTICS_TOKEN = "s3cret-token-value";
		expect(isDiagnosticsAuthorized({ authorization: null, queryToken: null })).toBe(false);
		expect(isDiagnosticsAuthorized({ authorization: "Basic abc", queryToken: null })).toBe(false);
	});
});

describe("catalog feed fetch hardening", () => {
	const ORIGINAL_FETCH = globalThis.fetch;
	const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	const ORIGINAL_SERVER_URL = process.env.SALEOR_API_URL;

	beforeEach(() => {
		__resetFeedCacheForTests();
		process.env.NEXT_PUBLIC_SALEOR_API_URL = "https://saleor.test/graphql/";
		delete process.env.SALEOR_API_URL;
	});

	afterEach(() => {
		globalThis.fetch = ORIGINAL_FETCH;
		if (ORIGINAL_API_URL === undefined) {
			delete process.env.NEXT_PUBLIC_SALEOR_API_URL;
		} else {
			process.env.NEXT_PUBLIC_SALEOR_API_URL = ORIGINAL_API_URL;
		}
		if (ORIGINAL_SERVER_URL === undefined) {
			delete process.env.SALEOR_API_URL;
		} else {
			process.env.SALEOR_API_URL = ORIGINAL_SERVER_URL;
		}
		vi.useRealTimers();
	});

	function emptyPageResponse() {
		return new Response(
			JSON.stringify({
				data: { productVariants: { pageInfo: { hasNextPage: false, endCursor: null }, edges: [] } },
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	}

	it("coalesces concurrent requests into a single Saleor fetch (single-flight)", async () => {
		const fetchMock = vi.fn(async () => emptyPageResponse());
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

		const [a, b, c] = await Promise.all([
			getCachedNormalizedCatalogItems(options),
			getCachedNormalizedCatalogItems(options),
			getCachedNormalizedCatalogItems(options),
		]);

		expect(a).toEqual([]);
		expect(b).toEqual([]);
		expect(c).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("serves the cached snapshot within the TTL", async () => {
		const fetchMock = vi.fn(async () => emptyPageResponse());
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

		await getCachedNormalizedCatalogItems(options);
		await getCachedNormalizedCatalogItems(options);
		await getCachedNormalizedCatalogItems(options);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("falls back to the stale snapshot if a refresh fails within the stale window", async () => {
		process.env.FEED_CACHE_TTL_MS = "1";
		process.env.FEED_STALE_TTL_MS = "60000";

		let call = 0;
		const fetchMock = vi.fn(async () => {
			call += 1;
			if (call === 1) return emptyPageResponse();
			throw new Error("Saleor exploded");
		});
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

		const first = await getCachedNormalizedCatalogItems(options);
		expect(first).toEqual([]);

		await new Promise((resolve) => setTimeout(resolve, 5)); // exceed 1ms TTL

		const second = await getCachedNormalizedCatalogItems(options);
		expect(second).toEqual([]);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		delete process.env.FEED_CACHE_TTL_MS;
		delete process.env.FEED_STALE_TTL_MS;
	});

	it("aborts a hung Saleor request after FEED_GRAPHQL_TIMEOUT_MS", async () => {
		process.env.FEED_GRAPHQL_TIMEOUT_MS = "20";

		const fetchMock = vi.fn(
			(_url: string, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						const abortError = new Error("aborted");
						abortError.name = "AbortError";
						reject(abortError);
					});
				}),
		);
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

		await expect(fetchNormalizedCatalogItems(options)).rejects.toThrow(/timed out after 20ms/);

		delete process.env.FEED_GRAPHQL_TIMEOUT_MS;
	});

	it("throws when paginated pages exceed FEED_MAX_PAGES", async () => {
		process.env.FEED_MAX_PAGES = "2";

		const fetchMock = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						data: {
							productVariants: {
								pageInfo: { hasNextPage: true, endCursor: "cursor" },
								edges: [],
							},
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
		);
		globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

		await expect(fetchNormalizedCatalogItems(options)).rejects.toThrow(/exceeded the limit of 2 pages/);

		delete process.env.FEED_MAX_PAGES;
	});
});
