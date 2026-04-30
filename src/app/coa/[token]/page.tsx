import { redirect, notFound } from "next/navigation";

import { DefaultChannelSlug } from "@/app/config";
import { normalizeToken } from "@/lib/coa/token";

/**
 * Canonical QR-target route.
 *
 * Printed QR codes encode `https://infinitybiolabs.com/coa/<token>` (no
 * channel slug) so the same physical label still works if we ever add or
 * rename channels. This handler temporarily redirects into the channel-scoped
 * verification page.
 *
 * **Why 307 (temporary), not 308 (permanent):** if we ever change the default
 * channel slug, browsers that cached a 308 would continue serving the old
 * target indefinitely. 307 lets us re-route printed QR codes by changing one
 * env var.
 *
 * - Invalid token → 404 (no existence leak).
 * - Default channel not configured → 404 (catches deploy-time misconfig).
 */
export default async function CoaRootRedirect(props: { params: Promise<{ token: string }> }) {
	const { token: rawToken } = await props.params;
	const canonical = normalizeToken(rawToken);
	if (!canonical) notFound();

	if (!DefaultChannelSlug) {
		// Better to surface a 404 than silently redirect to /undefined/coa/...
		console.error("[coa] DefaultChannelSlug is not configured; cannot redirect /coa/<token>");
		notFound();
	}

	redirect(`/${DefaultChannelSlug}/coa/${canonical}`);
}
