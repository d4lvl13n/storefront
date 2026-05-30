import { BookOpenText, ExternalLink, ArrowRight } from "lucide-react";
import { searchPubmed } from "@/lib/pubmed/client";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { PdpSection } from "./pdp-section";

const CARD_COUNT = 4;

/**
 * "What the science says" — server-rendered PubMed evidence for the compound.
 *
 * Replaces the embedded search box: shows the study count + a few clickable
 * study cards (→ PubMed) and a "See more research" button that opens the
 * Research Library already queried for this compound. Async + cached (1h via
 * the PubMed client), so it streams in its own Suspense boundary on the PDP.
 * Returns null on error / no results, so the section self-hides.
 */
export async function WhatScienceSays({ query }: { query: string }) {
	const res = await searchPubmed({ query, limit: CARD_COUNT + 2, recent: false }).catch(
		() => ({ ok: false }) as const,
	);

	if (!res.ok || res.results.length === 0) return null;

	const articles = res.results.slice(0, CARD_COUNT);
	const seeMoreHref = `/research-library?q=${encodeURIComponent(query)}`;

	return (
		<PdpSection id="research" label="The evidence" title="What the science says">
			<p className="mx-auto -mt-6 mb-10 max-w-2xl text-center text-base text-muted-foreground sm:-mt-8">
				<span className="font-semibold text-foreground">{res.total.toLocaleString("en")}</span> peer-reviewed{" "}
				{res.total === 1 ? "study references" : "studies reference"}{" "}
				<span className="text-foreground">{query}</span> on PubMed.
			</p>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{articles.map((article) => (
					<a
						key={article.pmid}
						href={article.pubmedUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="bg-card/50 group flex flex-col rounded-2xl border border-border p-5 transition-colors hover:border-emerald-500/30"
					>
						<div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
							<BookOpenText className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
							<span className="truncate text-emerald-400">{article.journal}</span>
							{article.year && <span className="shrink-0">· {article.year}</span>}
						</div>

						<h3 className="line-clamp-4 flex-1 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-emerald-300">
							{article.title}
						</h3>

						<span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
							View on PubMed
							<ExternalLink className="h-3 w-3" />
						</span>
					</a>
				))}
			</div>

			<div className="mt-10 text-center">
				<LinkWithChannel
					href={seeMoreHref}
					className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
				>
					See more research
					<ArrowRight className="h-4 w-4" />
				</LinkWithChannel>
			</div>
		</PdpSection>
	);
}
