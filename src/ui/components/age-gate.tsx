"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "age-verified";

export function AgeGate() {
	const [verified, setVerified] = useState(true); // default true to avoid flash
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		requestAnimationFrame(() => {
			setVerified(localStorage.getItem(STORAGE_KEY) === "true");
			setMounted(true);
		});
	}, []);

	if (!mounted || verified) return null;

	const handleConfirm = () => {
		localStorage.setItem(STORAGE_KEY, "true");
		setVerified(true);
	};

	const handleDecline = () => {
		window.location.href = "https://www.google.com";
	};

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
			<div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
				<div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-emerald-400"
					>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
						<path d="m9 12 2 2 4-4" />
					</svg>
				</div>

				<h2 className="text-xl font-bold text-foreground">Age Verification Required</h2>
				<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
					This website contains products intended for research use only. You must be at least{" "}
					<strong className="text-foreground">21 years of age</strong> to enter.
				</p>

				<div className="mt-6 flex flex-col gap-3">
					<button
						type="button"
						onClick={handleConfirm}
						className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
					>
						I am 21 or older
					</button>
					<button
						type="button"
						onClick={handleDecline}
						className="h-10 w-full rounded-xl border border-border text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						I am under 21
					</button>
				</div>

				<p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
					By entering, you confirm you are of legal age and agree to our{" "}
					<Link href="/terms" className="underline hover:text-foreground">
						Terms of Service
					</Link>{" "}
					and{" "}
					<Link href="/privacy" className="underline hover:text-foreground">
						Privacy Policy
					</Link>
					.
				</p>
			</div>
		</div>
	);
}
