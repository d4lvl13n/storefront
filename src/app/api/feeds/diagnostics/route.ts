import { NextRequest, NextResponse } from "next/server";
import { isDiagnosticsAuthorized } from "@/lib/feeds/auth";
import {
	FEED_METADATA_KEYS,
	fetchNormalizedCatalogItems,
	getCatalogFeedOptions,
	validateGoogleCatalogItems,
	validateKlaviyoCatalogItems,
} from "@/lib/feeds/catalog";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
	"Cache-Control": "no-store",
	"X-Robots-Tag": "noindex, nofollow",
} as const;

export async function GET(request: NextRequest) {
	const authorized = isDiagnosticsAuthorized({
		authorization: request.headers.get("authorization"),
		queryToken: request.nextUrl.searchParams.get("token"),
	});

	if (!authorized) {
		// Fail closed and indistinguishable from a missing route so unauthenticated
		// scanners cannot confirm this endpoint exists.
		return new NextResponse("Not found", {
			status: 404,
			headers: NO_STORE_HEADERS,
		});
	}

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
				headers: NO_STORE_HEADERS,
			},
		);
	} catch (error) {
		console.error("[feeds/diagnostics] Failed to build diagnostics:", error);

		return NextResponse.json(
			{ error: "Unable to build feed diagnostics" },
			{
				status: 502,
				headers: NO_STORE_HEADERS,
			},
		);
	}
}
