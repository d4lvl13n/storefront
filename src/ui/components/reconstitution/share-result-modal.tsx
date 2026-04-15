"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type CalculatorInputs,
	type CalculatorResult,
	SYRINGE_TYPES,
	encodeShareParams,
	formatDose,
	formatUnitsDisplay,
	formatVolume,
} from "@/lib/peptide-calculator";

interface ShareResultModalProps {
	open: boolean;
	onClose: () => void;
	inputs: CalculatorInputs;
	result: CalculatorResult;
}

export function ShareResultModal({ open, onClose, inputs, result }: ShareResultModalProps) {
	const [copiedLink, setCopiedLink] = useState(false);
	const [copiedText, setCopiedText] = useState(false);
	const dialogRef = useRef<HTMLDivElement>(null);

	const shareUrl = useMemo(() => {
		if (typeof window === "undefined") return "";
		const params = encodeShareParams(inputs);
		const url = new URL(window.location.href);
		url.search = params.toString();
		url.hash = "";
		return url.toString();
	}, [inputs]);

	const shareText = useMemo(() => {
		const peptide = formatDose(inputs.peptideAmount, inputs.peptideUnit);
		const dose = formatDose(inputs.doseAmount, inputs.doseUnit);
		const units = formatUnitsDisplay(result.syringeUnits);
		const roundedUnits = Math.round(result.syringeUnits * 10) / 10;
		const syringe = SYRINGE_TYPES[inputs.syringeIndex]!;
		const mlFromUnits = formatVolume(roundedUnits / syringe.unitsPerMl);
		return `Reconstituting ${peptide} in ${inputs.waterVolume} mL BAC water → draw ${units} units (${mlFromUnits} mL) for a ${dose} dose. Free calculator:`;
	}, [inputs, result]);

	const socialShareText = `${shareText} ${shareUrl}`;

	const copyLink = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopiedLink(true);
			setTimeout(() => setCopiedLink(false), 2000);
		} catch {
			/* noop */
		}
	}, [shareUrl]);

	const copyText = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(socialShareText);
			setCopiedText(true);
			setTimeout(() => setCopiedText(false), 2000);
		} catch {
			/* noop */
		}
	}, [socialShareText]);

	const nativeShare = useCallback(async () => {
		if (typeof navigator === "undefined" || !navigator.share) return;
		try {
			await navigator.share({
				title: "InfinityBio Reconstitution Calculator",
				text: shareText,
				url: shareUrl,
			});
		} catch {
			/* user cancelled */
		}
	}, [shareText, shareUrl]);

	// Detect native share availability (set once via lazy initializer — client-only render path)
	const [hasNativeShare] = useState(
		() => typeof navigator !== "undefined" && typeof navigator.share === "function",
	);

	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	// Lock body scroll while open
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	if (!open) return null;

	const peptideLabel = formatDose(inputs.peptideAmount, inputs.peptideUnit);
	const doseLabel = formatDose(inputs.doseAmount, inputs.doseUnit);
	const syringe = SYRINGE_TYPES[inputs.syringeIndex]!;
	const roundedUnits = Math.round(result.syringeUnits * 10) / 10;
	const drawMl = formatVolume(roundedUnits / syringe.unitsPerMl);
	const units = formatUnitsDisplay(result.syringeUnits);

	const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
		shareText,
	)}&url=${encodeURIComponent(shareUrl)}`;
	const redditIntent = `https://reddit.com/submit?url=${encodeURIComponent(
		shareUrl,
	)}&title=${encodeURIComponent(
		`Peptide reconstitution: ${peptideLabel} → ${units} units for a ${doseLabel} dose`,
	)}`;
	const facebookIntent = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
	const whatsappIntent = `https://wa.me/?text=${encodeURIComponent(socialShareText)}`;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="share-modal-title"
			className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/70 backdrop-blur-md [animation:ib-share-fade_180ms_ease-out]" />

			{/* Dialog */}
			<div
				ref={dialogRef}
				className="relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-emerald-500/20 bg-background shadow-[0_40px_100px_-40px_rgba(16,185,129,0.45)] [animation:ib-share-rise_240ms_cubic-bezier(0.22,1,0.36,1)]"
			>
				{/* Close */}
				<button
					type="button"
					aria-label="Close"
					onClick={onClose}
					className="bg-background/80 absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
					</svg>
				</button>

				{/* Preview card — the shareable visual */}
				<div className="relative overflow-hidden bg-foreground px-6 pb-7 pt-8 text-white sm:px-8">
					<div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
					<div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-teal-400/15 blur-3xl" />

					<div className="relative">
						<div className="flex items-center justify-between">
							<span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300">
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
								Verified calc
							</span>
							<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
								InfinityBio Labs
							</span>
						</div>

						<h2
							id="share-modal-title"
							className="mt-5 text-xl font-semibold leading-tight text-white sm:text-2xl"
						>
							{peptideLabel} in {inputs.waterVolume} mL →{" "}
							<span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
								{units} units
							</span>
						</h2>
						<p className="mt-1.5 text-sm text-neutral-400">
							For a <span className="text-neutral-200">{doseLabel}</span> dose on a {syringe.label} syringe.
						</p>

						<div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/5 bg-black/30 p-3">
							<Stat label="Draw" value={`${drawMl} mL`} />
							<Stat label="Units" value={units} accent />
							<Stat label="Conc." value={`${result.concentrationMgMl.toFixed(2)} mg/mL`} />
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="space-y-4 bg-background p-5 sm:p-6">
					<div>
						<p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
							Share this calculation
						</p>
						<div className="flex items-stretch gap-2">
							<input
								readOnly
								value={shareUrl}
								onFocus={(e) => e.currentTarget.select()}
								className="min-w-0 flex-1 truncate rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-emerald-500/50"
							/>
							<button
								type="button"
								onClick={copyLink}
								className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/15"
							>
								{copiedLink ? (
									<>
										<CheckIcon />
										Copied
									</>
								) : (
									<>
										<LinkIcon />
										Copy link
									</>
								)}
							</button>
						</div>
					</div>

					{/* Social platforms */}
					<div className="grid grid-cols-4 gap-2">
						<SocialButton href={twitterIntent} label="X">
							<XIcon />
						</SocialButton>
						<SocialButton href={redditIntent} label="Reddit">
							<RedditIcon />
						</SocialButton>
						<SocialButton href={whatsappIntent} label="WhatsApp">
							<WhatsAppIcon />
						</SocialButton>
						<SocialButton href={facebookIntent} label="Facebook">
							<FacebookIcon />
						</SocialButton>
					</div>

					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<button
							type="button"
							onClick={copyText}
							className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground transition-colors hover:border-muted-foreground"
						>
							{copiedText ? (
								<>
									<CheckIcon />
									Text copied
								</>
							) : (
								<>
									<CopyIcon />
									Copy as text
								</>
							)}
						</button>
						{hasNativeShare ? (
							<button
								type="button"
								onClick={nativeShare}
								className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/15"
							>
								<ShareIcon />
								Share…
							</button>
						) : (
							<a
								href={twitterIntent}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/15"
							>
								<XIcon />
								Post on X
							</a>
						)}
					</div>

					<p className="text-center text-[11px] text-muted-foreground">
						Anyone opening the link will see this exact calculation pre-filled.
					</p>
				</div>
			</div>
		</div>
	);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
	return (
		<div className="min-w-0">
			<p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
			<p
				className={`mt-1 truncate font-mono text-sm font-semibold ${
					accent ? "text-emerald-300" : "text-white"
				}`}
			>
				{value}
			</p>
		</div>
	);
}

function SocialButton({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`Share on ${label}`}
			className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-3 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-emerald-500/30 hover:text-emerald-300"
		>
			{children}
			<span className="text-[10px] font-medium uppercase tracking-[0.14em]">{label}</span>
		</a>
	);
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function LinkIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" />
		</svg>
	);
}

function CopyIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<rect width="14" height="14" x="8" y="8" rx="2" />
			<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
			<path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function ShareIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<circle cx="18" cy="5" r="3" />
			<circle cx="6" cy="12" r="3" />
			<circle cx="18" cy="19" r="3" />
			<path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
		</svg>
	);
}

function XIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M18.244 2H21.5l-7.54 8.62L22.5 22h-6.79l-5.3-6.94L4.4 22H1.14l8.04-9.2L1.5 2h6.93l4.78 6.32L18.24 2Zm-1.18 18h1.82L7.02 4h-1.9l11.94 16Z" />
		</svg>
	);
}

function RedditIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm5.5 11.3a1.3 1.3 0 0 1-1.3 1.3.8.8 0 0 1-.3-.1 3.9 3.9 0 0 1-1.9 2.2 6.6 6.6 0 0 1-3 .7 6.6 6.6 0 0 1-3-.7 3.9 3.9 0 0 1-1.9-2.2.8.8 0 0 1-.3.1 1.3 1.3 0 1 1 .5-2.5 4.6 4.6 0 0 1 2.7-.8h.1l.6-3 2.3.5a1 1 0 1 1-.1.6l-1.8-.4-.5 2.3a4.6 4.6 0 0 1 2.7.8 1.3 1.3 0 1 1 .5 2.5ZM9 12.8a.9.9 0 1 0-.9-.9.9.9 0 0 0 .9.9Zm6 0a.9.9 0 1 0-.9-.9.9.9 0 0 0 .9.9Zm-.3 2a.4.4 0 0 0-.5-.1 3.5 3.5 0 0 1-2.2.6 3.5 3.5 0 0 1-2.2-.6.4.4 0 0 0-.5.6 4.3 4.3 0 0 0 2.7.8 4.3 4.3 0 0 0 2.7-.8.4.4 0 0 0 0-.5Z" />
		</svg>
	);
}

function WhatsAppIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M20.5 3.5A10 10 0 0 0 3.6 17.3L2 22l4.8-1.6A10 10 0 1 0 20.5 3.5Zm-8.5 17a8.4 8.4 0 0 1-4.3-1.2l-.3-.2-2.9 1 1-2.8-.2-.3a8.4 8.4 0 1 1 6.7 3.5Zm4.8-6.3c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.5 0a7.1 7.1 0 0 1-2-1.3 7.9 7.9 0 0 1-1.5-1.8c-.2-.3 0-.4.1-.6l.4-.4.2-.4a.4.4 0 0 0 0-.4c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4 15.3 15.3 0 0 0 1.5.6 3.7 3.7 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
		</svg>
	);
}

function FacebookIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
			<path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.5V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9a15.5 15.5 0 0 1 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
		</svg>
	);
}
