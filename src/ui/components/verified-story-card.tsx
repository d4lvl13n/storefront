"use client";

import { useEffect, useState } from "react";

const COA_ROWS = [
	{ label: "Purity (HPLC)", value: "99.2%", meter: "w-[99%]" },
	{ label: "Identity (MS)", value: "Confirmed", meter: "w-full" },
	{ label: "Endotoxin", value: "<0.5 EU/mg", meter: "w-[92%]" },
	{ label: "Appearance", value: "White lyophilized powder", meter: "w-[88%]" },
	{ label: "Molecular Weight", value: "1419.53 Da", meter: "w-[95%]" },
	{ label: "Sequence", value: "GEPPPGKPADDAGLV", meter: "w-[90%]" },
	{ label: "Residual Solvents", value: "<50 ppm", meter: "w-[87%]" },
	{ label: "Heavy Metals", value: "<10 ppm", meter: "w-[89%]" },
];

const META_FIELDS = [
	{ label: "Doc ID", value: "COA-0847-A" },
	{ label: "Issued", value: "26 Mar 2026" },
	{ label: "Retest", value: "Sep 2026" },
	{ label: "Storage", value: "-20 C" },
];

const METHOD_TAGS = ["HPLC-UV", "LC-MS", "LAL assay", "Visual ID"];

export function VerifiedStoryCard() {
	const [activeIndex, setActiveIndex] = useState(0);
	const [scrollIndex, setScrollIndex] = useState(0);
	const [isResetting, setIsResetting] = useState(false);

	useEffect(() => {
		const intervalId = setInterval(() => {
			setActiveIndex((value) => (value + 1) % COA_ROWS.length);
			setScrollIndex((value) => value + 1);
		}, 1700);

		return () => clearInterval(intervalId);
	}, []);

	useEffect(() => {
		if (scrollIndex !== COA_ROWS.length) return undefined;

		const timeoutId = setTimeout(() => {
			setIsResetting(true);
			setScrollIndex(0);
			requestAnimationFrame(() => {
				requestAnimationFrame(() => setIsResetting(false));
			});
		}, 700);

		return () => clearTimeout(timeoutId);
	}, [scrollIndex]);

	const activeMetaIndex = activeIndex % META_FIELDS.length;
	const activeMethodIndex = activeIndex % METHOD_TAGS.length;
	const reelRows = [...COA_ROWS, ...COA_ROWS];
	const reelStep = 64;
	const reelGap = 10;
	const reelHeight = reelStep * 3 + reelGap * 2;

	return (
		<article className="verified-story-card group relative overflow-hidden rounded-[1.9rem] border border-neutral-800 bg-neutral-950/90 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.85)] transition-[transform,border-color,box-shadow,background-color] duration-500 hover:-translate-y-1.5 hover:border-emerald-500/25 hover:bg-neutral-950 hover:shadow-[0_28px_80px_-36px_rgba(16,185,129,0.45)]">
			<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
			<div className="pointer-events-none absolute -right-16 top-8 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl [animation:ib-story-breathe_8s_ease-in-out_infinite]" />
			<div className="bg-teal-400/8 pointer-events-none absolute -left-12 bottom-8 h-40 w-40 rounded-full blur-3xl [animation:ib-story-breathe_10s_ease-in-out_infinite]" />
			<div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 blur-xl transition-opacity duration-500 [animation:ib-story-sheen_5.8s_ease-in-out_infinite] group-hover:opacity-100" />

			<div className="relative z-10 p-4 sm:p-5">
				<div className="mb-3 flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-2">
						<span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-300 [animation:ib-story-pulse_3.2s_ease-in-out_infinite]">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
							Verified dossier
						</span>
						<div>
							<p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
								Certificate of Analysis
							</p>
							<h3 className="mt-2 text-[1.55rem] font-semibold tracking-tight text-white sm:text-[1.75rem]">
								BPC-157 — Lot #IB-2026-0847
							</h3>
						</div>
					</div>

					<div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-black/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400 transition-transform duration-500 group-hover:-translate-y-0.5">
						<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400/80" />
						Independent lab
					</div>
				</div>

				<div className="relative overflow-hidden rounded-[1.45rem] border border-white/5 bg-black/25 p-3 sm:p-3.5">
					<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
					<div className="pointer-events-none absolute inset-x-4 top-20 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent [animation:ib-story-scan_5.2s_linear_infinite]" />

					<div className="relative z-10">
						<div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
							{META_FIELDS.map((field, index) => {
								const isActive = index === activeMetaIndex;

								return (
									<div
										key={field.label}
										className={`rounded-2xl border px-3 py-2 transition-all duration-500 ${
											isActive
												? "border-emerald-500/20 bg-emerald-500/[0.07] shadow-[0_12px_30px_-24px_rgba(16,185,129,0.7)]"
												: "border-neutral-800/70 bg-neutral-900/45"
										}`}
									>
										<p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{field.label}</p>
										<p className="mt-1 font-mono text-sm font-semibold text-white">{field.value}</p>
									</div>
								);
							})}
						</div>

						<div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
							<div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-800/70 bg-neutral-900/35 px-3 py-2.5 xl:min-w-0 xl:flex-1">
								<div className="min-w-0">
									<p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
										Verification stack
									</p>
									<p className="mt-1 text-sm text-neutral-300">Third-party accredited release workflow.</p>
								</div>
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-[1.04]">
									<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path
											fillRule="evenodd"
											d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
							</div>

							<div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3 xl:min-w-[220px]">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">
											Release status
										</p>
										<p className="mt-1 font-mono text-sm font-semibold text-white">All tests passed</p>
									</div>
									<p className="text-right text-xs text-neutral-400">
										Panel {String(activeIndex + 1).padStart(2, "0")}/
										{String(COA_ROWS.length).padStart(2, "0")}
									</p>
								</div>
							</div>
						</div>

						<div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
							{METHOD_TAGS.map((method, index) => (
								<div
									key={method}
									className={`rounded-full border px-3 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.16em] transition-all duration-500 ${
										index === activeMethodIndex
											? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300"
											: "border-neutral-800/70 bg-black/20 text-neutral-500"
									}`}
								>
									{method}
								</div>
							))}
						</div>

						<div className="border-white/6 rounded-[1.35rem] border bg-neutral-950/65 p-3">
							<div className="mb-3 flex items-center justify-between gap-3 border-b border-neutral-800/70 pb-2.5">
								<div>
									<p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Assay reel</p>
									<p className="mt-1 text-sm text-neutral-300">
										A compact live view of the current test stack.
									</p>
								</div>
								<span className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
									Live panel
								</span>
							</div>

							<div className="relative overflow-hidden" style={{ height: `${reelHeight}px` }}>
								<div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-neutral-950/95 to-transparent" />
								<div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-neutral-950/95 to-transparent" />
								<div
									className={`${isResetting ? "transition-none" : "transition-transform duration-700"}`}
									style={{
										transform: `translateY(-${scrollIndex * (reelStep + reelGap)}px)`,
										transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
									}}
								>
									{reelRows.map((row, index) => {
										const logicalIndex = index % COA_ROWS.length;
										const isActive = logicalIndex === activeIndex;

										return (
											<div
												key={`${row.label}-${index}`}
												className={`mb-[10px] rounded-2xl border px-3 py-3 transition-all duration-500 sm:px-4 ${
													isActive
														? "border-emerald-500/20 bg-emerald-500/[0.07] shadow-[0_10px_30px_-20px_rgba(16,185,129,0.45)]"
														: "border-neutral-800/70 bg-neutral-900/45"
												}`}
												style={{ minHeight: `${reelStep}px` }}
											>
												<div className="flex items-center justify-between gap-4">
													<div className="min-w-0">
														<p className="text-sm font-medium text-neutral-300">{row.label}</p>
														<div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-neutral-800 sm:w-36">
															<div
																className={`h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-700 ${row.meter}`}
															/>
														</div>
													</div>
													<div className="flex shrink-0 items-center gap-2">
														<span className="font-mono text-xs font-semibold text-white sm:text-sm">
															{row.value}
														</span>
														<span
															className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-500 ${
																isActive
																	? "bg-emerald-400/20 text-emerald-300"
																	: "bg-emerald-500/10 text-emerald-400/80"
															}`}
														>
															<svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
																<path
																	fillRule="evenodd"
																	d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
																	clipRule="evenodd"
																/>
															</svg>
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}
