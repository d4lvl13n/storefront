import Image from "next/image";
import {
	ProductListByCollectionDocument,
	CategoriesListDocument,
	ProductOrderField,
	OrderDirection,
} from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { ProductTabs } from "./product-tabs";
import { HowOrderingWorks } from "@/ui/components/how-ordering-works";
import { VerifiedStoryCard } from "@/ui/components/verified-story-card";
import { ShopGoalCard } from "@/ui/components/shop-goal-card";
import { NewsletterForm } from "@/ui/components/newsletter-form";
import { HeroScrollIndicator } from "@/ui/components/hero-scroll-indicator";

export const metadata = {
	title: "InfinityBio Labs — Pharmaceutical-Grade Research Peptides",
	description:
		"Premium research peptides and biotech compounds. HPLC-verified 99%+ purity, third-party tested with COA. Trusted by researchers worldwide. Fast shipping.",
};

// ─── Data Fetchers ──────────────────────────────────────────

async function getFeaturedProducts(channel: string) {
	const result = await executePublicGraphQL(ProductListByCollectionDocument, {
		variables: {
			slug: "featured-products",
			channel,
			first: 8,
			sortBy: { field: ProductOrderField.Collection, direction: OrderDirection.Asc },
		},
		revalidate: 300,
	});

	if (!result.ok) return [];
	return result.data.collection?.products?.edges.map(({ node }) => node) ?? [];
}

async function getBestSellers(channel: string) {
	const result = await executePublicGraphQL(ProductListByCollectionDocument, {
		variables: {
			slug: "best-sellers",
			channel,
			first: 8,
			sortBy: { field: ProductOrderField.Collection, direction: OrderDirection.Asc },
		},
		revalidate: 300,
	});

	if (!result.ok) return [];
	return result.data.collection?.products?.edges.map(({ node }) => node) ?? [];
}

/**
 * Top-level mechanism Categories for the homepage "Browse by Mechanism" grid.
 *
 * Note: we deliberately query Categories (taxonomy — "what the compound is")
 * rather than Collections (merchandising — "what it's for"). Category-based
 * navigation carries zero structure/function-claim signal and matches how
 * research-reagent suppliers (Sigma, Bachem, Cayman) organise their catalogs.
 * See Frier Levitt Peptide Guidance Memorandum, Section III.B.a.
 */
async function getTopCategories() {
	const result = await executePublicGraphQL(CategoriesListDocument, {
		variables: { first: 30 },
		revalidate: 3600,
	});

	if (!result.ok) return [];
	return result.data.categories?.edges.map(({ node }) => node) ?? [];
}

// ─── Icon Components (inline SVG for zero bundle cost) ──────

function IconShield({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
			/>
		</svg>
	);
}

function IconFlask({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M5 14.5l-.94.94a1.5 1.5 0 00-.22 1.927l2.3 3.45A1.5 1.5 0 007.39 21.5h9.22a1.5 1.5 0 001.25-.683l2.3-3.45a1.5 1.5 0 00-.22-1.927L19.8 15.3M5 14.5h14.8"
			/>
		</svg>
	);
}

function IconTruck({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
			/>
		</svg>
	);
}

function IconCertificate({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
			/>
		</svg>
	);
}

function IconMolecule({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<circle cx="12" cy="7" r="2.5" />
			<circle cx="7" cy="17" r="2.5" />
			<circle cx="17" cy="17" r="2.5" />
			<path strokeLinecap="round" d="M10.5 9.5l-2 5M13.5 9.5l2 5M9.5 17h5" />
		</svg>
	);
}

function IconLock({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
			/>
		</svg>
	);
}

/**
 * Mechanism-class descriptions for research-catalog Categories.
 *
 * Descriptions intentionally avoid structure/function language (per Frier Levitt
 * Peptide Guidance Memorandum, April 2026). All copy describes the chemical class
 * or receptor target and ends in a research-framed phrase. Do NOT re-introduce
 * benefit language ("supports", "enhances", "promotes", "recovery", "longevity",
 * "weight", "growth", "healing", "immunity", "libido", etc.) — that is the FDA
 * "intended use" evidence pattern cited in Warrior Labz and Summit Research.
 *
 * If a category slug is returned by Saleor but not mapped here, render the
 * category's own Saleor description (falls through in the component) rather
 * than guessing via keyword heuristics.
 */
const categoryDescriptions: Record<string, string> = {
	"glp-1-receptor-agonists":
		"Glucagon-like peptide-1 receptor agonist reference compounds for in-vitro research on incretin signalling.",
	"growth-hormone-secretagogues":
		"Research-grade ghrelin receptor agonists and GHRH analogues for in-vitro studies of somatotropic axis signalling.",
	"growth-hormone-derivatives":
		"Growth hormone fragment and derivative reference standards for in-vitro research on somatotropic signalling.",
	"growth-factors":
		"IGF-family and related growth-factor reference peptides for in-vitro cell-culture research.",
	"cytoprotective-peptides":
		"Synthetic peptide reference standards used in in-vitro studies of cellular protection and tissue-culture models.",
	"thymic-peptides": "Thymus-derived peptide reference standards for in-vitro immunology research.",
	"melanocortin-receptor-modulators":
		"Reference peptides targeting melanocortin MC1R / MC3R / MC4R receptors for in-vitro pharmacology research.",
	"copper-peptide-complexes":
		"Glycyl-L-histidyl-L-lysine copper complexes. Reference standards for non-injectable in-vitro research applications only.",
	"mitochondrial-peptides":
		"Mitochondrial-encoded peptide reference standards (MOTS-c family, humanin family) for in-vitro bioenergetics research.",
	"pineal-peptides":
		"Pineal-derived peptide reference compounds for in-vitro chronobiology and cellular-pathway research.",
	"nootropic-peptides":
		"Short-chain neuropeptide reference standards used in in-vitro neurochemistry research.",
	"antimicrobial-peptides":
		"Cathelicidin, defensin and related host-defence peptide reference standards for in-vitro microbiology research.",
	neuropeptides:
		"Neuropeptide reference standards for in-vitro neurochemistry and receptor-pharmacology research.",
	"reproductive-hormones":
		"Reproductive and gonadotropic peptide reference standards for in-vitro endocrinology research.",
	"research-small-molecules":
		"Non-peptide reference compounds (small molecules, cofactors, glycosaminoglycans) used in in-vitro biochemistry research.",
	"reference-peptides-miscellaneous":
		"Reference research peptides of heterogeneous mechanism. Individual product descriptions specify each compound's biochemical target.",
	"peptide-blends": "Multi-peptide reference preparations used in in-vitro comparative research protocols.",
	"cosmetic-injectables": "Injectable-form reference compounds used in in-vitro cosmetic-science research.",
	"metabolic-injectables":
		"Injectable-form reference compounds used in in-vitro metabolism and nutritional-biochemistry research.",
	supplies: "Laboratory consumables and reconstitution solvents for in-vitro protocols.",
};

function getCategoryDescription(slug: string) {
	return categoryDescriptions[slug];
}

// ─── Trust Items ────────────────────────────────────────────

const trustItems = [
	{ label: "HPLC Purity Verified", icon: IconShield },
	{ label: "Third-Party Lab Tested", icon: IconFlask },
	{ label: "Free Shipping Over $150", icon: IconTruck },
	{ label: "Certificate of Analysis", icon: IconCertificate },
	{ label: "Secure Encrypted Checkout", icon: IconLock },
	{ label: "Same-Day Processing", icon: IconMolecule },
];

// ─── Quality Pillars ────────────────────────────────────────

const qualityPillars = [
	{
		title: "≥99% Purity (HPLC)",
		stat: "≥99%",
		description:
			"Each batch analyzed via High‑Performance Liquid Chromatography. Lots below our threshold are rejected.",
	},
	{
		title: "Third‑Party Lab Verification",
		stat: "100%",
		description:
			"Independent accredited laboratories verify identity (mass spectrometry), purity and endotoxin levels for every lot.",
	},
	{
		title: "Low Endotoxin Levels",
		stat: "<0.5 EU/mg",
		description: "Endotoxin levels kept below 0.5 EU/mg, suitable for a wide range of in‑vitro applications.",
	},
	{
		title: "Cold‑Chain Logistics",
		stat: "2-8°C",
		description: "Temperature‑controlled packaging ensures compound stability from our facility to your lab.",
	},
];

// ─── Stats ──────────────────────────────────────────────────

const statsData = [
	{ value: "73+", label: "Research Compounds" },
	{ value: "99%+", label: "Purity Standard" },
	{ value: "48h", label: "Order Processing" },
	{ value: "100%", label: "Batch Tested" },
];

// ─── Testimonials ────────────────────────────────────────────
// TODO: Replace with real, attributable reviews before enabling
// TestimonialsSection in <Page>. Do NOT ship placeholder quotes as
// real social proof — see launch review notes.
const testimonials: {
	quote: string;
	author: string;
	role: string;
	rating: number;
}[] = [];

// ─── Institution Logos ───────────────────────────────────────
// TODO: Replace with logos for institutions that have given written
// permission to be listed. Do NOT ship unverified university names.
const institutions: string[] = [];

// ════════════════════════════════════════════════════════════
// SECTIONS
// ════════════════════════════════════════════════════════════

// ─── 1. Hero (full-bleed background image) ──────────────────

function HeroSection() {
	return (
		<section className="noise-overlay relative -mt-16 flex min-h-[90vh] items-center overflow-hidden bg-background pt-16">
			{/* Full-bleed background image */}
			<Image src="/hero-2.webp" alt="" fill priority className="object-cover object-center" />

			{/* Gradient overlay for text readability */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"linear-gradient(to right, var(--background) 0%, color-mix(in oklch, var(--background) 80%, transparent) 50%, color-mix(in oklch, var(--background) 60%, transparent) 100%)",
				}}
			/>
			<div
				className="absolute inset-0"
				style={{ backgroundColor: "color-mix(in oklch, var(--background) 40%, transparent)" }}
			/>

			{/* Gradient orbs */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[120px]" />
				<div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-teal-500/15 blur-[120px]" />
				<div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-green-500/10 blur-[100px]" />
			</div>

			{/* Subtle grid */}
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage:
						"linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
					backgroundSize: "60px 60px",
				}}
			/>

			<div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-20">
				<div className="max-w-2xl">
					<p className="mb-6 animate-fade-in text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground opacity-0">
						Pharmaceutical-Grade Research Peptides
					</p>
					<h1 className="animate-fade-in-up text-3xl font-bold leading-[1.05] tracking-tight text-foreground opacity-0 sm:text-5xl md:text-6xl lg:text-7xl">
						The Science
						<br />
						<span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
							of Purity
						</span>
					</h1>
					<p className="mt-6 max-w-xl animate-fade-in-up-delay-1 text-base leading-relaxed text-foreground opacity-0 sm:mt-8 sm:text-lg">
						HPLC-verified, 99%+ purity research peptides and biotech compounds. Every batch independently
						tested. Every order documented with a Certificate of Analysis.
					</p>

					{/* CTAs */}
					<div className="mt-10 flex animate-fade-in-up-delay-2 flex-col gap-4 opacity-0 sm:flex-row sm:items-center">
						<LinkWithChannel
							href="/products"
							className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 text-sm font-semibold text-foreground transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 sm:px-8"
						>
							Explore Compounds
							<svg
								className="h-4 w-4 transition-transform group-hover:translate-x-1"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</LinkWithChannel>
						<a
							href="#browse-by-mechanism"
							className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:border-muted-foreground hover:text-foreground sm:px-8"
						>
							Browse by Mechanism
						</a>
					</div>

					{/* Hero stats */}
					<dl className="mt-10 flex animate-fade-in-up-delay-2 flex-wrap gap-6 opacity-0 sm:mt-12 sm:gap-8 lg:gap-12">
						{statsData.map((stat) => (
							<div key={stat.label}>
								<dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									{stat.label}
								</dt>
								<dd className="mt-1 font-mono text-xl font-bold text-emerald-400 sm:text-2xl">
									{stat.value}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</div>

			{/* Scroll indicator (fades out on first scroll) */}
			<HeroScrollIndicator />
		</section>
	);
}

// ─── 2. Trust Bar ───────────────────────────────────────────

function TrustBar() {
	const items = [...trustItems, ...trustItems];
	return (
		<div className="overflow-hidden border-y border-border bg-card py-4">
			<div className="flex w-max animate-marquee">
				{items.map((item, i) => {
					const Icon = item.icon;
					return (
						<span
							key={i}
							className="mx-8 inline-flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground"
						>
							<Icon className="h-3.5 w-3.5 text-emerald-500/70" />
							{item.label}
						</span>
					);
				})}
			</div>
		</div>
	);
}

// ─── 3. Science & Quality (moved up — strongest differentiator) ──

function ScienceQualitySection() {
	return (
		<section
			className="noise-overlay relative overflow-hidden bg-background text-foreground"
			aria-label="Quality Assurance"
		>
			{/* Background */}
			<div className="pointer-events-none absolute inset-0">
				<div className="bg-emerald-500/8 absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full blur-[150px]" />
				<div className="bg-teal-500/6 absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full blur-[150px]" />
			</div>
			{/* Grid overlay */}
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.02]"
				style={{
					backgroundImage:
						"linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
					backgroundSize: "40px 40px",
				}}
			/>

			<div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:py-28">
				{/* Header */}
				<div className="mb-12 text-center sm:mb-14">
					<p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
						Quality Assurance
					</p>
					<h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
						Every Compound Tells
						<br />
						<span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
							a Verified Story
						</span>
					</h2>
					<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
						From synthesis to your lab bench, every compound undergoes rigorous multi-stage verification.
					</p>
				</div>

				{/* Two-column layout: COA card + quality pillars */}
				<div className="grid items-start gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-16">
					{/* Left: Premium verified story card */}
					<div className="relative">
						<VerifiedStoryCard />

						{/* Sample COA link */}
						<div className="mt-4 text-center">
							<LinkWithChannel
								href="/sample-coa.pdf"
								className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
							>
								<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
									<path
										fillRule="evenodd"
										d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
										clipRule="evenodd"
									/>
								</svg>
								View a sample Certificate of Analysis (PDF)
							</LinkWithChannel>
						</div>
					</div>

					{/* Right: Quality pillars */}
					<div className="flex flex-col gap-8 sm:gap-10 lg:gap-14">
						{qualityPillars.map((pillar) => (
							<div key={pillar.title} className="group">
								<span className="mb-3 inline-block rounded-lg bg-emerald-500/10 px-3 py-1.5 font-mono text-sm font-bold text-emerald-400">
									{pillar.stat}
								</span>
								<h3 className="text-lg font-semibold text-foreground sm:text-xl">{pillar.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
									{pillar.description}
								</p>
							</div>
						))}

						<LinkWithChannel
							href="/products"
							className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
						>
							See COA on every product page
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</LinkWithChannel>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── 4. Institution Logos Bar ────────────────────────────────
// Currently hidden from <Page>. Re-enable only after real logos with
// written permission are available. Renders nothing if `institutions`
// is empty, so even if re-mounted without data it won't ship fake proof.

function InstitutionLogosBar() {
	if (institutions.length === 0) return null;
	return (
		<section className="border-y border-border bg-card py-12">
			<div className="mx-auto max-w-7xl px-6">
				<p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
					Trusted by researchers at
				</p>
				<div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
					{institutions.map((name) => (
						<span
							key={name}
							className="text-base font-semibold tracking-wide text-muted-foreground sm:text-lg"
						>
							{name}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── 5. Browse by Mechanism (top 6, larger cards) ───────────

/**
 * Categories intentionally hidden from the homepage mechanism grid.
 *
 * Reasons:
 *  - `supplies` — accessories (BAC water, acetic acid), surfaced elsewhere
 *  - `peptide-blends` — pre-mixed preparations. Legitimate mechanism grouping
 *    exists upstream; blending on the homepage grid telegraphs non-research
 *    intended use (see memo Section III.A — Warrior Labz case).
 *  - `cosmetic-injectables`, `metabolic-injectables` — injectable form cohorts
 *    flagged for stakeholder review; keep off the hero browse grid until the
 *    catalog composition decision is finalised.
 *  - `reference-peptides-miscellaneous` — heterogeneous catch-all; uninviting
 *    on the hero grid. Still reachable via /products and via direct URL.
 *  - `neuropeptides`, `antimicrobial-peptides` — single-product categories
 *    today; promote once the catalog grows.
 *  - `growth-hormone-derivatives` — 3-product category, overlaps conceptually
 *    with secretagogues for the hero grid audience.
 *  - `pineal-peptides` — single product.
 *  - `copper-peptide-complexes` — single product with route-of-admin caveat;
 *    surface once the description is nailed.
 */
const HOMEPAGE_CATEGORY_HIDE_LIST = new Set<string>([
	"supplies",
	"peptide-blends",
	"cosmetic-injectables",
	"metabolic-injectables",
	"reference-peptides-miscellaneous",
	"neuropeptides",
	"antimicrobial-peptides",
	"growth-hormone-derivatives",
	"pineal-peptides",
	"copper-peptide-complexes",
]);

async function BrowseByMechanismSection(_: { params: Promise<{ channel: string }> }) {
	const categories = await getTopCategories();

	const displayCategories = categories.filter((c) => !HOMEPAGE_CATEGORY_HIDE_LIST.has(c.slug)).slice(0, 6);

	if (displayCategories.length === 0) return null;

	return (
		<section
			id="browse-by-mechanism"
			className="noise-overlay relative overflow-hidden bg-background text-foreground"
			aria-label="Browse by Mechanism"
		>
			{/* Background */}
			<div className="pointer-events-none absolute inset-0">
				<div className="bg-emerald-500/8 absolute -left-40 top-0 h-[500px] w-[500px] rounded-full blur-[120px]" />
				<div className="bg-teal-500/8 absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full blur-[120px]" />
			</div>

			<div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
				{/* Section header */}
				<div className="mb-12 sm:mb-16">
					<div className="flex items-end justify-between">
						<div>
							<p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
								Research Catalog
							</p>
							<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
								Browse by Mechanism
							</h2>
						</div>
						<LinkWithChannel
							href="/products"
							className="hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
						>
							View All Categories
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</LinkWithChannel>
					</div>
				</div>

				{/* Top mechanism categories */}
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
					{displayCategories.map((category) => {
						const description = getCategoryDescription(category.slug);
						return (
							<ShopGoalCard
								key={category.id}
								collection={category}
								description={description}
								hrefBase="/categories"
							/>
						);
					})}
				</div>
			</div>
		</section>
	);
}

// ─── 6. Tabbed Products (Featured + Best Sellers merged) ────

async function TabbedProductsSection({ params }: { params: Promise<{ channel: string }> }) {
	const { channel } = await params;
	const [featured, bestSellers] = await Promise.all([getFeaturedProducts(channel), getBestSellers(channel)]);
	if (featured.length === 0 && bestSellers.length === 0) return null;

	return (
		<section
			id="featured-products"
			className="bg-background py-24 text-foreground sm:py-32"
			aria-label="Products"
		>
			<div className="mx-auto max-w-7xl px-6">
				<ProductTabs featured={featured} bestSellers={bestSellers} />
			</div>
		</section>
	);
}

// ─── 7. Testimonials (single featured) ──────────────────────
// Currently hidden from <Page>. Re-enable once the `testimonials`
// array is populated with real, attributable reviews. The component
// returns null on an empty array so it is safe to re-mount at any
// time without risking placeholder content shipping.

function TestimonialsSection() {
	if (testimonials.length === 0) return null;
	const featured = testimonials[0];
	const supporting = testimonials.slice(1);

	return (
		<section className="bg-background text-foreground" aria-label="Testimonials">
			<div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
				<div className="mb-12 text-center sm:mb-16">
					<p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
						Trusted Worldwide
					</p>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						Trusted by Researchers Worldwide
					</h2>
					{/* TODO: Re-add an aggregate rating line here only once backed by a real review dataset */}
				</div>

				{/* Featured testimonial */}
				<article className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card p-6 text-center sm:rounded-3xl sm:p-12 lg:p-16">
					<div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-serif text-[200px] leading-none text-emerald-500/[0.06]">
						&ldquo;
					</div>

					<div className="relative mb-8 flex justify-center gap-1">
						{Array.from({ length: featured.rating }).map((_, s) => (
							<svg key={s} className="h-6 w-6 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
							</svg>
						))}
					</div>

					<blockquote className="relative text-xl leading-relaxed text-foreground sm:text-2xl">
						&ldquo;{featured.quote}&rdquo;
					</blockquote>

					<div className="mt-10 flex flex-col items-center gap-3">
						<div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-lg font-bold text-emerald-400">
							{featured.author
								.split(" ")
								.map((n) => n[0])
								.join("")}
						</div>
						<div>
							<p className="text-lg font-semibold text-foreground">{featured.author}</p>
							<p className="text-sm text-muted-foreground">{featured.role}</p>
						</div>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
							<svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fillRule="evenodd"
									d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
									clipRule="evenodd"
								/>
							</svg>
							Verified Research Customer
						</span>
					</div>
				</article>

				{/* Supporting quotes */}
				{supporting.length > 0 && (
					<div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2">
						{supporting.map((t, i) => (
							<article
								key={i}
								className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-8"
							>
								<div className="mb-4 flex gap-1">
									{Array.from({ length: t.rating }).map((_, s) => (
										<svg key={s} className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
										</svg>
									))}
								</div>
								<blockquote className="flex-1 text-base leading-relaxed text-muted-foreground">
									&ldquo;{t.quote}&rdquo;
								</blockquote>
								<div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-400">
										{t.author
											.split(" ")
											.map((n) => n[0])
											.join("")}
									</div>
									<div className="flex-1">
										<p className="text-sm font-semibold text-foreground">{t.author}</p>
										<p className="text-xs text-muted-foreground">{t.role}</p>
									</div>
									<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
										<svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
											<path
												fillRule="evenodd"
												d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
												clipRule="evenodd"
											/>
										</svg>
										Verified
									</span>
								</div>
							</article>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

// ─── 8. Newsletter CTA (concrete offer) ────────────────────

function NewsletterSection() {
	const checklist = [
		"Reconstitution protocols",
		"pH & solvent tables",
		"Freezer stability guidelines",
		"Shipping vs. storage best practices",
	];

	return (
		<section className="bg-background px-6 py-24 sm:py-32" aria-label="Newsletter">
			<div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-secondary to-card shadow-2xl shadow-black/30">
				{/* Top-edge highlight */}
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

				{/* Ambient glow orbs */}
				<div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/[0.08] blur-[80px]" />
				<div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-teal-500/[0.06] blur-[80px]" />

				<div className="noise-overlay relative px-6 py-14 text-center sm:px-10 sm:py-20 lg:px-20 lg:py-24">
					<div className="relative">
						<p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
							Free Resource
						</p>
						<h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
							Free Peptide Stability &amp; Storage Guide
						</h2>
						<p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
							Get our 20‑page reference guide on peptide reconstitution, storage protocols and stability data
							— plus early access to new compound launches.
						</p>

						{/* Checklist */}
						<ul className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-x-6 gap-y-2">
							{checklist.map((item) => (
								<li key={item} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
									<svg className="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
										<path
											fillRule="evenodd"
											d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
											clipRule="evenodd"
										/>
									</svg>
									{item}
								</li>
							))}
						</ul>

						<NewsletterForm />

						<p className="mt-5 text-xs leading-relaxed text-muted-foreground">
							No spam. Unsubscribe anytime.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Skeletons ──────────────────────────────────────────────

// ─── Dormant components kept in source for future re-enable ──
//
// `InstitutionLogosBar` and `TestimonialsSection` are deliberately not rendered
// in `<Page>` — their data arrays (`institutions`, `testimonials`) are empty
// until real, attributable social proof lands. The `void` references below
// satisfy TypeScript's `noUnusedLocals` without turning them into named page
// exports (which Next.js 16 rejects on route files).
//
// To re-enable: populate the `institutions` / `testimonials` arrays and mount
// the components inside `<Page>`. Delete the matching `void` line here.
void InstitutionLogosBar;
void TestimonialsSection;

// ─── Main Page ──────────────────────────────────────────────

export default async function Page(props: { params: Promise<{ channel: string }> }) {
	return (
		<>
			<HeroSection />
			<TrustBar />

			<BrowseByMechanismSection params={props.params} />

			<TabbedProductsSection params={props.params} />

			<HowOrderingWorks />

			<ScienceQualitySection />

			{/*
			 * ── Social proof sections — hidden until real data lands ──
			 * Both components render null on empty data arrays, so re-enable
			 * by populating `institutions` and `testimonials` above, then
			 * un-commenting the renders below.
			 *
			 * <InstitutionLogosBar />
			 * <TestimonialsSection />
			 */}

			<NewsletterSection />
		</>
	);
}
