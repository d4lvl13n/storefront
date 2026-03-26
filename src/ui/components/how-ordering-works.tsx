"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

// ─── Decorative scenes ─────────────────────────────────────────────────────

const TAGS = [
	{ label: "Anti-Aging", x: "5%", y: "62%", dur: "3.6s", dly: "0s" },
	{ label: "Growth", x: "20%", y: "78%", dur: "4.3s", dly: "0.3s" },
	{ label: "BPC-157", x: "40%", y: "67%", dur: "4.1s", dly: "0.5s" },
	{ label: "Cognitive", x: "62%", y: "55%", dur: "3.8s", dly: "1s" },
	{ label: "Aesthetics", x: "78%", y: "72%", dur: "3.5s", dly: "0.8s" },
];

function BrowseBg() {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
			<div className="absolute inset-x-5 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">
				<span>Catalog</span>
				<span>Research map</span>
			</div>
			<svg
				className="absolute inset-x-5 bottom-5 top-12 h-[calc(100%-4.25rem)] w-[calc(100%-2.5rem)] opacity-45"
				viewBox="0 0 100 52"
				preserveAspectRatio="none"
			>
				{[
					["8", "30", "36", "36"],
					["36", "36", "66", "26"],
					["22", "44", "36", "36"],
				].map(([x1, y1, x2, y2], index) => (
					<line
						key={index}
						x1={x1}
						y1={y1}
						x2={x2}
						y2={y2}
						stroke="rgb(52,211,153)"
						strokeWidth="0.8"
						strokeDasharray="3 4"
					/>
				))}
				{[
					["8", "30"],
					["22", "44"],
					["36", "36"],
					["66", "26"],
				].map(([cx, cy], index) => (
					<circle key={index} cx={cx} cy={cy} r="1.2" fill="rgb(94,234,212)" opacity="0.65" />
				))}
			</svg>
			{TAGS.map((tag, index) => (
				<div
					key={index}
					className="absolute rounded-full border border-emerald-500/20 bg-black/55 px-2.5 py-1 text-[10px] font-medium text-emerald-300/75 shadow-[0_0_0_1px_rgba(16,185,129,0.05)] backdrop-blur"
					style={{
						left: tag.x,
						top: tag.y,
						animation: `ib-float ${tag.dur} ${tag.dly} ease-in-out infinite`,
					}}
				>
					{tag.label}
				</div>
			))}
		</div>
	);
}

const COA_LINES = [
	{ label: "Purity (HPLC)", value: "99.2% ✓", color: "text-emerald-500/35" },
	{ label: "Identity (MS)", value: "Confirmed ✓", color: "text-teal-500/35" },
	{ label: "Endotoxin", value: "<0.5 EU/mg ✓", color: "text-emerald-500/35" },
];

function CoaBg() {
	const [step, setStep] = useState(0);
	useEffect(() => {
		const id = setInterval(() => setStep((value) => (value + 1) % (COA_LINES.length + 2)), 2000);
		return () => clearInterval(id);
	}, []);
	const shown = step >= COA_LINES.length ? COA_LINES : COA_LINES.slice(0, step + 1);
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
			<div className="absolute inset-x-5 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">
				<span>Lot #A204</span>
				<span>Lab report</span>
			</div>
			<div className="absolute inset-x-5 bottom-5 top-12 rounded-2xl border border-neutral-800/70 bg-black/20 p-4">
				<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
				<div className="flex h-full flex-col justify-end gap-2 font-mono text-[11px]">
					{shown.map((entry, index) => (
						<div key={index} className={`flex gap-2 ${entry.color}`}>
							<span className="text-neutral-700">›</span>
							<span className="text-neutral-600">{entry.label}:</span>
							<span>{entry.value}</span>
						</div>
					))}
					<div className="ml-4 h-2 w-1.5 animate-pulse bg-emerald-500/20" />
				</div>
			</div>
		</div>
	);
}

function RuoBg() {
	const [checked, setChecked] = useState(false);
	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout>;
		const run = () => {
			setChecked(false);
			timeoutId = setTimeout(() => setChecked(true), 1600);
		};
		run();
		const id = setInterval(run, 5000);
		return () => {
			clearInterval(id);
			clearTimeout(timeoutId);
		};
	}, []);
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
			<div className="absolute inset-x-5 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">
				<span>Compliance</span>
				<span>One-time waiver</span>
			</div>
			<div className="absolute inset-x-5 bottom-5 top-12 rounded-2xl border border-neutral-800/70 bg-black/20 p-4">
				<div className="flex h-full flex-col justify-between gap-3">
					<div className="flex items-center gap-2 text-[11px] text-neutral-500">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
						Required before checkout
					</div>
					<div className="flex items-center gap-3 rounded-xl border border-neutral-800/80 bg-black/30 px-3 py-3">
						<div
							className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-500 ${
								checked ? "border-emerald-500/50 bg-emerald-500/30" : "border-neutral-800/60"
							}`}
						>
							{checked ? (
								<svg className="h-2.5 w-2.5" viewBox="0 0 10 10" fill="none">
									<path
										d="M2 5l2.5 2.5L8 3"
										stroke="rgba(255,255,255,0.8)"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							) : null}
						</div>
						<span
							className={`text-[11px] transition-colors duration-500 ${
								checked ? "text-emerald-300/70" : "text-neutral-500"
							}`}
						>
							{checked ? "RUO confirmed — continue to checkout" : "Awaiting RUO confirmation…"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

const SHIP_STEPS = [
	{ label: "Order", done: true },
	{ label: "Processing", done: true },
	{ label: "Cold Pack", active: true },
	{ label: "Shipped", done: false },
];

function ShippingBg() {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
			<div className="absolute inset-x-5 top-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600">
				<span>Cold-chain route</span>
				<span>Live tracking</span>
			</div>
			<div className="absolute inset-x-5 bottom-5 top-12 rounded-2xl border border-neutral-800/70 bg-black/20 px-4 py-5">
				<div className="relative flex h-full items-start justify-between gap-3">
					<div className="absolute inset-x-2 top-4 h-px bg-neutral-800" />
					<div className="absolute left-2 top-4 h-px w-[61%] bg-gradient-to-r from-emerald-500/50 to-teal-400/50" />
					{SHIP_STEPS.map((step, index) => (
						<div key={index} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-2">
							<div
								className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-bold transition-all ${
									step.active
										? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
										: step.done
											? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500/50"
											: "border-neutral-800 bg-neutral-900 text-neutral-700"
								}`}
							>
								{step.done && !step.active ? "✓" : index + 1}
								{step.active ? (
									<span
										className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10"
										style={{ animationDuration: "2s" }}
									/>
								) : null}
							</div>
							<span
								className={`text-center text-[9px] font-medium sm:text-[10px] ${
									step.active ? "text-emerald-300/80" : step.done ? "text-neutral-500" : "text-neutral-700"
								}`}
							>
								{step.label}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── Card ─────────────────────────────────────────────────────

function Card({
	step,
	title,
	description,
	badge,
	icon,
	bg,
	className = "",
	sceneClassName = "",
}: {
	step: number;
	title: string;
	description: string;
	badge?: string;
	icon: ReactNode;
	bg: ReactNode;
	className?: string;
	sceneClassName?: string;
}) {
	return (
		<article
			className={`group relative overflow-hidden rounded-[1.75rem] border border-neutral-800 bg-neutral-950/80 opacity-0 transition-[transform,border-color,background-color,box-shadow] duration-500 [animation:ib-card-enter_720ms_cubic-bezier(0.22,1,0.36,1)_forwards] hover:-translate-y-1 hover:border-emerald-500/25 hover:bg-neutral-900/80 hover:shadow-[0_24px_60px_-32px_rgba(16,185,129,0.45)] ${className}`}
			style={{ animationDelay: `${step * 90}ms` }}
		>
			<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
			<div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent opacity-0 blur-xl transition-opacity duration-500 [animation:ib-sheen_5.5s_ease-in-out_infinite] group-hover:opacity-100" />
			<div className="relative z-10 flex h-full flex-col gap-6 p-5 sm:p-6">
				<div className="flex items-start justify-between gap-4">
					<div className="max-w-xl">
						<div className="mb-4 flex items-center gap-3">
							<span className="inline-flex rounded-full border border-neutral-800 bg-black/30 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-500">
								{String(step).padStart(2, "0")}
							</span>
							<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-emerald-400 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-[1.03]">
								{icon}
							</div>
						</div>
						<h3 className="max-w-[24ch] text-lg font-semibold leading-tight text-white sm:text-[1.15rem]">
							{title}
						</h3>
						<p className="mt-2 max-w-[60ch] text-sm leading-6 text-neutral-400">{description}</p>
					</div>
					{badge && (
						<div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-400 transition-transform duration-500 [animation:ib-badge-glow_3.4s_ease-in-out_infinite] group-hover:-translate-y-0.5">
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
							{badge}
						</div>
					)}
				</div>
				<div
					className={`relative flex-1 overflow-hidden rounded-2xl border border-white/5 bg-black/20 transition-transform duration-700 group-hover:scale-[1.01] ${sceneClassName}`}
					aria-hidden="true"
				>
					<div className="absolute inset-0 [animation:ib-breathe_7s_ease-in-out_infinite]">{bg}</div>
				</div>
			</div>
		</article>
	);
}

// ─── Main export ──────────────────────────────────────────────

export function HowOrderingWorks() {
	return (
		<section
			className="how-ordering-works bg-neutral-950 py-20 text-white sm:py-24"
			aria-label="How Ordering Works"
		>
			<div className="mx-auto max-w-7xl px-6">
				<div className="mb-12">
					<p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">
						Order Process
					</p>
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						How Ordering from{" "}
						<span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
							Infinity BioLabs Works
						</span>
					</h2>
					<p className="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-400">
						From browsing to your lab bench in 48 hours — every compound documented, every batch verified.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
					<Card
						step={1}
						className="md:col-span-2 lg:col-span-2"
						sceneClassName="min-h-[160px] sm:min-h-[180px]"
						title="Browse & Select Compounds"
						description="73+ compounds organised by research goal. Full specs, example COAs and stability data on every product page."
						badge="73+ COMPOUNDS"
						bg={<BrowseBg />}
						icon={
							<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
							</svg>
						}
					/>

					<Card
						step={2}
						sceneClassName="min-h-[160px]"
						title="COA with Every Order"
						description="Independent lab results for every lot — HPLC purity, mass-spec identity and endotoxin levels verified before dispatch."
						badge="VERIFIED"
						bg={<CoaBg />}
						icon={
							<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fillRule="evenodd"
									d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
									clipRule="evenodd"
								/>
							</svg>
						}
					/>

					<Card
						step={3}
						sceneClassName="min-h-[136px]"
						title="Confirm RUO at Checkout"
						description="A single one-time waiver confirming research-only use. Required once per account — takes 10 seconds."
						bg={<RuoBg />}
						icon={
							<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path
									fillRule="evenodd"
									d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
									clipRule="evenodd"
								/>
							</svg>
						}
					/>

					<Card
						step={4}
						className="md:col-span-2 lg:col-span-2"
						sceneClassName="min-h-[150px]"
						title="Cold-Chain Shipping in 48 h"
						description="Temperature-controlled packaging from our facility to your lab. Real-time tracking on every order."
						badge="LIVE TRACKING"
						bg={<ShippingBg />}
						icon={
							<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
								<path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
							</svg>
						}
					/>
				</div>

				<div className="mt-8 text-center">
					<p className="text-sm text-neutral-500">
						Questions?{" "}
						<LinkWithChannel
							href="/contact"
							className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
						>
							Contact our lab support team
						</LinkWithChannel>
					</p>
				</div>
			</div>
		</section>
	);
}
