import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { SignUpForm } from "@/ui/components/sign-up-form";

export const metadata = {
	title: "Create Research Account",
	description:
		"Register a research account to purchase reference compounds for in-vitro laboratory research. Accounts are for qualified research use only.",
};

export default function SignUpPage() {
	return (
		<Suspense fallback={<SignUpSkeleton />}>
			<div className="relative min-h-[80vh] bg-background">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute -left-40 top-1/4 h-80 w-80 rounded-full bg-emerald-500/[0.04] blur-[100px]" />
					<div className="absolute -right-40 bottom-1/4 h-80 w-80 rounded-full bg-teal-500/[0.03] blur-[100px]" />
				</div>
				<div className="relative mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16 sm:py-24">
					<ResearchAccountNotice />
					<SignUpForm />
				</div>
			</div>
		</Suspense>
	);
}

/**
 * Compliance notice shown above the sign-up form.
 *
 * Mirrors the Frier Levitt memo guidance on Know-Your-Customer (Section III.B.b):
 * accounts are intended for verified research personnel, not individual consumers.
 * Copy should be tightened once stakeholders finalise the KYC policy and the
 * form is extended with institutional fields.
 */
function ResearchAccountNotice() {
	return (
		<div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-5 py-4 text-left">
			<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
			<div className="space-y-2 text-sm leading-relaxed">
				<p className="font-semibold text-foreground">Research accounts only</p>
				<p className="text-muted-foreground">
					Infinity BioLabs sells reference compounds strictly for{" "}
					<strong className="text-foreground">in-vitro laboratory research</strong>. By creating an account
					you confirm that you are acquiring products on behalf of a qualified research organisation or for
					bona-fide laboratory research, and that products will not be used for human or animal consumption,
					injection, or any therapeutic, diagnostic, or clinical purpose.
				</p>
				<p className="text-muted-foreground">
					Accounts that appear to be for personal or clinical use may be declined or closed, and orders
					reversed. An institutional email address is strongly preferred.
				</p>
			</div>
		</div>
	);
}

function SignUpSkeleton() {
	return (
		<div className="relative min-h-[80vh] bg-background">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute -left-40 top-1/4 h-80 w-80 rounded-full bg-emerald-500/[0.04] blur-[100px]" />
				<div className="absolute -right-40 bottom-1/4 h-80 w-80 rounded-full bg-teal-500/[0.03] blur-[100px]" />
			</div>
			<div className="relative flex items-center justify-center px-6 py-16 sm:py-24">
				<div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-card to-card shadow-2xl shadow-black/30">
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
					<div className="p-8 sm:p-10">
						<div className="mb-8">
							<div className="mb-3 h-3 w-24 animate-pulse rounded bg-secondary" />
							<div className="h-7 w-52 animate-pulse rounded bg-secondary" />
							<div className="mt-3 h-4 w-56 animate-pulse rounded bg-secondary" />
						</div>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<div className="h-3 w-20 animate-pulse rounded bg-secondary" />
									<div className="h-12 w-full animate-pulse rounded-xl bg-secondary" />
								</div>
								<div className="space-y-1.5">
									<div className="h-3 w-20 animate-pulse rounded bg-secondary" />
									<div className="h-12 w-full animate-pulse rounded-xl bg-secondary" />
								</div>
							</div>
							<div className="space-y-1.5">
								<div className="h-3 w-24 animate-pulse rounded bg-secondary" />
								<div className="h-12 w-full animate-pulse rounded-xl bg-secondary" />
							</div>
							<div className="space-y-1.5">
								<div className="h-3 w-16 animate-pulse rounded bg-secondary" />
								<div className="h-12 w-full animate-pulse rounded-xl bg-secondary" />
							</div>
							<div className="space-y-1.5">
								<div className="h-3 w-32 animate-pulse rounded bg-secondary" />
								<div className="h-12 w-full animate-pulse rounded-xl bg-secondary" />
							</div>
							<div className="h-12 w-full animate-pulse rounded-xl bg-emerald-500/20" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
