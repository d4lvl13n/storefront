import type { Metadata } from "next";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";
import { TrackOrderForm } from "./track-order-form";

export async function generateMetadata(props: { params: Promise<{ channel: string }> }): Promise<Metadata> {
	const { channel } = await props.params;
	return buildPageMetadata({
		title: "Track Your Order",
		description:
			"Look up the status of your InfinityBio Labs order. No login required — enter your order number and the email used at checkout.",
		url: `/${channel}/track-order`,
	});
}

export default async function TrackOrderPage(props: { params: Promise<{ channel: string }> }) {
	const { channel } = await props.params;

	const breadcrumbJsonLd = buildBreadcrumbJsonLd([
		{ label: "Home", href: `/${channel}` },
		{ label: "Track Order", href: `/${channel}/track-order` },
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
				{/* Ambient orbs (matches site visual language) */}
				<div className="pointer-events-none absolute inset-0">
					<div className="bg-emerald-500/8 absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full blur-[150px]" />
					<div className="bg-teal-500/6 absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full blur-[150px]" />
				</div>

				<div className="relative mx-auto max-w-2xl px-6 py-20 sm:py-24">
					<div className="mb-10 text-center">
						<p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
							Order Tracking
						</p>
						<h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Track your order</h1>
						<p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
							Enter your order number and the email you used at checkout. No account needed.
						</p>
					</div>

					<div className="bg-card/40 rounded-2xl border border-border p-6 backdrop-blur-sm sm:p-8">
						<TrackOrderForm channel={channel} />
					</div>

					<div className="bg-secondary/40 mt-8 rounded-xl border border-border p-5">
						<h2 className="text-sm font-semibold text-foreground">Can&rsquo;t find your order?</h2>
						<ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
							<li>&middot; The email must match the one you used at checkout — not a different one.</li>
							<li>&middot; Drop the &ldquo;ORD-&rdquo; prefix or paste it as-is, both work.</li>
							<li>
								&middot; If you still can&rsquo;t see your order,{" "}
								<a
									href={`/${channel}/contact`}
									className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
								>
									contact our team
								</a>{" "}
								and we&rsquo;ll help.
							</li>
						</ul>
					</div>
				</div>
			</section>
		</>
	);
}
