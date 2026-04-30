import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

export async function generateMetadata(props: { params: Promise<{ channel: string }> }): Promise<Metadata> {
	const { channel } = await props.params;
	return buildPageMetadata({
		title: "Research Library — Peer-Reviewed Peptide Literature",
		description:
			"A curated library of peer-reviewed PubMed publications covering research peptides and biotech compounds. Designed for doctors, scientists and researchers. Coming soon.",
		url: `/${channel}/research-library`,
	});
}

const previewTopics = [
	{ label: "GLP-1 receptor agonists", count: "Pharmacology · Clinical reviews" },
	{ label: "Growth hormone secretagogues", count: "Endocrinology · Mechanism studies" },
	{ label: "Cytoprotective peptides", count: "Cell biology · Tissue protection" },
	{ label: "Melanocortin receptor modulators", count: "Pharmacology · Receptor biology" },
	{ label: "Thymic peptides", count: "Immunology · Reference standards" },
	{ label: "Copper peptide complexes", count: "Biochemistry · Protein binding" },
];

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
				{/* Ambient orbs (matches Science & Quality + Newsletter sections) */}
				<div className="pointer-events-none absolute inset-0">
					<div className="bg-emerald-500/8 absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full blur-[150px]" />
					<div className="bg-teal-500/6 absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full blur-[150px]" />
				</div>

				<div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32">
					{/* Eyebrow */}
					<p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
						Coming soon
					</p>

					{/* Headline */}
					<h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
						Research Library
						<br />
						<span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
							built on peer-reviewed science
						</span>
					</h1>

					{/* Lede */}
					<p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
						A curated index of peer-reviewed PubMed publications on research peptides and biotech compounds —
						for doctors, principal investigators and graduate researchers building protocols on rigorous
						primary literature.
					</p>

					{/* Preview cards */}
					<div className="mt-12">
						<p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-emerald-400">
							What you&rsquo;ll find at launch
						</p>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{previewTopics.map((topic) => (
								<div
									key={topic.label}
									className="bg-card/60 rounded-xl border border-border p-4 backdrop-blur-sm"
								>
									<p className="text-sm font-semibold text-foreground">{topic.label}</p>
									<p className="mt-1 text-xs text-muted-foreground">{topic.count}</p>
								</div>
							))}
						</div>
					</div>

					{/* What to expect */}
					<div className="bg-card/40 mt-14 grid gap-6 rounded-2xl border border-border p-8 sm:grid-cols-3">
						<div>
							<p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">Curated</p>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								Hand-picked PubMed citations grouped by mechanism class. No SEO chaff.
							</p>
						</div>
						<div>
							<p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">Source-linked</p>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								Every entry links straight to the PubMed abstract or DOI — no paywalled pre-prints.
							</p>
						</div>
						<div>
							<p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">Searchable</p>
							<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
								Live PubMed E-utilities search arrives in v2 — for now, browse by mechanism class.
							</p>
						</div>
					</div>

					{/* Notify CTA + secondary actions */}
					<div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
						<LinkWithChannel
							href="/contact"
							className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-500 px-6 text-sm font-semibold text-foreground transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25"
						>
							Notify me when it launches
						</LinkWithChannel>
						<LinkWithChannel
							href="/peptide-calculator"
							className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-medium text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
						>
							Try the peptide calculator instead
							<svg
								className="h-3.5 w-3.5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</LinkWithChannel>
					</div>

					{/* RUO note */}
					<p className="mt-10 max-w-2xl text-xs leading-relaxed text-muted-foreground">
						Citations published in this library reference primary literature for in-vitro research context
						only. InfinityBio Labs products are sold for research use only and not for human or veterinary
						therapeutic application.{" "}
						<Link
							href={`/${channel}/ruo-policy`}
							className="underline underline-offset-2 hover:text-foreground"
						>
							Read our RUO policy
						</Link>
						.
					</p>
				</div>
			</section>
		</>
	);
}
