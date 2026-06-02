"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, AlertTriangle, MailCheck } from "lucide-react";
import { isSafeNextPath } from "@/lib/auth/safe-next";

type Props = {
	email: string;
	token: string;
};

type Status = "idle" | "verifying" | "success" | "error";

/**
 * Redeems the account-confirmation token from the registration email.
 *
 * Reached via `/login?mode=confirm&email=&token=` (see sign-up-form's
 * redirectUrl). Distinct from SetPasswordMode (password reset): a user who just
 * chose a password at sign-up must never be asked to set one again.
 *
 * Confirmation is gated behind an explicit button, NOT fired on mount: the
 * token is single-use, and email security gateways/webmail clients prefetch
 * links. Auto-confirming on mount would let a scanner silently consume the
 * token, stranding the human. A user gesture is the standard mitigation.
 *
 * `confirmAccount` issues no token, so on success we send the user to sign in
 * with their email pre-filled.
 */
export function ConfirmMode({ email, token }: Props) {
	const router = useRouter();
	const params = useParams<{ channel: string }>();
	const searchParams = useSearchParams();

	const [status, setStatus] = useState<Status>("idle");
	const [errorMessage, setErrorMessage] = useState("");

	const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const nextParam = searchParams.get("next");

	// Sign-in destination, carrying the verified email and any `?next=` through.
	const loginHref = (() => {
		const sp = new URLSearchParams({ confirmed: "1", email });
		if (isSafeNextPath(nextParam)) sp.set("next", nextParam);
		return `/${params.channel}/login?${sp.toString()}`;
	})();

	// Cancel a pending redirect if the user navigates away first.
	useEffect(() => {
		return () => {
			if (redirectTimer.current) clearTimeout(redirectTimer.current);
		};
	}, []);

	const verify = async () => {
		setStatus("verifying");
		try {
			const res = await fetch("/api/auth/confirm", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, token }),
			});

			const data = (await res.json()) as {
				success?: boolean;
				errors?: Array<{ message: string; code?: string }>;
			};

			if (data.errors?.length) {
				const err = data.errors[0];
				const looksExpired =
					err.code === "INVALID" ||
					err.code === "EXPIRED" ||
					/expired|invalid|token/i.test(err.message ?? "");
				setErrorMessage(
					looksExpired
						? "This verification link is invalid or has expired. If your account isn't active yet, register again to receive a new link — otherwise just sign in."
						: err.message || "We couldn't verify your email. Please try again.",
				);
				setStatus("error");
				return;
			}

			setStatus("success");
			// Brief confirmation, then to sign-in with email pre-filled.
			redirectTimer.current = setTimeout(() => {
				router.push(loginHref);
				router.refresh();
			}, 1600);
		} catch {
			setErrorMessage("An error occurred while verifying your email. Please try again.");
			setStatus("error");
		}
	};

	return (
		<div className="w-full max-w-md">
			<div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-card to-card shadow-2xl shadow-black/30">
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
				<div className="noise-overlay relative p-8 text-center sm:p-10">
					{(status === "idle" || status === "verifying") && (
						<>
							<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
								<MailCheck className="h-7 w-7 text-emerald-400" aria-hidden="true" />
							</div>
							<h1 className="text-xl font-bold text-foreground">Confirm your email</h1>
							<p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
								Verify <span className="font-medium text-foreground">{email}</span> to activate your research
								account.
							</p>
							<button
								type="button"
								onClick={verify}
								disabled={status === "verifying"}
								className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-60"
							>
								{status === "verifying" ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
										Verifying…
									</>
								) : (
									"Verify my email"
								)}
							</button>
						</>
					)}

					{status === "success" && (
						<>
							<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
								<CheckCircle className="h-7 w-7 text-emerald-400" aria-hidden="true" />
							</div>
							<h1 className="text-xl font-bold text-foreground">Email verified</h1>
							<p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
								Your account is active. Taking you to sign in…
							</p>
							<Link
								href={loginHref}
								className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30"
							>
								Continue to sign in
							</Link>
						</>
					)}

					{status === "error" && (
						<>
							<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15">
								<AlertTriangle className="h-7 w-7 text-amber-400" aria-hidden="true" />
							</div>
							<h1 className="text-xl font-bold text-foreground">Verification failed</h1>
							<p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
								{errorMessage}
							</p>
							<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
								<Link
									href={`/${params.channel}/login`}
									className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
								>
									Go to sign in
								</Link>
								<Link
									href={`/${params.channel}/signup`}
									className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.07]"
								>
									Create account
								</Link>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
