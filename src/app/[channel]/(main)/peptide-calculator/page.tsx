import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
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
		name: "How to Reconstitute a Peptide Vial for In-Vitro Research",
		description:
			"Step-by-step guide to reconstituting lyophilized peptides with bacteriostatic water and calculating the correct draw volume using a U-100 syringe for in-vitro research protocols.",
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
				<div className="mb-8 text-center">
					<span className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
						Research Tool
					</span>
					<h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						Peptide Reconstitution Calculator
					</h1>
					<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
						Enter vial mass, diluent volume, and target dose to calculate the exact draw volume and syringe
						units for in-vitro reconstitution protocols.
					</p>
				</div>

				{/* Research Use Only notice — rendered above the calculator so the
				    attestation is visible before the tool is used. Visual pattern
				    matches the PDP RUO banner (product-attributes.tsx) for a
				    consistent compliance signal across the storefront. */}
				<div
					role="note"
					aria-label="Research use only notice"
					className="mx-auto mb-10 flex max-w-3xl items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm leading-relaxed text-amber-700 dark:text-amber-400"
				>
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
					<p>
						<span className="font-semibold">For Research Use Only.</span> This calculator supports in-vitro
						reconstitution protocols for research-grade reference compounds. It is not medical advice and must
						not be used to prepare material for human or animal administration. Always follow applicable laws
						and institutional research protocols.
					</p>
				</div>

				<CalculatorPageClient />
			</div>
		</section>
	);
}
