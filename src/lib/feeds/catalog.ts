export const FEED_METADATA_KEYS = {
	isMarketableForGmc: "is_marketable_for_gmc",
	gmcTitle: "gmc_title",
	gmcDescription: "gmc_description",
	gmcProductType: "gmc_product_type",
	googleCategoryId: "google_category_id",
	gmcExclusionReason: "gmc_exclusion_reason",
	klaviyoTitle: "klaviyo_title",
	brand: "brand",
} as const;

export type FeedItemIdSource = "variant_id" | "sku";
export type FeedAvailability = "in_stock" | "out_of_stock";
export type FeedExclusionTarget = "google" | "klaviyo";

export interface MoneyAmount {
	amount: number;
	currency: string;
}

export interface CatalogFeedOptions {
	channel: string;
	storefrontUrl: string;
	brandName: string;
	itemIdSource: FeedItemIdSource;
	pageSize?: number;
}

export interface NormalizedCatalogItem {
	itemId: string;
	productId: string;
	variantId: string;
	itemGroupId: string;
	sku: string | null;
	productName: string;
	variantName: string;
	googleTitle: string | null;
	googleDescription: string | null;
	googleProductType: string | null;
	googleProductCategory: string | null;
	klaviyoTitle: string;
	klaviyoDescription: string;
	link: string;
	imageLink: string | null;
	additionalImageLinks: string[];
	price: MoneyAmount | null;
	availability: FeedAvailability;
	quantityAvailable: number;
	inventoryPolicy: 1 | 2;
	categoryName: string | null;
	brand: string;
	isMarketableForGmc: boolean;
	gmcExclusionReason: string | null;
}

export interface FeedExclusion {
	target: FeedExclusionTarget;
	itemId: string | null;
	productId: string;
	variantId: string;
	sku: string | null;
	productName: string;
	variantName: string;
	reason: string;
	detail: string;
}

export interface FeedValidationResult<T> {
	items: T[];
	exclusions: FeedExclusion[];
}

interface MetadataItem {
	key: string;
	value: string;
}

interface SaleorFeedMoney {
	gross: MoneyAmount | null;
}

interface SaleorFeedMedia {
	url: string;
	alt: string | null;
	type: string | null;
}

interface SaleorFeedCategory {
	id: string;
	name: string;
	slug: string;
	googleCategoryId: string | null;
	metadata: MetadataItem[];
}

interface SaleorFeedProduct {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	seoDescription: string | null;
	seoTitle: string | null;
	metadata: MetadataItem[];
	thumbnail: { url: string; alt: string | null } | null;
	media: SaleorFeedMedia[] | null;
	category: SaleorFeedCategory | null;
}

interface SaleorFeedVariant {
	id: string;
	name: string;
	sku: string | null;
	quantityAvailable: number | null;
	trackInventory: boolean;
	metadata: MetadataItem[];
	media: SaleorFeedMedia[] | null;
	pricing: {
		price: SaleorFeedMoney | null;
		priceUndiscounted: SaleorFeedMoney | null;
	} | null;
	product: SaleorFeedProduct;
}

interface SaleorFeedResponse {
	productVariants: {
		pageInfo: {
			hasNextPage: boolean;
			endCursor: string | null;
		};
		edges: { node: SaleorFeedVariant }[];
	} | null;
}

type FeedGraphQLResult<T> = { ok: true; data: T } | { ok: false; error: string };

const FEED_PRODUCT_VARIANTS_QUERY = /* GraphQL */ `
	query FeedProductVariants($channel: String!, $first: Int!, $after: String) {
		productVariants(
			first: $first
			after: $after
			channel: $channel
			sortBy: { field: LAST_MODIFIED_AT, direction: ASC }
		) {
			pageInfo {
				hasNextPage
				endCursor
			}
			edges {
				node {
					id
					name
					sku
					quantityAvailable
					trackInventory
					metadata {
						key
						value
					}
					pricing {
						price {
							gross {
								amount
								currency
							}
						}
						priceUndiscounted {
							gross {
								amount
								currency
							}
						}
					}
					media {
						url(size: 1024, format: WEBP)
						alt
						type
					}
					product {
						id
						name
						slug
						description
						seoDescription
						seoTitle
						metadata {
							key
							value
						}
						thumbnail(size: 1024, format: WEBP) {
							url
							alt
						}
						media {
							url(size: 1024, format: WEBP)
							alt
							type
						}
						category {
							id
							name
							slug
							googleCategoryId: metafield(key: "google_category_id")
							metadata {
								key
								value
							}
						}
					}
				}
			}
		}
	}
`;

export function normalizeItemIdSource(value: string | undefined): FeedItemIdSource {
	if (value === "sku") {
		return "sku";
	}

	return "variant_id";
}

export function getCatalogFeedOptions(): CatalogFeedOptions {
	return {
		channel: process.env.FEED_CHANNEL || process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "default-channel",
		storefrontUrl:
			process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000",
		brandName: process.env.FEED_BRAND_NAME || "InfinityBio",
		itemIdSource: normalizeItemIdSource(process.env.FEED_ITEM_ID_SOURCE),
	};
}

const FEED_GRAPHQL_TIMEOUT_MS_DEFAULT = 15_000;
const FEED_MAX_PAGES_DEFAULT = 200;
const FEED_CACHE_TTL_MS_DEFAULT = 15 * 60 * 1000;
const FEED_STALE_TTL_MS_DEFAULT = 60 * 60 * 1000;
const FEED_LOG_BODY_MAX_LEN = 500;

interface FeedCacheEntry {
	items: NormalizedCatalogItem[];
	expiresAt: number;
}

const feedCache = new Map<string, FeedCacheEntry>();
const feedInflight = new Map<string, Promise<NormalizedCatalogItem[]>>();

function readPositiveIntEnv(name: string, fallback: number): number {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function fetchNormalizedCatalogItems(
	options: CatalogFeedOptions = getCatalogFeedOptions(),
): Promise<NormalizedCatalogItem[]> {
	const pageSize = options.pageSize ?? 100;
	const maxPages = readPositiveIntEnv("FEED_MAX_PAGES", FEED_MAX_PAGES_DEFAULT);
	let after: string | null = null;
	const variants: SaleorFeedVariant[] = [];
	let pagesFetched = 0;

	do {
		if (pagesFetched >= maxPages) {
			throw new Error(`Feed pagination exceeded the limit of ${maxPages} pages (pageSize=${pageSize}).`);
		}

		const result: FeedGraphQLResult<SaleorFeedResponse> = await executeFeedGraphQL<SaleorFeedResponse>({
			query: FEED_PRODUCT_VARIANTS_QUERY,
			variables: {
				channel: options.channel,
				first: pageSize,
				after,
			},
		});

		if (!result.ok) {
			throw new Error(`Failed to fetch Saleor feed variants: ${result.error}`);
		}

		const connection: SaleorFeedResponse["productVariants"] = result.data.productVariants;

		if (!connection) {
			break;
		}

		variants.push(...connection.edges.map((edge: { node: SaleorFeedVariant }) => edge.node));
		if (connection.pageInfo.hasNextPage && !connection.pageInfo.endCursor) {
			throw new Error("Saleor feed pagination returned hasNextPage=true without an endCursor.");
		}
		after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
		pagesFetched += 1;
	} while (after);

	return normalizeSaleorVariants(variants, options);
}

export async function getCachedNormalizedCatalogItems(
	options: CatalogFeedOptions = getCatalogFeedOptions(),
): Promise<NormalizedCatalogItem[]> {
	const ttl = readPositiveIntEnv("FEED_CACHE_TTL_MS", FEED_CACHE_TTL_MS_DEFAULT);
	const staleTtl = readPositiveIntEnv("FEED_STALE_TTL_MS", FEED_STALE_TTL_MS_DEFAULT);
	const key = JSON.stringify(options);
	const now = Date.now();
	const cached = feedCache.get(key);

	if (cached && cached.expiresAt > now) {
		return cached.items;
	}

	const existing = feedInflight.get(key);
	if (existing) {
		return existing;
	}

	const fetchPromise = (async () => {
		try {
			const items = await fetchNormalizedCatalogItems(options);
			feedCache.set(key, { items, expiresAt: Date.now() + ttl });
			return items;
		} catch (error) {
			const stale = feedCache.get(key);
			if (stale && stale.expiresAt + staleTtl > Date.now()) {
				console.warn(
					`[feeds] Serving stale catalog (${stale.items.length} items) after refresh failure:`,
					error instanceof Error ? error.message : String(error),
				);
				return stale.items;
			}
			throw error;
		} finally {
			feedInflight.delete(key);
		}
	})();

	feedInflight.set(key, fetchPromise);
	return fetchPromise;
}

export function __resetFeedCacheForTests(): void {
	feedCache.clear();
	feedInflight.clear();
}

async function executeFeedGraphQL<T>(input: {
	query: string;
	variables: Record<string, unknown>;
}): Promise<FeedGraphQLResult<T>> {
	const url = process.env.SALEOR_API_URL || process.env.NEXT_PUBLIC_SALEOR_API_URL;

	if (!url) {
		return { ok: false, error: "Missing SALEOR_API_URL or NEXT_PUBLIC_SALEOR_API_URL env variable" };
	}

	const timeoutMs = readPositiveIntEnv("FEED_GRAPHQL_TIMEOUT_MS", FEED_GRAPHQL_TIMEOUT_MS_DEFAULT);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
			cache: "no-store",
			signal: controller.signal,
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			return {
				ok: false,
				error: `HTTP ${response.status}: ${response.statusText}\n${truncateForLog(body)}`,
			};
		}

		const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

		if (body.errors?.length) {
			return { ok: false, error: body.errors.map((error) => error.message).join("\n") };
		}

		if (!body.data) {
			return { ok: false, error: "Missing data in Saleor feed response" };
		}

		return { ok: true, data: body.data };
	} catch (error) {
		if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
			return { ok: false, error: `Saleor feed request timed out after ${timeoutMs}ms` };
		}
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, error: truncateForLog(message) };
	} finally {
		clearTimeout(timer);
	}
}

function truncateForLog(value: string): string {
	if (value.length <= FEED_LOG_BODY_MAX_LEN) {
		return value;
	}
	return `${value.slice(0, FEED_LOG_BODY_MAX_LEN)}...[truncated ${
		value.length - FEED_LOG_BODY_MAX_LEN
	} chars]`;
}

export function normalizeSaleorVariants(
	variants: SaleorFeedVariant[],
	options: CatalogFeedOptions,
): NormalizedCatalogItem[] {
	return variants.map((variant) => normalizeSaleorVariant(variant, options));
}

function normalizeSaleorVariant(
	variant: SaleorFeedVariant,
	options: CatalogFeedOptions,
): NormalizedCatalogItem {
	const product = variant.product;
	const category = product.category;
	const itemId = resolveItemId(variant, options.itemIdSource);
	const metadata = new MetadataScope(variant.metadata, product.metadata, category?.metadata ?? []);
	const productDescription = plainTextFromEditorJs(product.description);
	const fallbackDescription = product.seoDescription || productDescription || product.name;
	const variantSuffix = getVariantSuffix(variant.name, product.name);
	const imageLinks = getImageLinks(variant, product);
	const price = variant.pricing?.price?.gross ?? null;
	const quantityAvailable = Math.max(variant.quantityAvailable ?? 0, 0);
	const googleTitle = appendVariantSuffix(metadata.first(FEED_METADATA_KEYS.gmcTitle), variantSuffix, 150);
	const klaviyoBaseTitle = metadata.first(FEED_METADATA_KEYS.klaviyoTitle) || product.name;

	return {
		itemId,
		productId: product.id,
		variantId: variant.id,
		itemGroupId: product.id,
		sku: variant.sku?.trim() || null,
		productName: product.name,
		variantName: variant.name,
		googleTitle,
		googleDescription: limitText(metadata.first(FEED_METADATA_KEYS.gmcDescription), 5000),
		googleProductType: metadata.first(FEED_METADATA_KEYS.gmcProductType) || category?.name || null,
		googleProductCategory:
			metadata.first(FEED_METADATA_KEYS.googleCategoryId) || category?.googleCategoryId || null,
		klaviyoTitle: appendVariantSuffix(klaviyoBaseTitle, variantSuffix, 255) || product.name,
		klaviyoDescription: limitText(fallbackDescription, 5000) || "n/a",
		link: buildProductUrl(options.storefrontUrl, options.channel, product.slug, variant.id),
		imageLink: imageLinks[0] ?? null,
		additionalImageLinks: imageLinks.slice(1, 11),
		price,
		availability: quantityAvailable > 0 ? "in_stock" : "out_of_stock",
		quantityAvailable,
		inventoryPolicy: quantityAvailable > 0 ? 1 : 2,
		categoryName: category?.name ?? null,
		brand: metadata.first(FEED_METADATA_KEYS.brand) || options.brandName,
		isMarketableForGmc: parseBoolean(metadata.first(FEED_METADATA_KEYS.isMarketableForGmc)),
		gmcExclusionReason: metadata.first(FEED_METADATA_KEYS.gmcExclusionReason),
	};
}

export function buildProductUrl(
	storefrontUrl: string,
	channel: string,
	productSlug: string,
	variantId: string,
): string {
	const base = storefrontUrl.endsWith("/") ? storefrontUrl : `${storefrontUrl}/`;
	const url = new URL(`${encodeURIComponent(channel)}/products/${encodeURIComponent(productSlug)}`, base);
	url.searchParams.set("variant", variantId);
	return url.toString();
}

export function validateGoogleCatalogItems(
	items: NormalizedCatalogItem[],
): FeedValidationResult<NormalizedCatalogItem> {
	const included: NormalizedCatalogItem[] = [];
	const exclusions: FeedExclusion[] = [];

	for (const item of items) {
		const exclusion = getGoogleExclusion(item);

		if (exclusion) {
			exclusions.push(toExclusion("google", item, exclusion.reason, exclusion.detail));
			continue;
		}

		included.push(item);
	}

	return { items: included, exclusions };
}

export function validateKlaviyoCatalogItems(
	items: NormalizedCatalogItem[],
): FeedValidationResult<NormalizedCatalogItem> {
	const included: NormalizedCatalogItem[] = [];
	const exclusions: FeedExclusion[] = [];

	for (const item of items) {
		const exclusion = getKlaviyoExclusion(item);

		if (exclusion) {
			exclusions.push(toExclusion("klaviyo", item, exclusion.reason, exclusion.detail));
			continue;
		}

		included.push(item);
	}

	return { items: included, exclusions };
}

function resolveItemId(variant: SaleorFeedVariant, itemIdSource: FeedItemIdSource): string {
	if (itemIdSource === "sku") {
		return variant.sku?.trim() ?? "";
	}

	return variant.id;
}

function getImageLinks(variant: SaleorFeedVariant, product: SaleorFeedProduct): string[] {
	const urls = [
		...(variant.media ?? []).filter((media) => media.type === "IMAGE").map((media) => media.url),
		...(product.media ?? []).filter((media) => media.type === "IMAGE").map((media) => media.url),
		product.thumbnail?.url,
	].filter((url): url is string => Boolean(url));

	return [...new Set(urls)];
}

function getVariantSuffix(variantName: string, productName: string): string | null {
	const normalizedVariant = variantName.trim();

	if (!normalizedVariant) {
		return null;
	}

	const lower = normalizedVariant.toLowerCase();

	if (lower === "default variant" || lower === "default" || lower === productName.trim().toLowerCase()) {
		return null;
	}

	return normalizedVariant;
}

function appendVariantSuffix(title: string | null, suffix: string | null, maxLength: number): string | null {
	if (!title) {
		return null;
	}

	const normalizedTitle = normalizeWhitespace(title);

	if (!suffix || normalizedTitle.toLowerCase().includes(suffix.toLowerCase())) {
		return limitText(normalizedTitle, maxLength);
	}

	return limitText(`${normalizedTitle} - ${suffix}`, maxLength);
}

function limitText(value: string | null | undefined, maxLength: number): string | null {
	const normalized = normalizeWhitespace(value);

	if (!normalized) {
		return null;
	}

	if (normalized.length <= maxLength) {
		return normalized;
	}

	return normalized.slice(0, maxLength).trim();
}

function normalizeWhitespace(value: string | null | undefined): string {
	return stripHtml(value ?? "")
		.replace(/\s+/g, " ")
		.trim();
}

function stripHtml(value: string): string {
	return value.replace(/<[^>]*>/g, " ");
}

function plainTextFromEditorJs(value: string | null): string | null {
	if (!value) {
		return null;
	}

	try {
		const parsed = JSON.parse(value) as {
			blocks?: Array<{
				type?: string;
				data?: {
					text?: string;
					caption?: string;
					items?: string[];
				};
			}>;
		};

		const text = parsed.blocks
			?.flatMap((block) => [block.data?.text, block.data?.caption, ...(block.data?.items ?? [])])
			.filter((part): part is string => Boolean(part))
			.join(" ");

		return normalizeWhitespace(text);
	} catch {
		return normalizeWhitespace(value);
	}
}

function parseBoolean(value: string | null): boolean {
	if (!value) {
		return false;
	}

	return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
}

function getGoogleExclusion(item: NormalizedCatalogItem): { reason: string; detail: string } | null {
	if (!item.isMarketableForGmc) {
		return {
			reason: "not_marketable_for_gmc",
			detail: item.gmcExclusionReason || "Set is_marketable_for_gmc=true to include this item.",
		};
	}

	if (!item.itemId) {
		return { reason: "missing_item_id", detail: "No stable item ID is available." };
	}

	if (item.itemId.length > 50) {
		return { reason: "item_id_too_long", detail: "Google Merchant item IDs must be 50 characters or fewer." };
	}

	if (!item.googleTitle) {
		return {
			reason: "missing_gmc_title",
			detail: "Set gmc_title metadata before exporting this item to Google Merchant Center.",
		};
	}

	if (!item.googleDescription) {
		return {
			reason: "missing_gmc_description",
			detail: "Set gmc_description metadata before exporting this item to Google Merchant Center.",
		};
	}

	if (!isHttpUrl(item.link)) {
		return { reason: "invalid_link", detail: "The product landing page URL must be http or https." };
	}

	if (!item.imageLink || !isSafePublicMediaUrl(item.imageLink)) {
		return {
			reason: "invalid_image_link",
			detail: "The item needs a public HTTPS image URL on a non-private host.",
		};
	}

	if (!item.price || !Number.isFinite(item.price.amount) || !item.price.currency) {
		return { reason: "missing_price", detail: "The item needs a valid price and currency." };
	}

	return null;
}

function getKlaviyoExclusion(item: NormalizedCatalogItem): { reason: string; detail: string } | null {
	if (!item.itemId) {
		return { reason: "missing_item_id", detail: "No stable item ID is available." };
	}

	if (!item.klaviyoTitle) {
		return { reason: "missing_title", detail: "Klaviyo catalog items require a title." };
	}

	if (!item.klaviyoDescription) {
		return { reason: "missing_description", detail: "Klaviyo catalog items require a description." };
	}

	if (!isHttpUrl(item.link)) {
		return { reason: "invalid_link", detail: "Klaviyo catalog items require a public product URL." };
	}

	if (!item.imageLink || !isSafePublicMediaUrl(item.imageLink)) {
		return {
			reason: "invalid_image_link",
			detail: "Klaviyo catalog image_link must be a public HTTPS URL on a non-private host.",
		};
	}

	return null;
}

function toExclusion(
	target: FeedExclusionTarget,
	item: NormalizedCatalogItem,
	reason: string,
	detail: string,
): FeedExclusion {
	return {
		target,
		itemId: item.itemId || null,
		productId: item.productId,
		variantId: item.variantId,
		sku: item.sku,
		productName: item.productName,
		variantName: item.variantName,
		reason,
		detail,
	};
}

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function isSafePublicMediaUrl(value: string | null | undefined): boolean {
	if (!value) return false;

	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return false;
	}

	if (parsed.protocol !== "https:") return false;

	const host = parsed.hostname.toLowerCase();
	if (!host) return false;
	if (host === "localhost" || host.endsWith(".localhost")) return false;

	// IPv6 literal or any host containing a colon (e.g. bare IPv6) — refuse for simplicity.
	if (host.startsWith("[") || host.includes(":")) return false;

	if (isPrivateIpv4(host)) return false;

	return true;
}

function isPrivateIpv4(host: string): boolean {
	if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return false;
	const parts = host.split(".").map((p) => Number.parseInt(p, 10));
	if (parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) return true;
	const [a, b] = parts;
	if (a === 0) return true; // 0.0.0.0/8
	if (a === 10) return true; // 10.0.0.0/8
	if (a === 127) return true; // loopback
	if (a === 169 && b === 254) return true; // link-local
	if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
	if (a === 192 && b === 168) return true; // 192.168.0.0/16
	if (a === 192 && b === 0 && parts[2] === 2) return true; // TEST-NET-1
	if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
	if (a === 198 && b === 51 && parts[2] === 100) return true; // TEST-NET-2
	if (a === 203 && b === 0 && parts[2] === 113) return true; // TEST-NET-3
	if (a >= 224) return true; // multicast/reserved
	return false;
}

class MetadataScope {
	private readonly maps: Array<Map<string, string>>;

	constructor(
		variantMetadata: MetadataItem[],
		productMetadata: MetadataItem[],
		categoryMetadata: MetadataItem[],
	) {
		this.maps = [variantMetadata, productMetadata, categoryMetadata].map(
			(items) => new Map(items.map((item) => [item.key, item.value])),
		);
	}

	first(key: string): string | null {
		for (const map of this.maps) {
			const value = map.get(key)?.trim();

			if (value) {
				return value;
			}
		}

		return null;
	}
}
