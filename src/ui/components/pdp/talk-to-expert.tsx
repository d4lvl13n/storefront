import Image from "next/image";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

/**
 * "Need help choosing?" concierge band.
 *
 * Full-bleed image + dark overlay with a primary "Talk to an expert" CTA
 * (→ /contact) and a secondary "Browse all compounds" (→ /products), to
 * capture undecided researchers before they bounce.
 */
export function TalkToExpertBand({ imageUrl = "/hero-2.webp" }: { imageUrl?: string }) {
	return (
		<section aria-label="Need help choosing?" className="relative isolate border-t border-border">
			<Image src={imageUrl} alt="" fill priority={false} sizes="100vw" className="-z-10 object-cover" />
			{/* Dark overlay + emerald wash for legibility and brand tint */}
			<div
				className="absolute inset-0 -z-10 bg-gradient-to-b from-black/75 via-black/65 to-black/85"
				aria-hidden="true"
			/>
			<div
				className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(16,185,129,0.18),transparent_70%)]"
				aria-hidden="true"
			/>

			<div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:py-28">
				<p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">Concierge</p>
				<h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
					Need help choosing?
				</h2>
				<p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-200 sm:text-lg">
					Have a research specialist match you to the right compound, dose and protocol in minutes.
				</p>
				<div className="mt-8 flex flex-col gap-3 sm:flex-row">
					<LinkWithChannel
						href="/contact"
						className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-600"
					>
						Talk to an expert
					</LinkWithChannel>
					<LinkWithChannel
						href="/products"
						className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-7 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
					>
						Browse all compounds
					</LinkWithChannel>
				</div>
			</div>
		</section>
	);
}
