import type { Metadata } from "next";

import { buildPageMetadata, buildBreadcrumbJsonLd, noIndexRobots } from "@/lib/seo";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { CoaLookupForm } from "./coa-lookup-form";

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
							Scan the QR on your vial — or paste the token printed beside it — to view the original lab
							document.
						</p>
					</div>

					<div className="bg-card/40 rounded-2xl border border-border p-6 backdrop-blur-sm sm:p-8">
						<CoaLookupForm channel={channel} />
					</div>

					<div className="mt-8 grid gap-3 sm:grid-cols-3">
						<InfoCard
							title="Issued by accredited US labs"
							body="Every batch is tested by independent third-party laboratories — purity (HPLC + MS), endotoxins, heavy metals."
						/>
						<InfoCard
							title="One QR per batch"
							body="Tokens are unique per batch. Older COAs stay live forever, even after a new audit is published."
						/>
						<InfoCard
							title="No account needed"
							body="The token on your label is the access key. We don't need your email or order number to show the COA."
						/>
					</div>

					<div className="bg-secondary/40 mt-8 rounded-xl border border-border p-5">
						<h2 className="text-sm font-semibold text-foreground">Can&rsquo;t find your token?</h2>
						<ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
							<li>
								&middot; The token is the 12-character code printed beside the QR on your vial label,
								formatted as <span className="font-mono">XXXX-XXXX-XXXX</span>.
							</li>
							<li>
								&middot; Scanning the QR with your phone camera takes you straight to the COA — no typing
								needed.
							</li>
							<li>
								&middot; If the QR is damaged or you&rsquo;re missing the token,{" "}
								<LinkWithChannel
									href="/contact"
									className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
								>
									contact us
								</LinkWithChannel>{" "}
								and we&rsquo;ll re-issue.
							</li>
						</ul>
					</div>
				</div>
			</section>
		</>
	);
}

function InfoCard({ title, body }: { title: string; body: string }) {
	return (
		<div className="bg-card/40 rounded-xl border border-border p-4">
			<p className="text-sm font-semibold text-foreground">{title}</p>
			<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
		</div>
	);
}
