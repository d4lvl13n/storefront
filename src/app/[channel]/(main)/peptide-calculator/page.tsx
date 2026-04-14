import type { Metadata } from "next";
import { buildPageMetadata, buildFaqJsonLd, buildBreadcrumbJsonLd, buildHowToJsonLd } from "@/lib/seo";
import { CalculatorPageClient } from "@/ui/components/reconstitution/calculator-page-client";
import { CALCULATOR_FAQ_ITEMS, RECONSTITUTION_STEPS } from "@/ui/components/reconstitution/data";

export async function generateMetadata(props: { params: Promise<{ channel: string }> }): Promise<Metadata> {
	const { channel } = await props.params;

	return buildPageMetadata({
		title: "Peptide Reconstitution Calculator",
		description:
			"Free peptide reconstitution calculator. Enter vial mass, diluent volume, and target dose to get exact draw volume in mL and syringe units. Supports mg/mcg conversion, multiple syringe types, and doses-per-vial tracking.",
		url: `/${channel}/peptide-calculator`,
	});
}

export default async function ReconstitutionCalculatorPage(props: { params: Promise<{ channel: string }> }) {
	const { channel } = await props.params;

	// Structured data for rich search results
	const faqJsonLd = buildFaqJsonLd(CALCULATOR_FAQ_ITEMS);
	const breadcrumbJsonLd = buildBreadcrumbJsonLd([
		{ label: "Home", href: `/${channel}` },
		{ label: "Reconstitution Calculator", href: `/${channel}/peptide-calculator` },
	]);
	const howToJsonLd = buildHowToJsonLd({
		name: "How to Reconstitute a Peptide Vial",
		description:
			"Step-by-step guide to reconstituting lyophilized peptides with bacteriostatic water and calculating the correct injection dose using a U-100 insulin syringe.",
		totalTime: "PT10M",
		steps: RECONSTITUTION_STEPS,
	});

	return (
		<section className="bg-background text-foreground">
			{/* JSON-LD Structured Data */}
			{faqJsonLd && (
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
			)}
			{breadcrumbJsonLd && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
				/>
			)}
			{howToJsonLd && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
				/>
			)}

			<div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
				{/* Header */}
				<div className="mb-10 text-center">
					<span className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
						Research Tool
					</span>
					<h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						Peptide Reconstitution Calculator
					</h1>
					<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
						Enter your vial size, diluent volume, and desired dose to instantly calculate the exact draw
						volume and syringe units. No manual unit conversion needed.
					</p>
				</div>

				<CalculatorPageClient />

				{/* Disclaimer */}
				<div className="mt-16 rounded-xl border border-border bg-card px-5 py-4 text-center text-xs leading-relaxed text-muted-foreground">
					This tool is provided for educational and calculation-support purposes only. It is not intended as
					individualized medical advice. Always consult qualified professionals and follow applicable
					regulations for your research application.
				</div>
			</div>
		</section>
	);
}
