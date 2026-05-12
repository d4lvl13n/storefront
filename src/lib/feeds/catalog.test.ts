import { describe, expect, it } from "vitest";
import {
	FEED_METADATA_KEYS,
	type CatalogFeedOptions,
	normalizeSaleorVariants,
	validateGoogleCatalogItems,
	validateKlaviyoCatalogItems,
} from "@/lib/feeds/catalog";
import { buildGoogleMerchantFeed } from "@/lib/feeds/google";
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
