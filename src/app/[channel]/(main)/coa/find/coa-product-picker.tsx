"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { type CoaIndexEntry } from "@/lib/coa/schema";
import { cn } from "@/lib/utils";

/**
 * Custom combobox product selector for the shared/mis-printed QR landing
 * page. Fully styled dropdown (no native <select> — the OS list breaks the
 * dark brand): search filter, keyboard navigation, ARIA combobox/listbox
 * semantics. Deliberately typographic — no decorative icons.
 */

const STATUS_READOUT: Record<CoaIndexEntry["status"], { dot: string; text: string; label: string }> = {
	active: { dot: "bg-emerald-400", text: "text-emerald-300", label: "Lab report available" },
	pending: { dot: "bg-amber-400", text: "text-amber-200", label: "Lab report pending publication" },
	superseded: { dot: "bg-amber-400", text: "text-amber-200", label: "Updated report available" },
	recalled: { dot: "bg-red-400", text: "text-red-300", label: "Batch recalled — review details" },
};

export function CoaProductPicker({ entries }: { entries: CoaIndexEntry[] }) {
	const router = useRouter();
	const { channel } = useParams<{ channel?: string }>();

	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [highlighted, setHighlighted] = useState(0);
	const [token, setToken] = useState("");
	const [navigating, setNavigating] = useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	const options = useMemo(() => [...entries].sort((a, b) => a.product.localeCompare(b.product)), [entries]);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter(
			(entry) => entry.product.toLowerCase().includes(q) || (entry.batch ?? "").toLowerCase().includes(q),
		);
	}, [options, query]);

	const selected = options.find((entry) => entry.token === token) ?? null;
	const readout = selected ? STATUS_READOUT[selected.status] : null;

	// Close on click/tap outside.
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	// Focus the search field when the panel opens.
	useEffect(() => {
		if (open) searchRef.current?.focus();
	}, [open]);

	// Keep the highlighted row in view while arrowing through the list.
	useEffect(() => {
		listRef.current?.querySelector(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
	}, [highlighted]);

	const openPanel = () => {
		setQuery("");
		setHighlighted(selected ? Math.max(0, options.indexOf(selected)) : 0);
		setOpen(true);
	};

	const choose = (entry: CoaIndexEntry) => {
		setToken(entry.token);
		setOpen(false);
	};

	const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
				break;
			case "ArrowUp":
				event.preventDefault();
				setHighlighted((i) => Math.max(i - 1, 0));
				break;
			case "Home":
				event.preventDefault();
				setHighlighted(0);
				break;
			case "End":
				event.preventDefault();
				setHighlighted(filtered.length - 1);
				break;
			case "Enter": {
				event.preventDefault();
				const entry = filtered[highlighted];
				if (entry) choose(entry);
				break;
			}
			case "Escape":
			case "Tab":
				setOpen(false);
				break;
		}
	};

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		if (!selected || !channel) return;
		setNavigating(true);
		// `via`, not `ref` — middleware reserves ?ref= for affiliate capture.
		router.push(`/${channel}/coa/${selected.token}?via=label-misprint`);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label
					htmlFor="coa-product-trigger"
					className="mb-2 block text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-400"
				>
					Product on your vial label
				</label>

				<div ref={containerRef} className="relative">
					{/* Trigger */}
					<button
						id="coa-product-trigger"
						type="button"
						role="combobox"
						aria-expanded={open}
						aria-haspopup="listbox"
						aria-controls="coa-product-listbox"
						onClick={() => (open ? setOpen(false) : openPanel())}
						onKeyDown={(event) => {
							if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
								event.preventDefault();
								openPanel();
							}
						}}
						className={cn(
							"flex h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border bg-neutral-900 px-4 text-left outline-none transition-colors duration-150",
							open
								? "border-emerald-500/60"
								: "border-neutral-700/80 hover:border-neutral-500 focus-visible:border-emerald-500/60",
						)}
					>
						<span
							className={cn(
								"min-w-0 flex-1 truncate text-base",
								selected ? "font-medium text-white" : "text-neutral-500",
							)}
						>
							{selected ? selected.product : "Select your product…"}
						</span>
						<svg
							aria-hidden="true"
							className={cn(
								"h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-150",
								open && "rotate-180",
							)}
							viewBox="0 0 16 16"
							fill="none"
						>
							<path
								d="M4 6l4 4 4-4"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>

					{/* Panel */}
					{open && (
						<div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-neutral-700/80 bg-neutral-900 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]">
							<input
								ref={searchRef}
								type="text"
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setHighlighted(0);
								}}
								onKeyDown={onSearchKeyDown}
								placeholder="Type to filter…"
								aria-autocomplete="list"
								aria-controls="coa-product-listbox"
								className="outline-hidden h-12 w-full border-b border-neutral-800 bg-transparent px-4 text-base text-white placeholder:text-neutral-600"
							/>

							<ul
								ref={listRef}
								id="coa-product-listbox"
								role="listbox"
								aria-label="Products"
								className="max-h-[17rem] overflow-y-auto overscroll-contain py-1"
							>
								{filtered.length === 0 ? (
									<li className="px-4 py-6 text-center text-sm text-neutral-500">
										No product matches — check the spelling on your label.
									</li>
								) : (
									filtered.map((entry, index) => {
										const isSelected = entry.token === token;
										const isHighlighted = index === highlighted;
										return (
											<li
												key={entry.token}
												data-index={index}
												role="option"
												aria-selected={isSelected}
												onPointerMove={() => setHighlighted(index)}
												onClick={() => choose(entry)}
												className={cn(
													"flex cursor-pointer items-baseline justify-between gap-4 px-4 py-2.5 text-sm transition-colors duration-75",
													isHighlighted && "bg-neutral-800",
													isSelected ? "text-emerald-300" : isHighlighted ? "text-white" : "text-neutral-300",
												)}
											>
												<span className="min-w-0 flex-1 truncate">{entry.product}</span>
												{entry.batch && (
													<span className="shrink-0 font-mono text-[11px] text-neutral-500">
														{entry.batch}
													</span>
												)}
											</li>
										);
									})
								)}
							</ul>
						</div>
					)}
				</div>
			</div>

			{/* Status readout — appears once a product is chosen */}
			{selected && readout && (
				<div
					key={selected.token}
					className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3"
				>
					<span className={`flex items-center gap-2.5 text-xs font-medium ${readout.text}`}>
						<span className={`h-1.5 w-1.5 rounded-full ${readout.dot}`} />
						{readout.label}
					</span>
					<span className="select-all font-mono text-[11px] tracking-wide text-neutral-500">
						{selected.token}
					</span>
				</div>
			)}

			<button
				type="submit"
				disabled={!selected || navigating}
				className="h-12 w-full rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-neutral-950 transition-colors duration-150 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
			>
				{navigating ? "Opening certificate…" : "View Certificate of Analysis"}
			</button>
		</form>
	);
}
