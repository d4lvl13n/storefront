import { notFound } from "next/navigation";
import { type ReactNode } from "react";
import { executePublicGraphQL } from "@/lib/graphql";
import { ChannelsListDocument } from "@/gql/graphql";
import { DefaultChannelSlug } from "@/app/config";

/**
 * Channel allowlist used by the runtime layout to reject unknown channel
 * slugs. Mirrors the env-driven middleware allowlist — kept hardcoded here
 * rather than read async from Saleor so the check is synchronous and
 * doesn't add a per-request GraphQL roundtrip.
 *
 * Multi-channel deployments should extend this set (or convert to a
 * cached upstream lookup) — single-channel today.
 */
const VALID_CHANNELS = new Set([DefaultChannelSlug, "default-channel"].filter(Boolean) as string[]);

/**
 * Generate static params for channel routes.
 *
 * Uses NEXT_PUBLIC_DEFAULT_CHANNEL as the primary channel.
 * Optionally discovers additional channels via SALEOR_APP_TOKEN (for multi-channel builds).
 */
export const generateStaticParams = async () => {
	const channels: string[] = [];

	// 1. Add default channel (required)
	if (DefaultChannelSlug) {
		channels.push(DefaultChannelSlug);
	}

	// 2. Optionally discover additional channels via API (for multi-channel setups)
	if (process.env.SALEOR_APP_TOKEN) {
		const result = await executePublicGraphQL(ChannelsListDocument, {
			headers: {
				Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}`,
			},
		});

		if (result.ok && result.data.channels) {
			const activeChannelSlugs = result.data.channels.filter((ch) => ch.isActive).map((ch) => ch.slug);

			// Add channels not already in the list
			for (const slug of activeChannelSlugs) {
				if (!channels.includes(slug)) {
					channels.push(slug);
				}
			}
		} else if (!result.ok) {
			console.warn("[Channels] Failed to fetch additional channels from API:", result.error.message);
		}
	}

	// Return channels (or empty if none configured - will show setup page)
	if (channels.length === 0) {
		console.warn("[Channels] No channels configured. Set NEXT_PUBLIC_DEFAULT_CHANNEL.");
		return [];
	}

	return channels.map((channel) => ({ channel }));
};

export default async function ChannelLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ channel: string }>;
}) {
	// Defense-in-depth against ghost pages: middleware canonicalizes unknown
	// first-segments to /<DEFAULT_CHANNEL>/<rest>, but if the matcher excludes
	// a path (static-file-looking) middleware never runs. The layout enforces
	// the same allowlist at render time, returning 404 for any channel slug
	// that isn't real (e.g. `/sample-coa.pdf/peptide-calculator` rendering as
	// channel="sample-coa.pdf"). May 22 2026 audit confirmed the failure mode.
	const { channel } = await params;
	if (!VALID_CHANNELS.has(channel)) {
		notFound();
	}

	return children;
}
