"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Loader2, AlertCircle, ExternalLink, BookOpenText } from "lucide-react";

import type { PubmedArticle, PubmedSearchResponse } from "@/lib/pubmed/schema";

// Quick-link queries surface what most peptide researchers actually search.
// Tap → fills the input → fires search. Updating these is a content edit.
const QUICK_QUERIES: { label: string; query: string }[] = [
	{ label: "GLP-1 receptor agonists", query: "GLP-1 receptor agonist" },
	{ label: "BPC-157", query: "BPC-157 peptide" },
	{ label: "Semaglutide", query: "semaglutide pharmacology" },
	{ label: "Tirzepatide", query: "tirzepatide" },
	{ label: "TB-500 (thymosin β-4)", query: "thymosin beta-4 TB-500" },
	{ label: "Growth hormone secretagogues", query: "growth hormone secretagogue" },
	{ label: "Melanocortin receptor", query: "melanocortin receptor agonist" },
	{ label: "GHK-Cu", query: "GHK-Cu copper peptide" },
	{ label: "Cytoprotective peptides", query: "cytoprotective peptide" },
];

type FetchStatus = "idle" | "loading" | "ok" | "error";

interface SearchState {
	status: FetchStatus;
	query: string;
	total: number;
	results: PubmedArticle[];
	errorMessage: string;
}

const initialState: SearchState = {
	status: "idle",
	query: "",
	total: 0,
	results: [],
	errorMessage: "",
};

export function ResearchSearch() {
	const [input, setInput] = useState("");
	const [recent, setRecent] = useState(false);
	const [state, setState] = useState<SearchState>(initialState);
	const [, startTransition] = useTransition();
	const inputRef = useRef<HTMLInputElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		return () => {
			abortRef.current?.abort();
		};
	}, []);

	async function runSearch(query: string, recentFlag: boolean) {
		const trimmed = query.trim();
		if (trimmed.length < 2) {
			setState({
				...initialState,
				status: "error",
				errorMessage: "Type at least two characters.",
			});
			return;
		}

		// Cancel any in-flight request before firing a new one.
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setState((prev) => ({ ...prev, status: "loading", errorMessage: "" }));

		try {
			const params = new URLSearchParams({ q: trimmed });
			if (recentFlag) params.set("recent", "1");
			const res = await fetch(`/api/pubmed/search?${params.toString()}`, {
				signal: controller.signal,
			});
			const data = (await res.json()) as PubmedSearchResponse;

			if (!data.ok) {
				setState({
					status: "error",
					query: trimmed,
					total: 0,
					results: [],
					errorMessage: data.message,
				});
				return;
			}

			startTransition(() => {
				setState({
					status: "ok",
					query: data.query,
					total: data.total,
					results: data.results,
					errorMessage: "",
				});
			});
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") return;
			setState({
				status: "error",
				query: trimmed,
				total: 0,
				results: [],
				errorMessage: "Network error. Please try again.",
			});
		}
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		void runSearch(input, recent);
	}

	function handleQuickQuery(query: string) {
		setInput(query);
		// Re-focus the input so users can keep typing if they want to refine.
		inputRef.current?.focus();
		void runSearch(query, recent);
	}

	function toggleRecent() {
		const next = !recent;
		setRecent(next);
		// If we already have results showing, re-run with the new filter.
		if (state.status === "ok" || state.status === "error") {
			void runSearch(state.query || input, next);
		}
	}

	return (
		<div className="space-y-8">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="relative">
					<Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
					<input
						ref={inputRef}
						type="search"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Search PubMed (e.g. semaglutide, BPC-157, GLP-1)"
						aria-label="Search PubMed"
						maxLength={200}
						autoComplete="off"
						spellCheck={false}
						className="bg-card/60 h-14 w-full rounded-2xl border border-border pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
					/>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
						<input
							type="checkbox"
							checked={recent}
							onChange={toggleRecent}
							className="h-4 w-4 rounded border-border bg-card text-emerald-500 focus:ring-emerald-500/30"
						/>
						<span>Last 5 years only</span>
					</label>
					<button
						type="submit"
						disabled={state.status === "loading"}
						className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-foreground transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{state.status === "loading" ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Searching…
							</>
						) : (
							<>
								<Search className="h-4 w-4" />
								Search
							</>
						)}
					</button>
				</div>
			</form>

			{/* Quick queries — only render before any search has run, to avoid
			    pulling focus from the results once the user is reading. */}
			{state.status === "idle" && (
				<div>
					<p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">Start with</p>
					<div className="flex flex-wrap gap-2">
						{QUICK_QUERIES.map((q) => (
							<button
								key={q.query}
								type="button"
								onClick={() => handleQuickQuery(q.query)}
								className="bg-card/60 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
							>
								{q.label}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Status + results */}
			{state.status === "error" && (
				<div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
					<p className="text-sm text-red-300">{state.errorMessage}</p>
				</div>
			)}

			{state.status === "loading" && (
				<div className="space-y-3" aria-live="polite" aria-busy="true">
					{[0, 1, 2].map((i) => (
						<div key={i} className="bg-card/40 animate-pulse rounded-2xl border border-border p-5">
							<div className="h-4 w-3/4 rounded bg-muted" />
							<div className="mt-3 h-3 w-1/2 rounded bg-muted" />
							<div className="mt-2 h-3 w-1/3 rounded bg-muted" />
						</div>
					))}
				</div>
			)}

			{state.status === "ok" && (
				<div className="space-y-5">
					<ResultsHeader query={state.query} total={state.total} shown={state.results.length} />
					{state.results.length === 0 ? (
						<EmptyState query={state.query} />
					) : (
						<ul className="space-y-3">
							{state.results.map((article) => (
								<ArticleCard key={article.pmid} article={article} />
							))}
						</ul>
					)}
					<p className="pt-2 text-xs text-muted-foreground">
						Source: National Library of Medicine PubMed ®. Results cached for up to one hour.
					</p>
				</div>
			)}
		</div>
	);
}

// ─── Subcomponents ────────────────────────────────────────────

function ResultsHeader({ query, total, shown }: { query: string; total: number; shown: number }) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-3">
			<div>
				<p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400">Results</p>
				<p className="mt-0.5 text-sm text-foreground">
					Showing <span className="font-semibold">{shown.toLocaleString("en")}</span>
					{total > shown && (
						<>
							{" "}
							of <span className="font-semibold">{total.toLocaleString("en")}</span>
						</>
					)}{" "}
					for <span className="font-mono">{query}</span>
				</p>
			</div>
			<a
				href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
			>
				Open in PubMed
				<ExternalLink className="h-3 w-3" />
			</a>
		</div>
	);
}

function ArticleCard({ article }: { article: PubmedArticle }) {
	return (
		<li className="bg-card/40 rounded-2xl border border-border p-5 transition-colors hover:border-emerald-500/30">
			<div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
				<BookOpenText className="h-3 w-3 text-emerald-400" aria-hidden="true" />
				<span className="text-emerald-400">{article.journal}</span>
				{article.year && <span>· {article.year}</span>}
				<span className="text-muted-foreground/80 font-mono normal-case tracking-normal">
					· PMID {article.pmid}
				</span>
				{article.pubTypes.includes("Review") && (
					<span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] tracking-wider text-amber-300">
						Review
					</span>
				)}
				{article.pubTypes.includes("Meta-Analysis") && (
					<span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] tracking-wider text-emerald-300">
						Meta-analysis
					</span>
				)}
				{article.pubTypes.includes("Clinical Trial") && (
					<span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] tracking-wider text-cyan-300">
						Clinical trial
					</span>
				)}
			</div>

			<h3 className="mt-3 text-base font-semibold leading-snug text-foreground">
				<a
					href={article.pubmedUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="transition-colors hover:text-emerald-300"
				>
					{article.title}
				</a>
			</h3>

			{article.authorsLine && <p className="mt-1.5 text-sm text-muted-foreground">{article.authorsLine}</p>}

			<p className="mt-2 text-xs text-muted-foreground">{article.source}</p>

			<div className="mt-4 flex flex-wrap gap-3 text-xs">
				<a
					href={article.pubmedUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
				>
					PubMed abstract
					<ExternalLink className="h-3 w-3" />
				</a>
				{article.doiUrl && (
					<a
						href={article.doiUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
					>
						Full text (DOI)
						<ExternalLink className="h-3 w-3" />
					</a>
				)}
			</div>
		</li>
	);
}

function EmptyState({ query }: { query: string }) {
	return (
		<div className="bg-card/40 rounded-2xl border border-border p-8 text-center">
			<p className="text-sm text-foreground">
				No PubMed results for <span className="font-mono">{query}</span>.
			</p>
			<p className="mt-2 text-xs text-muted-foreground">
				Try a broader term, or remove the &ldquo;Last 5 years&rdquo; filter.
			</p>
		</div>
	);
}
