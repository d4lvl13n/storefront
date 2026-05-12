import { NextResponse } from "next/server";
import {
	FEED_METADATA_KEYS,
	fetchNormalizedCatalogItems,
	getCatalogFeedOptions,
	validateGoogleCatalogItems,
	validateKlaviyoCatalogItems,
} from "@/lib/feeds/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const options = getCatalogFeedOptions();
		const catalogItems = await fetchNormalizedCatalogItems(options);
		const google = validateGoogleCatalogItems(catalogItems);
		const klaviyo = validateKlaviyoCatalogItems(catalogItems);

		return NextResponse.json(
			{
				generatedAt: new Date().toISOString(),
				options: {
					channel: options.channel,
					storefrontUrl: options.storefrontUrl,
					brandName: options.brandName,
					itemIdSource: options.itemIdSource,
				},
				metadataContract: FEED_METADATA_KEYS,
				totals: {
					sourceItems: catalogItems.length,
					googleIncluded: google.items.length,
					googleExcluded: google.exclusions.length,
					klaviyoIncluded: klaviyo.items.length,
					klaviyoExcluded: klaviyo.exclusions.length,
				},
				google: {
					exclusions: google.exclusions,
				},
				klaviyo: {
					exclusions: klaviyo.exclusions,
				},
			},
			{
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		console.error("[feeds/diagnostics] Failed to build diagnostics:", error);

		return NextResponse.json(
			{ error: "Unable to build feed diagnostics" },
			{
				status: 502,
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	}
}
