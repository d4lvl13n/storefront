import {
	type FeedExclusion,
	type NormalizedCatalogItem,
	validateKlaviyoCatalogItems,
} from "@/lib/feeds/catalog";

export interface KlaviyoFeedItem {
	id: string;
	title: string;
	link: string;
	image_link: string;
	description: string;
	price: number;
	categories: string[];
	inventory_quantity: number;
	inventory_policy: 1 | 2;
	product_id: string;
	variant_id: string;
	sku: string | null;
	brand: string;
}

export interface KlaviyoFeedBuildResult {
	items: KlaviyoFeedItem[];
	exclusions: FeedExclusion[];
}

export function buildKlaviyoCatalogFeed(items: NormalizedCatalogItem[]): KlaviyoFeedBuildResult {
	const validated = validateKlaviyoCatalogItems(items);

	return {
		items: validated.items.map(toKlaviyoFeedItem),
		exclusions: validated.exclusions,
	};
}

function toKlaviyoFeedItem(item: NormalizedCatalogItem): KlaviyoFeedItem {
	return {
		id: item.itemId,
		title: item.klaviyoTitle,
		link: item.link,
		image_link: item.imageLink ?? "",
		description: item.klaviyoDescription,
		price: item.price?.amount ?? 0,
		categories: unique(
			[item.categoryName, item.googleProductType].filter((value): value is string => Boolean(value)),
		),
		inventory_quantity: item.quantityAvailable,
		inventory_policy: item.inventoryPolicy,
		product_id: item.productId,
		variant_id: item.variantId,
		sku: item.sku,
		brand: item.brand,
	};
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}
