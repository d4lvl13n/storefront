"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { cn } from "@/lib/utils";

/** Only accept same-origin relative paths as a post-auth return target. */
function isSafeNextPath(value: string | null): value is string {
	if (!value) return false;
	if (!value.startsWith("/")) return false;
	if (value.startsWith("//")) return false;
	return true;
}

export function SignUpForm() {
	const params = useParams<{ channel: string }>();
	const searchParams = useSearchParams();

	// Preserve the `?next=` param across the signup → email verification → login
	// flow, so a user who arrived at signup via the checkout-auth redirect ends
	// up back at checkout after signing in for the first time.
	const nextParam = searchParams.get("next");
	const loginHref = isSafeNextPath(nextParam)
		? `/${params.channel}/login?next=${encodeURIComponent(nextParam)}`
		: `/${params.channel}/login`;

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!email || !validateEmail(email)) {
			setError("Please enter a valid email address");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					password,
					firstName,
					lastName,
					channel: params.channel,
					redirectUrl: `${window.location.origin}/${params.channel}/login`,
				}),
			});

			const data = (await response.json()) as {
				errors?: Array<{ message: string; code?: string }>;
				user?: { id: string; email: string };
			};

			if (data.errors?.length) {
				const err = data.errors[0];
				if (err.code === "UNIQUE") {
					setError("An account with this email already exists. Please sign in instead.");
				} else {
					setError(err.message || "Failed to create account");
				}
				return;
			}

			setSuccess(true);
		} catch {
			setError("An error occurred. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const inputClasses =
		"h-12 rounded-xl border-white/[0.08] bg-white/[0.04] text-foreground placeholder-muted-foreground transition-all focus:border-emerald-500/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/40";

	if (success) {
		return (
			<div className="w-full max-w-md">
				<div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-card to-card shadow-2xl shadow-black/30">
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
					<div className="noise-overlay relative p-8 text-center sm:p-10">
						<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
							<svg
								aria-hidden="true"
								className="h-7 w-7 text-emerald-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<h2 className="text-xl font-bold text-foreground">Account Created</h2>
						<p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
							Please check your email to verify your account before signing in.
						</p>
						<Link
							href={loginHref}
							className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-8 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30"
						>
							Go to Sign In
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-md">
			<div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-card to-card shadow-2xl shadow-black/30">
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

				<div className="noise-overlay relative p-8 sm:p-10">
					<div className="mb-8">
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">Get Started</p>
						<h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
							Create an account
						</h1>
						<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
							Already have an account?{" "}
							<Link
								href={loginHref}
								className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-emerald-400 hover:no-underline"
							>
								Sign in
							</Link>
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-5">
						{error && (
							<div
								role="alert"
								className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
							>
								{error}
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="firstName" className="text-sm font-medium text-foreground">
									First name
								</Label>
								<div className="relative">
									<User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id="firstName"
										type="text"
										placeholder="First name"
										autoComplete="given-name"
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										className={cn(inputClasses, "pl-11")}
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="lastName" className="text-sm font-medium text-foreground">
									Last name
								</Label>
								<Input
									id="lastName"
									type="text"
									placeholder="Last name"
									autoComplete="family-name"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									className={inputClasses}
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="email" className="text-sm font-medium text-foreground">
								Email address
							</Label>
							<div className="relative">
								<Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									autoComplete="email"
									spellCheck={false}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className={cn(inputClasses, "pl-11")}
									required
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="password" className="text-sm font-medium text-foreground">
								Password
							</Label>
							<div className="relative">
								<Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="Minimum 8 characters…"
									autoComplete="new-password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className={cn(inputClasses, "pl-11 pr-11")}
									required
									minLength={8}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									aria-label={showPassword ? "Hide password" : "Show password"}
									className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
								>
									{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</button>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
								Confirm password
							</Label>
							<div className="relative">
								<Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="confirmPassword"
									type={showPassword ? "text" : "password"}
									placeholder="Re-enter your password"
									autoComplete="new-password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className={cn(
										inputClasses,
										"pl-11",
										confirmPassword && password !== confirmPassword && "border-red-500/40",
									)}
									required
								/>
							</div>
							{confirmPassword && password !== confirmPassword && (
								<p className="text-sm text-red-400">Passwords do not match</p>
							)}
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="mt-1 h-12 w-full rounded-xl bg-emerald-500 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50"
						>
							{isSubmitting ? "Creating account…" : "Create Account"}
						</button>

						<p className="text-center text-xs leading-relaxed text-muted-foreground">
							By creating an account, you agree to our{" "}
							<Link
								href="/terms"
								className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
							>
								Terms of Service
							</Link>{" "}
							and{" "}
							<Link
								href="/privacy"
								className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
							>
								Privacy Policy
							</Link>
						</p>
					</form>
				</div>
			</div>
		</div>
	);
}
