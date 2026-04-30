import type { Metadata } from "next";

import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { ResearchSearch } from "./research-search";

export async function generateMetadata(props: { params: Promise<{ channel: string }> }): Promise<Metadata> {
	const { channel } = await props.params;
	return buildPageMetadata({
		title: "Research Library — Peer-Reviewed Peptide Literature",
		description:
			"Search PubMed for peer-reviewed publications on research peptides and biotech compounds. Built for doctors, scientists, and researchers building protocols on rigorous primary literature.",
		url: `/${channel}/research-library`,
	});
}

export default async function ResearchLibraryPage(props: { params: Promise<{ channel: string }> }) {
	const { channel } = await props.params;

	const breadcrumbJsonLd = buildBreadcrumbJsonLd([
		{ label: "Home", href: `/${channel}` },
		{ label: "Research Library", href: `/${channel}/research-library` },
	]);

	return (
		<>
			{breadcrumbJsonLd && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
				/>
			)}

			<section className="relative overflow-hidden bg-background text-foreground">
				{/* Ambient orbs (matches the rest of the site) */}
				<div className="pointer-events-none absolute inset-0">
					<div className="bg-emerald-500/8 absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full blur-[150px]" />
					<div className="bg-teal-500/6 absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full blur-[150px]" />
				</div>

				<div className="relative mx-auto max-w-4xl px-6 py-20 sm:py-24">
					{/* Header */}
					<div className="mb-10">
						<p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
							Research Library
						</p>
						<h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
							Peer-reviewed
							<br />
							<span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
								peptide literature
							</span>
						</h1>
						<p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
							Search the National Library of Medicine&rsquo;s PubMed index directly. No filters, no opinions —
							just the primary literature you&rsquo;d cite in a protocol.
						</p>
					</div>

					{/* Live search */}
					<ResearchSearch />

					{/* Footer note */}
					<div className="mt-14 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
						<p>
							PubMed is a trademark of the U.S. National Library of Medicine. We surface citations and link
							out to original sources; we do not host or paraphrase full-text content.
						</p>
						<p className="mt-2">
							Citations are for in-vitro research context only.{" "}
							<LinkWithChannel
								href="/ruo-policy"
								className="underline underline-offset-2 hover:text-foreground"
							>
								Read our RUO policy
							</LinkWithChannel>
							.
						</p>
					</div>
				</div>
			</section>
		</>
	);
}
