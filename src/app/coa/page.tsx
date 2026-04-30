import { redirect, notFound } from "next/navigation";

import { DefaultChannelSlug } from "@/app/config";

/**
 * Bare `/coa` (no channel, no token) handler.
 *
 * Without this, hitting `https://infinitybiolabs.com/coa` would route into
 * `[channel]/page.tsx` with `channel="coa"`, which Saleor doesn't know about,
 * yielding an empty channel page. We redirect to the channel-scoped manual
 * entry form instead.
 */
export default async function CoaRootLanding() {
	if (!DefaultChannelSlug) {
		console.error("[coa] DefaultChannelSlug is not configured; cannot redirect /coa");
		notFound();
	}
	redirect(`/${DefaultChannelSlug}/coa`);
}
