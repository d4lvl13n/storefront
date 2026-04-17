"use client";

import { useState } from "react";

type Status = "idle" | "pending" | "success" | "error";

export function NewsletterForm() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (status === "pending") return;

		setStatus("pending");
		setErrorMessage(null);

		try {
			const res = await fetch("/api/newsletter", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };

			if (!res.ok) {
				setStatus("error");
				setErrorMessage(data.error ?? "Something went wrong. Please try again.");
				return;
			}

			setStatus("success");
			setEmail("");
		} catch {
			setStatus("error");
			setErrorMessage("Network error. Please try again.");
		}
	};

	if (status === "success") {
		return (
			<div className="mx-auto mt-10 max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-sm text-emerald-200">
				Check your inbox — we&rsquo;ll send the stability &amp; storage guide shortly.
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-md" noValidate>
			<div className="flex flex-col gap-3 sm:flex-row">
				<label htmlFor="newsletter-email" className="sr-only">
					Email address
				</label>
				<input
					id="newsletter-email"
					type="email"
					required
					autoComplete="email"
					placeholder="Enter your email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					disabled={status === "pending"}
					className="h-13 flex-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-6 text-sm text-foreground placeholder-muted-foreground outline-none transition-all focus:border-emerald-500/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-70"
				/>
				<button
					type="submit"
					disabled={status === "pending" || email.length === 0}
					className="h-13 rounded-full bg-emerald-500 px-8 text-sm font-semibold text-foreground shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
				>
					{status === "pending" ? "Sending…" : "Get the Free Guide"}
				</button>
			</div>
			{errorMessage && (
				<p role="alert" className="mt-3 text-sm text-red-400">
					{errorMessage}
				</p>
			)}
		</form>
	);
}
