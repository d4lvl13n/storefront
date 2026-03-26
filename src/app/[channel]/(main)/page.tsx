import Image from "next/image";
import {
	ProductListByCollectionDocument,
	CollectionsListDocument,
	ProductOrderField,
	OrderDirection,
} from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { ProductTabs } from "./product-tabs";
import { HowOrderingWorks } from "@/ui/components/how-ordering-works";
import { VerifiedStoryCard } from "@/ui/components/verified-story-card";
import { ShopGoalCard } from "@/ui/components/shop-goal-card";

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
			slug: "summer-picks",
			channel,
			first: 8,
			sortBy: { field: ProductOrderField.Collection, direction: OrderDirection.Asc },
		},
		revalidate: 300,
	});

	if (!result.ok) return [];
	return result.data.collection?.products?.edges.map(({ node }) => node) ?? [];
}

async function getCollections(channel: string) {
	const result = await executePublicGraphQL(CollectionsListDocument, {
		variables: { channel, first: 20 },
		revalidate: 3600,
	});

	if (!result.ok) return [];
	return result.data.collections?.edges.map(({ node }) => node) ?? [];
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

const collectionDescriptions: Record<string, string> = {
	"anti-aging-longevity": "Peptides targeting cellular repair, telomere support, and age-related pathways.",
	"cognitive-mood": "Nootropic compounds for memory, focus, and neurotransmitter research.",
	"growth-recovery": "Growth factor peptides for tissue repair and musculoskeletal studies.",
	"weight-management": "Metabolic peptides for fat oxidation and appetite regulation research.",
	performance: "Endurance and strength-related compounds for sports science protocols.",
	"immune-support": "Thymic peptides and immunomodulators for immune system research.",
	"sleep-recovery": "Peptides targeting circadian rhythm, deep sleep, and recovery cycles.",
	"sexual-health": "Compounds for reproductive health and sexual function research.",
	"tanning-skin": "Melanocortin peptides for dermatological and pigmentation studies.",
	aesthetics: "Cosmetic peptides for skin elasticity, collagen synthesis, and tissue repair.",
	"fertility-hormonal": "Hormonal peptides for reproductive and endocrine research.",
	"vitamins-supplements": "Essential compounds supporting foundational health research.",
	"recovery-healing": "Restorative peptides for wound healing and tissue regeneration.",
};

function getCollectionDescription(slug: string) {
	const exact = collectionDescriptions[slug];
	if (exact) return exact;

	if (slug.includes("anti") || slug.includes("longevity")) {
		return "Peptides targeting cellular repair, telomere support, and age-related pathways.";
	}

	if (slug.includes("cognitive") || slug.includes("mood")) {
		return "Nootropic compounds for memory, focus, and neurotransmitter research.";
	}

	if (slug.includes("growth") || slug.includes("recovery")) {
		return "Growth factor peptides for tissue repair and musculoskeletal studies.";
	}

	if (slug.includes("weight") || slug.includes("metabolic")) {
		return "Metabolic peptides for fat oxidation and appetite regulation research.";
	}

	if (slug.includes("immune")) {
		return "Thymic peptides and immunomodulators for immune system research.";
	}

	if (slug.includes("sleep")) {
		return "Peptides targeting circadian rhythm, deep sleep, and recovery cycles.";
	}

	if (slug.includes("sexual")) {
		return "Compounds for reproductive health and sexual function research.";
	}

	if (slug.includes("skin") || slug.includes("tanning")) {
		return "Melanocortin peptides for dermatological and pigmentation studies.";
	}

	if (slug.includes("aesthetic") || slug.includes("cosmetic")) {
		return "Cosmetic peptides for skin elasticity, collagen synthesis, and tissue repair.";
	}

	if (slug.includes("fertility") || slug.includes("hormonal") || slug.includes("endocrine")) {
		return "Hormonal peptides for reproductive and endocrine research.";
	}

	if (slug.includes("vitamin") || slug.includes("supplement")) {
		return "Essential compounds supporting foundational health research.";
	}

	if (slug.includes("healing")) {
		return "Restorative peptides for wound healing and tissue regeneration.";
	}

	return undefined;
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

// ─── Testimonials ───────────────────────────────────────────

const testimonials = [
	{
		quote:
			"The purity consistency across batches is exceptional. We've been running comparative assays for 6 months and InfinityBio's peptides deliver reproducible results every time.",
		author: "Dr. Sarah M.",
		role: "Principal Investigator, Molecular Biology",
		rating: 5,
	},
	{
		quote:
			"Finally found a supplier that provides actual HPLC chromatograms with every order. The COA documentation is thorough and their support team understands the science.",
		author: "Dr. James R.",
		role: "Research Director, Pharmacology Lab",
		rating: 5,
	},
	{
		quote:
			"Switched from our previous supplier after purity issues. InfinityBio's cold-chain shipping and consistent ≥98% purity has been a game changer for our research protocols.",
		author: "Dr. Elena K.",
		role: "Postdoctoral Fellow, Biochemistry",
		rating: 5,
	},
];

// ─── Institution names (placeholder — replace with logos) ───

const institutions = [
	"Stanford Research",
	"MIT BioLab",
	"Johns Hopkins",
	"Cambridge Pharma",
	"Max Planck Institute",
	"Karolinska Institute",
];

// ════════════════════════════════════════════════════════════
// SECTIONS
// ════════════════════════════════════════════════════════════

// ─── 1. Hero (full-bleed background image) ──────────────────

function HeroSection() {
	return (
		<section className="noise-overlay relative -mt-16 flex min-h-[90vh] items-center overflow-hidden bg-neutral-950 pt-16">
			{/* Full-bleed background image */}
			<Image src="/hero-2.webp" alt="" fill priority className="object-cover object-center" />

			{/* Dark gradient overlay for text readability */}
			<div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/80 to-neutral-950/60" />
			<div className="absolute inset-0 bg-neutral-950/40" />

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
					<p className="mb-6 animate-fade-in text-sm font-medium uppercase tracking-[0.3em] text-neutral-400 opacity-0">
						Pharmaceutical-Grade Research Peptides
					</p>
					<h1 className="animate-fade-in-up text-3xl font-bold leading-[1.05] tracking-tight text-white opacity-0 sm:text-5xl md:text-6xl lg:text-7xl">
						The Science
						<br />
						<span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
							of Purity
						</span>
					</h1>
					<p className="mt-6 max-w-xl animate-fade-in-up-delay-1 text-base leading-relaxed text-neutral-300 opacity-0 sm:mt-8 sm:text-lg">
						HPLC-verified, 99%+ purity research peptides and biotech compounds. Every batch independently
						tested. Every order documented with a Certificate of Analysis.
					</p>

					{/* CTAs */}
					<div className="mt-10 flex animate-fade-in-up-delay-2 flex-col gap-4 opacity-0 sm:flex-row sm:items-center">
						<LinkWithChannel
							href="/products"
							className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 text-sm font-semibold text-white transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 sm:px-8"
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
							href="#shop-by-goal"
							className="inline-flex h-12 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950/30 px-6 text-sm font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white sm:px-8"
						>
							Shop by Goal
						</a>
					</div>

					{/* Hero stats */}
					<dl className="mt-10 flex animate-fade-in-up-delay-2 flex-wrap gap-6 opacity-0 sm:mt-12 sm:gap-8 lg:gap-12">
						{statsData.map((stat) => (
							<div key={stat.label}>
								<dt className="text-xs font-medium uppercase tracking-wider text-neutral-500">
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

			{/* Scroll indicator */}
			<div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
				<div className="flex h-10 w-6 justify-center rounded-full border-2 border-neutral-600 pt-2">
					<div className="h-2 w-1 rounded-full bg-neutral-400" />
				</div>
			</div>
		</section>
	);
}

// ─── 2. Trust Bar ───────────────────────────────────────────

function TrustBar() {
	const items = [...trustItems, ...trustItems];
	return (
		<div className="overflow-hidden border-y border-neutral-800 bg-neutral-900/50 py-4">
			<div className="flex w-max animate-marquee">
				{items.map((item, i) => {
					const Icon = item.icon;
					return (
						<span
							key={i}
							className="mx-8 inline-flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.15em] text-neutral-500"
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
			className="noise-overlay relative overflow-hidden bg-neutral-950 text-white"
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
					<p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-400">
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
								<h3 className="text-lg font-semibold text-white sm:text-xl">{pillar.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-neutral-400 sm:text-base">
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

function InstitutionLogosBar() {
	return (
		<section className="border-y border-neutral-800 bg-neutral-900/30 py-12">
			<div className="mx-auto max-w-7xl px-6">
				<p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
					Trusted by researchers at
				</p>
				<div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
					{institutions.map((name) => (
						<span key={name} className="text-base font-semibold tracking-wide text-neutral-500 sm:text-lg">
							{name}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}

// ─── 5. Shop by Goal (top 6, larger cards) ──────────────────

async function ShopByGoalSection({ params }: { params: Promise<{ channel: string }> }) {
	const { channel } = await params;
	const collections = await getCollections(channel);

	const excludeSlugs = ["accessories"];
	const displayCollections = collections.filter((c) => !excludeSlugs.includes(c.slug)).slice(0, 6);

	if (displayCollections.length === 0) return null;

	return (
		<section
			id="shop-by-goal"
			className="noise-overlay relative overflow-hidden bg-neutral-950 text-white"
			aria-label="Shop by Goal"
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
								Research Goals
							</p>
							<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Shop by Goal</h2>
						</div>
						<LinkWithChannel
							href="/products"
							className="hidden items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white sm:inline-flex"
						>
							View All Categories
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</LinkWithChannel>
					</div>
				</div>

				{/* Top 6 collections */}
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
					{displayCollections.map((collection) => {
						const description = getCollectionDescription(collection.slug);
						return <ShopGoalCard key={collection.id} collection={collection} description={description} />;
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
			className="bg-neutral-950 py-24 text-white sm:py-32"
			aria-label="Products"
		>
			<div className="mx-auto max-w-7xl px-6">
				<ProductTabs featured={featured} bestSellers={bestSellers} />
			</div>
		</section>
	);
}

// ─── 7. Testimonials (single featured) ──────────────────────

function TestimonialsSection() {
	const featured = testimonials[0];
	const supporting = testimonials.slice(1);

	return (
		<section className="bg-neutral-950 text-white" aria-label="Testimonials">
			<div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
				<div className="mb-12 text-center sm:mb-16">
					<p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
						Trusted Worldwide
					</p>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						Trusted by Researchers Worldwide
					</h2>
					<p className="mt-3 text-sm text-neutral-500">4.9/5 average rating across 1,200+ research orders.</p>
				</div>

				{/* Featured testimonial */}
				<article className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center sm:rounded-3xl sm:p-12 lg:p-16">
					{/* Decorative quote */}
					<div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-serif text-[200px] leading-none text-emerald-500/[0.06]">
						&ldquo;
					</div>

					{/* Stars */}
					<div className="relative mb-8 flex justify-center gap-1">
						{Array.from({ length: featured.rating }).map((_, s) => (
							<svg key={s} className="h-6 w-6 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
							</svg>
						))}
					</div>

					<blockquote className="relative text-xl leading-relaxed text-neutral-300 sm:text-2xl">
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
							<p className="text-lg font-semibold text-white">{featured.author}</p>
							<p className="text-sm text-neutral-500">{featured.role}</p>
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
				<div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2">
					{supporting.map((t, i) => (
						<article
							key={i}
							className="relative flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-8"
						>
							<div className="mb-4 flex gap-1">
								{Array.from({ length: t.rating }).map((_, s) => (
									<svg key={s} className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
								))}
							</div>
							<blockquote className="flex-1 text-base leading-relaxed text-neutral-400">
								&ldquo;{t.quote}&rdquo;
							</blockquote>
							<div className="mt-6 flex items-center gap-3 border-t border-neutral-800 pt-6">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-400">
									{t.author
										.split(" ")
										.map((n) => n[0])
										.join("")}
								</div>
								<div className="flex-1">
									<p className="text-sm font-semibold text-white">{t.author}</p>
									<p className="text-xs text-neutral-500">{t.role}</p>
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

				{/* Review links */}
				<div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
					<LinkWithChannel
						href="/reviews"
						className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
					>
						Read all reviews
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</LinkWithChannel>
					<span className="hidden text-neutral-700 sm:inline">·</span>
					<LinkWithChannel
						href="/partners"
						className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
					>
						See our RUO partners and case studies
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</LinkWithChannel>
				</div>
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
		<section className="bg-neutral-950 px-6 py-24 sm:py-32" aria-label="Newsletter">
			<div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-neutral-800/80 to-neutral-900/90 shadow-2xl shadow-black/30">
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
						<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
							Free Peptide Stability &amp; Storage Guide
						</h2>
						<p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-neutral-400">
							Get our 20‑page reference guide on peptide reconstitution, storage protocols and stability data
							— plus early access to new compound launches.
						</p>

						{/* Checklist */}
						<ul className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-x-6 gap-y-2">
							{checklist.map((item) => (
								<li key={item} className="inline-flex items-center gap-1.5 text-sm text-neutral-400">
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

						<div className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
							<input
								type="email"
								placeholder="Enter your email"
								className="h-13 flex-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-6 text-sm text-white placeholder-neutral-500 outline-none transition-all focus:border-emerald-500/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/40"
							/>
							<button
								type="button"
								className="h-13 rounded-full bg-emerald-500 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30"
							>
								Get the Free Guide
							</button>
						</div>

						<p className="mt-5 text-xs leading-relaxed text-neutral-600">
							Used by lab managers and principal investigators in over 18 countries. No spam. Unsubscribe
							anytime.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

// ─── Skeletons ──────────────────────────────────────────────

// ─── Main Page ──────────────────────────────────────────────

export default async function Page(props: { params: Promise<{ channel: string }> }) {
	return (
		<>
			<HeroSection />
			<TrustBar />

			<ShopByGoalSection params={props.params} />

			<TabbedProductsSection params={props.params} />

			<HowOrderingWorks />

			<ScienceQualitySection />

			<InstitutionLogosBar />

			<TestimonialsSection />

			<NewsletterSection />
		</>
	);
}
