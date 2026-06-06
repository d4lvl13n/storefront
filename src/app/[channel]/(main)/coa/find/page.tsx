import type { Metadata } from "next";

import { buildPageMetadata, noIndexRobots } from "@/lib/seo";
import { fetchCoaIndex } from "@/lib/coa/registry";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { CoaProductPicker } from "./coa-product-picker";

export const dynamic = "force-dynamic"; // recall flips must reach the picker immediately

/**
 * Guided COA lookup — the landing page for shared/mis-printed QR codes.
 *
 * A label printing error put the same QR code (and batch number) on every
 * product of a production run, so the scanned token can't identify a single
 * batch. Tokens flipped to `status: "shared"` in the registry redirect here;
 * the customer picks the product named on their vial and lands on the real
 * per-token verification page.
 *
 * Deliberately additive: correctly printed labels resolve straight to
 * `/coa/<token>` and never see this page.
 */

type Params = { channel: string };

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
	const { channel } = await props.params;
	const base = buildPageMetadata({
		title: "Find your Certificate of Analysis — InfinityBio Labs",
		description:
			"Select your InfinityBio Labs product to view the Certificate of Analysis for its production batch.",
		url: `/${channel}/coa/find`,
	});
	return { ...base, robots: noIndexRobots };
}

export default async function CoaFindPage(props: { params: Promise<Params> }) {
	await props.params;

	const result = await fetchCoaIndex();
	const entries = result.ok ? result.index.entries : null;

	return (
		<section className="relative overflow-hidden bg-background text-foreground">
			{/* Ambient orbs (matches the rest of the brand) */}
			<div className="pointer-events-none absolute inset-0">
				<div className="bg-emerald-500/8 absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full blur-[150px]" />
				<div className="bg-teal-500/6 absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full blur-[150px]" />
			</div>

			<div className="relative mx-auto max-w-xl px-6 py-16 sm:py-24">
				{/* Header */}
				<div className="text-center">
					<p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
						Certificates of Analysis
					</p>
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find your Certificate</h1>
					<p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
						Select the product named on your vial label to view the lab report for its production batch.
					</p>
				</div>

				{/* Picker terminal card — gradient ring, glass body */}
				<div className="mt-10">
					<div className="rounded-2xl bg-gradient-to-b from-emerald-500/40 via-teal-500/10 to-transparent p-px shadow-[0_18px_60px_-30px_rgba(16,185,129,0.45)]">
						<div className="relative rounded-[calc(1rem-1px)] bg-neutral-950/95 p-6 sm:p-8">
							{entries && entries.length > 0 ? <CoaProductPicker entries={entries} /> : <UnavailableNotice />}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="mt-10 space-y-3 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
					<p>
						Don&rsquo;t see your product, or unsure which one you have?{" "}
						<LinkWithChannel
							href="/contact"
							className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
						>
							Contact our team
						</LinkWithChannel>{" "}
						with a photo of your vial label and your order number — we&rsquo;ll send you the verification link
						directly.
					</p>
					<p>
						Have a verification code from a newer label?{" "}
						<LinkWithChannel
							href="/coa"
							className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
						>
							Enter it here
						</LinkWithChannel>
						.
					</p>
				</div>
			</div>
		</section>
	);
}

function UnavailableNotice() {
	return (
		<div className="rounded-xl border border-border bg-neutral-900/40 p-5 text-center">
			<p className="text-sm font-semibold text-foreground">
				The COA directory isn&rsquo;t available right now.
			</p>
			<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
				Please try again in a few minutes, or{" "}
				<LinkWithChannel
					href="/contact"
					className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
				>
					contact our team
				</LinkWithChannel>{" "}
				with a photo of your vial label — we&rsquo;ll get you the right COA.
			</p>
		</div>
	);
}
