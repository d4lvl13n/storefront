import {
	type FeedExclusion,
	type NormalizedCatalogItem,
	validateGoogleCatalogItems,
} from "@/lib/feeds/catalog";

export interface GoogleFeedBuildResult {
	xml: string;
	items: NormalizedCatalogItem[];
	exclusions: FeedExclusion[];
}

export function buildGoogleMerchantFeed(
	items: NormalizedCatalogItem[],
	feedUrl: string,
): GoogleFeedBuildResult {
	const validated = validateGoogleCatalogItems(items);
	const now = new Date().toISOString();
	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
		"<channel>",
		"<title>InfinityBio Google Merchant Feed</title>",
		`<link>${escapeXml(feedUrl)}</link>`,
		`<description>Generated ${escapeXml(now)}</description>`,
		...validated.items.map(renderGoogleItem),
		"</channel>",
		"</rss>",
	].join("");

	return {
		xml,
		items: validated.items,
		exclusions: validated.exclusions,
	};
}

function renderGoogleItem(item: NormalizedCatalogItem): string {
	const parts = [
		"<item>",
		tag("g:id", item.itemId),
		tag("g:item_group_id", item.itemGroupId),
		tag("g:title", item.googleTitle),
		tag("g:description", item.googleDescription),
		tag("g:link", item.link),
		tag("g:image_link", item.imageLink),
		...item.additionalImageLinks.map((url) => tag("g:additional_image_link", url)),
		tag("g:availability", item.availability),
		tag("g:price", formatGooglePrice(item)),
		tag("g:condition", "new"),
		tag("g:brand", item.brand),
		tag("g:mpn", item.sku ?? item.itemId),
		tag("g:product_type", item.googleProductType),
		tag("g:google_product_category", item.googleProductCategory),
		"</item>",
	];

	return parts.filter(Boolean).join("");
}

function formatGooglePrice(item: NormalizedCatalogItem): string | null {
	if (!item.price) {
		return null;
	}

	return `${item.price.amount.toFixed(2)} ${item.price.currency}`;
}

function tag(name: string, value: string | number | null | undefined): string {
	if (value === null || value === undefined || value === "") {
		return "";
	}

	return `<${name}>${escapeXml(String(value))}</${name}>`;
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
