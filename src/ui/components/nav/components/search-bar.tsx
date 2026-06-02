"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SearchIcon, Loader2, CornerDownLeft } from "lucide-react";
import type { SearchProduct, SearchCorrection } from "@/lib/search";
import { localeConfig } from "@/config/locale";

const DEBOUNCE_MS = 180;
const MIN_CHARS = 2;

type SuggestResponse = {
	ok: boolean;
	query: string;
	products?: SearchProduct[];
	totalCount?: number;
	correction?: SearchCorrection;
};

export const SearchBar = ({ channel }: { channel: string }) => {
	const router = useRouter();
	const listboxId = useId();

	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchProduct[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [correction, setCorrection] = useState<SearchCorrection | undefined>();
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	const rootRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	const trimmed = query.trim();
	const hasResults = results.length > 0;
	// Options are the product rows plus a trailing "view all" row.
	const optionCount = hasResults ? results.length + 1 : 0;
	const viewAllIndex = results.length;

	const goToSearch = useCallback(
		(term: string) => {
			const q = term.trim();
			if (!q) return;
			setOpen(false);
			abortRef.current?.abort();
			router.push(`/${encodeURIComponent(channel)}/search?query=${encodeURIComponent(q)}`);
		},
		[channel, router],
	);

	const goToProduct = useCallback(
		(product: SearchProduct) => {
			setOpen(false);
			abortRef.current?.abort();
			router.push(`/${encodeURIComponent(channel)}/products/${product.slug}`);
		},
		[channel, router],
	);

	// Debounced fetch against the suggest endpoint.
	useEffect(() => {
		if (trimmed.length < MIN_CHARS) {
			setResults([]);
			setTotalCount(0);
			setCorrection(undefined);
			setLoading(false);
			return;
		}

		const timer = setTimeout(async () => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;
			setLoading(true);
			try {
				const res = await fetch(
					`/api/search/suggest?q=${encodeURIComponent(trimmed)}&channel=${encodeURIComponent(channel)}`,
					{ signal: controller.signal },
				);
				const data = (await res.json()) as SuggestResponse;
				if (controller.signal.aborted) return;
				setResults(data.products ?? []);
				setTotalCount(data.totalCount ?? 0);
				setCorrection(data.correction);
				setActiveIndex(-1);
				setOpen(true);
			} catch (err) {
				if ((err as Error)?.name !== "AbortError") {
					setResults([]);
					setTotalCount(0);
					setCorrection(undefined);
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		}, DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [trimmed, channel]);

	// Close on outside click.
	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: PointerEvent) {
			if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Escape") {
			setOpen(false);
			setActiveIndex(-1);
			return;
		}

		if (event.key === "Enter") {
			event.preventDefault();
			if (activeIndex >= 0 && activeIndex < results.length) {
				goToProduct(results[activeIndex]);
			} else {
				goToSearch(trimmed);
			}
			return;
		}

		if (!open || optionCount === 0) return;

		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActiveIndex((i) => (i >= optionCount - 1 ? 0 : i + 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
		}
	};

	const showPanel = open && trimmed.length >= MIN_CHARS;

	return (
		<div ref={rootRef} className="relative w-full max-w-[25rem]">
			<form
				role="search"
				onSubmit={(e) => {
					e.preventDefault();
					goToSearch(trimmed);
				}}
				className="group relative"
			>
				<label className="relative block">
					<span className="sr-only">Search for products</span>
					<span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin text-emerald-400" aria-hidden />
						) : (
							<SearchIcon
								className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground"
								aria-hidden
							/>
						)}
					</span>
					<input
						type="text"
						name="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						onFocus={() => {
							if (trimmed.length >= MIN_CHARS && (hasResults || loading)) setOpen(true);
						}}
						placeholder="Search peptides, e.g. BPC-157…"
						autoComplete="off"
						role="combobox"
						aria-expanded={showPanel}
						aria-controls={listboxId}
						aria-autocomplete="list"
						aria-activedescendant={
							activeIndex >= 0
								? activeIndex === viewAllIndex
									? `${listboxId}-viewall`
									: `${listboxId}-opt-${activeIndex}`
								: undefined
						}
						className="hover:bg-secondary/80 focus:outline-hidden h-10 w-full rounded-lg border border-transparent bg-secondary py-2 pl-11 pr-4 text-sm text-foreground transition-all placeholder:text-muted-foreground hover:border-border focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring"
					/>
				</label>
			</form>

			{showPanel && (
				<div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/40">
					{correction?.didYouMean && (
						<p className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
							No matches for <span className="text-foreground">&ldquo;{correction.original}&rdquo;</span> —
							showing{" "}
							<span className="font-medium text-emerald-400">&ldquo;{correction.didYouMean}&rdquo;</span>
						</p>
					)}

					{hasResults ? (
						<ul role="listbox" id={listboxId} aria-label="Search suggestions" className="py-1.5">
							{results.map((product, index) => (
								<li
									key={product.id}
									id={`${listboxId}-opt-${index}`}
									role="option"
									aria-selected={activeIndex === index}
								>
									<button
										type="button"
										// onMouseDown (not onClick) so the input's blur doesn't close
										// the panel before navigation fires.
										onMouseDown={(e) => {
											e.preventDefault();
											goToProduct(product);
										}}
										onMouseEnter={() => setActiveIndex(index)}
										className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
											activeIndex === index ? "bg-secondary" : "hover:bg-secondary/60"
										}`}
									>
										<span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-card">
											{product.thumbnailUrl ? (
												<Image
													src={product.thumbnailUrl}
													alt={product.thumbnailAlt || product.name}
													fill
													sizes="44px"
													className="object-cover"
												/>
											) : (
												<span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
													—
												</span>
											)}
										</span>
										<span className="min-w-0 flex-1">
											{product.categoryName && (
												<span className="block truncate text-[11px] font-medium text-emerald-400/80">
													{product.categoryName}
												</span>
											)}
											<span className="block truncate text-sm font-medium text-foreground">
												{highlight(product.name, correction?.searchedFor ?? trimmed)}
											</span>
										</span>
										<span className="shrink-0 text-sm font-semibold text-foreground">
											{formatPrice(product.price, product.currency)}
										</span>
									</button>
								</li>
							))}

							<li
								id={`${listboxId}-viewall`}
								role="option"
								aria-selected={activeIndex === viewAllIndex}
								className="mt-1 border-t border-border"
							>
								<button
									type="button"
									onMouseDown={(e) => {
										e.preventDefault();
										goToSearch(trimmed);
									}}
									onMouseEnter={() => setActiveIndex(viewAllIndex)}
									className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
										activeIndex === viewAllIndex ? "bg-secondary" : "hover:bg-secondary/60"
									}`}
								>
									<span className="font-medium text-emerald-400">
										See all {totalCount} {totalCount === 1 ? "result" : "results"}
									</span>
									<CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
								</button>
							</li>
						</ul>
					) : (
						!loading && (
							<div className="px-4 py-5 text-center">
								<p className="text-sm text-muted-foreground">
									No matches for <span className="text-foreground">&ldquo;{trimmed}&rdquo;</span>
								</p>
								<button
									type="button"
									onMouseDown={(e) => {
										e.preventDefault();
										goToSearch(trimmed);
									}}
									className="mt-2 text-xs font-medium text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
								>
									Search anyway
								</button>
							</div>
						)
					)}
				</div>
			)}
		</div>
	);
};

function formatPrice(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat(localeConfig.default, { style: "currency", currency }).format(amount);
	} catch {
		return `${amount}`;
	}
}

/** Bold the matched query substring within a product name, if present. */
function highlight(name: string, term: string): React.ReactNode {
	const needle = term.trim();
	if (!needle) return name;
	const idx = name.toLowerCase().indexOf(needle.toLowerCase());
	if (idx === -1) return name;
	return (
		<>
			{name.slice(0, idx)}
			<mark className="bg-transparent font-semibold text-emerald-400">
				{name.slice(idx, idx + needle.length)}
			</mark>
			{name.slice(idx + needle.length)}
		</>
	);
}
