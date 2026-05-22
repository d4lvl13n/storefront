import { type MetadataRoute } from "next";
import { getBaseUrl, seoConfig } from "@/lib/seo";

function buildDisallowPaths() {
	const disallow = seoConfig.noIndexPaths.flatMap((path) => {
		if (path.startsWith("/api/")) {
			return [path];
		}

		return [path, `/*${path}`];
	});

	return [...new Set(disallow)];
}

export default function robots(): MetadataRoute.Robots {
	const base = getBaseUrl().replace(/\/$/, "");
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: buildDisallowPaths(),
			},
		],
		// Advertise the sitemap so crawlers can discover it without manual
		// submission. Manual submission in Search Console / Bing Webmaster
		// Tools is still recommended for faster initial pickup.
		sitemap: `${base}/sitemap.xml`,
		host: base,
	};
}
