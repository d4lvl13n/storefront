"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

type FormStatus = "idle" | "submitting" | "success" | "error";

const SOCIAL_FIELDS = [
	{ name: "instagram", label: "Instagram", placeholder: "@handle or profile URL" },
	{ name: "youtube", label: "YouTube", placeholder: "Channel URL" },
	{ name: "tiktok", label: "TikTok", placeholder: "@handle" },
	{ name: "twitter", label: "X (Twitter)", placeholder: "@handle" },
	{ name: "linkedin", label: "LinkedIn", placeholder: "Profile URL" },
	{ name: "telegram", label: "Telegram", placeholder: "@handle or group link" },
	{ name: "reddit", label: "Reddit", placeholder: "u/username" },
	{ name: "other_social", label: "Other", placeholder: "Other platform / link" },
] as const;

export function AffiliateApplicationForm() {
	const [status, setStatus] = useState<FormStatus>("idle");
	const [errorMessage, setErrorMessage] = useState("");

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setStatus("submitting");
		setErrorMessage("");

		const form = e.currentTarget;
		// Combine per-platform handles into a single newline-separated string
		// so the existing `social_media` column stores a readable record.
		const socialEntries = SOCIAL_FIELDS.map((field) => {
			const value = (form.elements.namedItem(field.name) as HTMLInputElement | null)?.value.trim();
			return value ? `${field.label}: ${value}` : null;
		}).filter((line): line is string => Boolean(line));

		const data = {
			name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
			email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
			website: (form.elements.namedItem("website") as HTMLInputElement).value.trim(),
			social_media: socialEntries.join("\n"),
			promotion_plan: (form.elements.namedItem("promotion_plan") as HTMLTextAreaElement).value.trim(),
		};

		try {
			const res = await fetch("/api/affiliate/apply", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			const result = (await res.json()) as { error?: string; ok?: boolean };

			if (!res.ok) {
				setStatus("error");
				setErrorMessage(result.error || "Something went wrong. Please try again.");
				return;
			}

			setStatus("success");
		} catch {
			setStatus("error");
			setErrorMessage("Network error. Please check your connection and try again.");
		}
	}

	if (status === "success") {
		return (
			<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
				<CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
				<h3 className="mt-4 text-xl font-semibold">Application Submitted</h3>
				<p className="mt-2 text-foreground">
					Thank you for your interest. We&apos;ll review your application and get back to you within a few
					business days.
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{status === "error" && (
				<div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
					<p className="text-sm text-red-300">{errorMessage}</p>
				</div>
			)}

			<div className="grid gap-6 sm:grid-cols-2">
				{/* Name */}
				<div>
					<label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground">
						Full Name <span className="text-red-400">*</span>
					</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						maxLength={200}
						placeholder="John Doe"
						className="flex h-10 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
					/>
				</div>

				{/* Email */}
				<div>
					<label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
						Email <span className="text-red-400">*</span>
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						maxLength={200}
						placeholder="john@example.com"
						className="flex h-10 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
					/>
				</div>
			</div>

			{/* Website */}
			<div>
				<label htmlFor="website" className="mb-2 block text-sm font-medium text-foreground">
					Website / Blog
				</label>
				<input
					id="website"
					name="website"
					type="url"
					maxLength={500}
					placeholder="https://yoursite.com"
					className="flex h-10 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
				/>
			</div>

			{/* Social Media grid */}
			<fieldset>
				<legend className="mb-2 block text-sm font-medium text-foreground">Social Media</legend>
				<p className="mb-4 text-xs text-muted-foreground">
					Share the channels where you&apos;ll promote InfinityBio Labs. Fill in the ones that apply.
				</p>
				<div className="grid gap-4 sm:grid-cols-2">
					{SOCIAL_FIELDS.map((field) => (
						<div key={field.name}>
							<label
								htmlFor={field.name}
								className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground"
							>
								{field.label}
							</label>
							<input
								id={field.name}
								name={field.name}
								type="text"
								maxLength={300}
								placeholder={field.placeholder}
								className="flex h-10 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
							/>
						</div>
					))}
				</div>
			</fieldset>

			{/* Promotion Plan */}
			<div>
				<label htmlFor="promotion_plan" className="mb-2 block text-sm font-medium text-foreground">
					How do you plan to promote InfinityBio Labs? <span className="text-red-400">*</span>
				</label>
				<textarea
					id="promotion_plan"
					name="promotion_plan"
					required
					maxLength={1000}
					rows={4}
					placeholder="Tell us about your audience, channels, and promotion strategy..."
					className="flex w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
				/>
			</div>

			<button
				type="submit"
				disabled={status === "submitting"}
				className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-medium text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
			>
				{status === "submitting" ? (
					<>
						<Loader2 className="h-4 w-4 animate-spin" />
						Submitting...
					</>
				) : (
					"Submit Application"
				)}
			</button>

			<p className="text-center text-xs text-muted-foreground">
				By submitting, you agree to our affiliate program terms. We&apos;ll only use your email to communicate
				about the program.
			</p>
		</form>
	);
}
