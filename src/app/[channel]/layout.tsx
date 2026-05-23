import { notFound } from "next/navigation";
import { cache } from "react";
import { type ReactNode } from "react";
import { executePublicGraphQL } from "@/lib/graphql";
import { ChannelsListDocument } from "@/gql/graphql";
import { DefaultChannelSlug } from "@/app/config";

/**
 * Fetch the set of active channel slugs from Saleor — the source of truth.
 *
 * Cached for 1 hour at the GraphQL fetch layer (channels change rarely).
 * Wrapped in React `cache()` so multiple call sites in one render tree
 * dedupe to a single fetch per request.
 *
 * Saleor's `channels` query is permissioned (AUTHENTICATED_APP), so this
 * requires SALEOR_APP_TOKEN at runtime. If the token is missing or Saleor
 * is unreachable, we degrade gracefully to {DefaultChannelSlug} rather
 * than 404 the whole site — but log loudly so the infra issue surfaces.
 */
const CHANNEL_LIST_REVALIDATE_SECONDS = 3600;

const getActiveChannelSlugs = cache(async (): Promise<Set<string>> => {
	const fallback = (): Set<string> => (DefaultChannelSlug ? new Set([DefaultChannelSlug]) : new Set());

	if (!process.env.SALEOR_APP_TOKEN) {
		console.warn(
			"[ChannelLayout] SALEOR_APP_TOKEN not set — falling back to NEXT_PUBLIC_DEFAULT_CHANNEL " +
				"for channel validation. This is acceptable for single-channel deployments but means " +
				"new Saleor channels won't be auto-discovered at runtime.",
		);
		return fallback();
	}

	const result = await executePublicGraphQL(ChannelsListDocument, {
		headers: { Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}` },
		revalidate: CHANNEL_LIST_REVALIDATE_SECONDS,
	});

	if (!result.ok) {
		console.warn(
			"[ChannelLayout] Saleor channels query failed — using DefaultChannelSlug fallback:",
			result.error.message,
		);
		return fallback();
	}

	if (!result.data.channels || result.data.channels.length === 0) {
		console.warn("[ChannelLayout] Saleor returned no channels — using DefaultChannelSlug fallback.");
		return fallback();
	}

	return new Set(result.data.channels.filter((ch) => ch.isActive).map((ch) => ch.slug));
});

/**
 * Generate static params for channel routes.
 *
 * Mirrors the runtime allowlist by reading the same Saleor channels query.
 */
export const generateStaticParams = async () => {
	const slugs = await getActiveChannelSlugs();

	if (slugs.size === 0) {
		console.warn("[Channels] No channels configured. Set NEXT_PUBLIC_DEFAULT_CHANNEL.");
		return [];
	}

	return Array.from(slugs).map((channel) => ({ channel }));
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
	// the Saleor-sourced channel allowlist at render time, returning 404 for
	// any slug Saleor doesn't recognize (e.g. `/sample-coa.pdf/peptide-calculator`
	// rendering as channel="sample-coa.pdf"). May 22 2026 audit failure mode.
	const { channel } = await params;
	const validChannels = await getActiveChannelSlugs();
	if (!validChannels.has(channel)) {
		notFound();
	}

	return children;
}
