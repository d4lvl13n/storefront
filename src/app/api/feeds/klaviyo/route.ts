import { NextResponse } from "next/server";
import { fetchNormalizedCatalogItems } from "@/lib/feeds/catalog";
import { buildKlaviyoCatalogFeed } from "@/lib/feeds/klaviyo";

export const dynamic = "force-dynamic";

const FEED_CACHE_CONTROL = "public, max-age=900, s-maxage=900, stale-while-revalidate=3600";

export async function GET() {
	try {
		const catalogItems = await fetchNormalizedCatalogItems();
		const feed = buildKlaviyoCatalogFeed(catalogItems);

		return NextResponse.json(feed.items, {
			headers: {
				"Cache-Control": FEED_CACHE_CONTROL,
				"X-Feed-Items": String(feed.items.length),
				"X-Feed-Excluded": String(feed.exclusions.length),
			},
		});
	} catch (error) {
		console.error("[feeds/klaviyo] Failed to build feed:", error);

		return NextResponse.json(
			{ error: "Unable to build Klaviyo catalog feed" },
			{
				status: 502,
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	}
}
