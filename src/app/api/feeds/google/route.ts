import { NextRequest, NextResponse } from "next/server";
import { getCachedNormalizedCatalogItems, getCatalogFeedOptions } from "@/lib/feeds/catalog";
import { buildGoogleMerchantFeed } from "@/lib/feeds/google";

export const dynamic = "force-dynamic";

const FEED_CACHE_CONTROL = "public, max-age=900, s-maxage=900, stale-while-revalidate=3600";

export async function GET(request: NextRequest) {
	try {
		const options = getCatalogFeedOptions();
		const catalogItems = await getCachedNormalizedCatalogItems(options);
		const feedUrl = buildPublicFeedUrl(options.storefrontUrl, request.url);
		const feed = buildGoogleMerchantFeed(catalogItems, feedUrl);

		return new NextResponse(feed.xml, {
			headers: {
				"Content-Type": "application/xml; charset=utf-8",
				"Cache-Control": FEED_CACHE_CONTROL,
				"X-Feed-Items": String(feed.items.length),
				"X-Feed-Excluded": String(feed.exclusions.length),
			},
		});
	} catch (error) {
		console.error("[feeds/google] Failed to build feed:", error);

		return NextResponse.json(
			{ error: "Unable to build Google Merchant feed" },
			{
				status: 502,
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	}
}

function buildPublicFeedUrl(storefrontUrl: string, fallbackUrl: string): string {
	try {
		return new URL("/api/feeds/google", storefrontUrl).toString();
	} catch {
		return fallbackUrl;
	}
}
