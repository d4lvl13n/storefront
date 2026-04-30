import type { ReactNode } from "react";
import type { Metadata } from "next";

import { buildPageMetadata, buildBreadcrumbJsonLd, noIndexRobots } from "@/lib/seo";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { CoaLookupForm } from "./coa-lookup-form";

const faqs = [
	{
		q: "How do I know this matches my vial?",
		a: "When you verify, the page shows the peptide name and batch number from the lab's report. They must match what's printed on your vial label. If they don't match — or anything else looks off — stop using the product and contact us.",
	},
	{
		q: "What if my QR or code is damaged or unreadable?",
		a: "Email us with a photo of the vial label and your order number. We'll look up the batch and send you the verification link directly.",
	},
	{
		q: "What does it mean if the COA shows a recall?",
		a: "If a follow-up test reveals an issue with a batch after it ships, we mark it as recalled. The page tells you the reason. Don't use the product — contact us for a replacement or refund.",
	},
	{
		q: "How recent are the results?",
		a: "Every batch is independently tested before it ships. The Issued date on the COA is when the lab finalised the report. We don't sell from a batch that hasn't been verified.",
	},
	{
		q: "Can I share this link with someone else?",
		a: "Yes. The verification link works for anyone you forward it to — no login or account needed.",
	},
];

export async function generateMetadata(props: { params: Promise<{ channel: string }> }): Promise<Metadata> {
	const { channel } = await props.params;
	const base = buildPageMetadata({
		title: "Verify a Certificate of Analysis",
		description:
			"Authenticate the lab Certificate of Analysis for any InfinityBio Labs research compound. Scan the QR on your vial or enter the token from your label.",
		url: `/${channel}/coa`,
	});
	// Lookup landing isn't useful in Google's index — keep it out.
	return { ...base, robots: noIndexRobots };
}

export default async function CoaLookupPage(props: { params: Promise<{ channel: string }> }) {
	const { channel } = await props.params;

	const breadcrumbJsonLd = buildBreadcrumbJsonLd([
		{ label: "Home", href: `/${channel}` },
		{ label: "Verify a COA", href: `/${channel}/coa` },
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
				<div className="pointer-events-none absolute inset-0">
					<div className="bg-emerald-500/8 absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full blur-[150px]" />
					<div className="bg-teal-500/6 absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full blur-[150px]" />
				</div>

				<div className="relative mx-auto max-w-2xl px-6 py-20 sm:py-24">
					<div className="mb-10 text-center">
						<p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
							Authenticate
						</p>
						<h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
							Verify a Certificate of Analysis
						</h1>
						<p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
							Scan the QR on your vial, or enter the code beside it, to see the lab report for your batch.
						</p>
					</div>

					<div className="bg-card/40 rounded-2xl border border-border p-6 backdrop-blur-sm sm:p-8">
						<CoaLookupForm channel={channel} />
					</div>

					{/* What the customer will see when they verify — the only "marketing"
					    on this page that's actually useful to a verifier. */}
					<div className="bg-card/40 mt-8 rounded-2xl border border-border p-6 sm:p-7">
						<p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-emerald-400">
							What the COA shows
						</p>
						<ul className="space-y-2.5 text-sm leading-relaxed text-foreground">
							<CheckItem>
								The peptide name and batch number — these should match your vial label exactly.
							</CheckItem>
							<CheckItem>The original PDF report from the third-party lab.</CheckItem>
							<CheckItem>
								Test results: HPLC purity, mass spec confirmation, endotoxin levels, heavy metals, microbial
								safety.
							</CheckItem>
							<CheckItem>The lab that issued the report and the date it was signed off.</CheckItem>
						</ul>
					</div>

					{/* FAQ */}
					<section className="mt-10" aria-label="Frequently asked questions">
						<h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
							Frequently asked
						</h2>
						<div className="mt-5 space-y-2">
							{faqs.map((item) => (
								<details
									key={item.q}
									className="bg-card/30 open:bg-card/50 group rounded-xl border border-border transition-colors"
								>
									<summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-foreground">
										<span>{item.q}</span>
										<svg
											className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
											viewBox="0 0 12 12"
											fill="none"
											aria-hidden="true"
										>
											<path
												d="M3 4.5L6 7.5L9 4.5"
												stroke="currentColor"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</summary>
									<p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
								</details>
							))}
						</div>

						<p className="mt-6 text-sm leading-relaxed text-muted-foreground">
							Still stuck?{" "}
							<LinkWithChannel
								href="/contact"
								className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
							>
								Contact our team
							</LinkWithChannel>{" "}
							with a photo of your vial label — we&rsquo;ll get you the right COA.
						</p>
					</section>
				</div>
			</section>
		</>
	);
}

function CheckItem({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-start gap-2.5">
			<svg
				className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
				viewBox="0 0 20 20"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					fillRule="evenodd"
					d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
					clipRule="evenodd"
				/>
			</svg>
			<span>{children}</span>
		</li>
	);
}
