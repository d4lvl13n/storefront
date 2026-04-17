import { cookies } from "next/headers";
import Link from "next/link";
import { ResearchGateForm } from "./research-gate-form";

export const RUO_COOKIE = "ruo_acknowledged";

/**
 * Research-use attestation gate.
 *
 * Rendered in RootLayout. Blocks interaction with the storefront until the
 * visitor affirms that products will be used for in-vitro laboratory research
 * only, and not for human or animal administration. The affirmation is the
 * memo-recommended "Affirmation of Use" (see Frier Levitt Peptide Guidance
 * Memorandum, April 2026, Section III.B.b — Know-Your-Customer Screening).
 *
 * Cookie `ruo_acknowledged` is set by `acknowledgeResearchUse()` in
 * `src/app/actions.ts`. The middleware enforces the same cookie on sensitive
 * routes for direct-navigation visitors.
 */
export async function ResearchGate() {
	const jar = await cookies();
	if (jar.get(RUO_COOKIE)?.value === "1") return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="research-gate-title"
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm"
		>
			<div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-left shadow-2xl">
				<div className="mb-5 flex items-center gap-3">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-emerald-400"
						>
							<path d="M9 3h6v4l4 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V11l4-4V3z" />
							<path d="M9 14h6" />
							<path d="M9 18h6" />
						</svg>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">
							Research use only
						</p>
						<h2 id="research-gate-title" className="text-xl font-bold text-foreground">
							Research Use Attestation
						</h2>
					</div>
				</div>

				<p className="text-sm leading-relaxed text-muted-foreground">
					Infinity BioLabs supplies research-grade peptides and reference compounds for{" "}
					<strong className="text-foreground">in-vitro laboratory research only</strong>. Our products are not
					approved drugs, are not intended for human or animal administration, and are not for therapeutic,
					diagnostic, or clinical use.
				</p>

				<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
					Before continuing, please affirm the following:
				</p>

				<ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground">
					<li className="flex gap-2">
						<span aria-hidden="true" className="mt-1 text-emerald-400">
							&bull;
						</span>
						<span>
							I am acquiring these products on behalf of a qualified research organization or for bona-fide
							in-vitro laboratory research.
						</span>
					</li>
					<li className="flex gap-2">
						<span aria-hidden="true" className="mt-1 text-emerald-400">
							&bull;
						</span>
						<span>
							I will not use, sell, distribute, or administer any product for human or animal consumption,
							injection, or therapeutic purposes.
						</span>
					</li>
					<li className="flex gap-2">
						<span aria-hidden="true" className="mt-1 text-emerald-400">
							&bull;
						</span>
						<span>
							I will comply with all applicable federal, state, and local laws and regulations governing
							research chemicals.
						</span>
					</li>
				</ul>

				<ResearchGateForm />

				<p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
					By continuing you agree to our{" "}
					<Link href="/terms" className="underline hover:text-foreground">
						Terms of Service
					</Link>
					,{" "}
					<Link href="/ruo-policy" className="underline hover:text-foreground">
						Research Use Only Policy
					</Link>
					,{" "}
					<Link href="/waiver" className="underline hover:text-foreground">
						Waiver &amp; Release
					</Link>
					, and{" "}
					<Link href="/privacy" className="underline hover:text-foreground">
						Privacy Policy
					</Link>
					.
				</p>
			</div>
		</div>
	);
}
