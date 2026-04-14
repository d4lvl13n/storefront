"use client";

import { useState } from "react";
import { CALCULATOR_FAQ_ITEMS } from "./data";

const FAQ_ITEMS = CALCULATOR_FAQ_ITEMS;

export function FaqView() {
	const [openIndex, setOpenIndex] = useState<number | null>(null);

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-8">
				<h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
				<p className="mt-2 text-sm text-neutral-400">
					Common questions about peptide reconstitution, units, and the calculator.
				</p>
			</div>

			<div className="space-y-3">
				{FAQ_ITEMS.map((item, i) => (
					<div
						key={i}
						className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
							openIndex === i
								? "border-emerald-500/30 bg-emerald-500/[0.04]"
								: "border-neutral-800 bg-neutral-900/60"
						}`}
					>
						<button
							type="button"
							onClick={() => setOpenIndex(openIndex === i ? null : i)}
							aria-expanded={openIndex === i}
							className="flex w-full items-center justify-between px-5 py-4 text-left"
						>
							<span className="pr-4 text-sm font-medium text-white">{item.question}</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className={`shrink-0 text-neutral-500 transition-transform duration-300 ${
									openIndex === i ? "rotate-180" : ""
								}`}
							>
								<path d="m6 9 6 6 6-6" />
							</svg>
						</button>
						<div
							className={`grid transition-[grid-template-rows] duration-300 ${
								openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
							}`}
						>
							<div className="overflow-hidden">
								<p className="px-5 pb-5 text-sm leading-relaxed text-neutral-400">{item.answer}</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
