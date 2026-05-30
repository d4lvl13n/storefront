import { Star, BadgeCheck, MessageSquareText } from "lucide-react";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { Reveal } from "@/ui/components/reveal";
import { cn } from "@/lib/utils";

export interface ProductReview {
	author: string;
	rating: number;
	title?: string;
	body: string;
	date?: string;
	verified?: boolean;
}

export interface ReviewsData {
	avg: number | null;
	count: number | null;
	items: ProductReview[];
}

type MetaEntry = { key: string; value: string };

/**
 * Reads reviews from Saleor product metadata, following the existing
 * `faq_N_*` / `ref_N` convention:
 *   - rating_avg          e.g. "4.8"
 *   - rating_count        e.g. "37"
 *   - review_{n}_author   review_{n}_rating, review_{n}_title,
 *     review_{n}_body, review_{n}_date, review_{n}_verified  (n = 1..8)
 *
 * No data → empty result, and the UI renders an honest empty state. Seed real
 * testimonials via the Dashboard; the contract can later be swapped for a
 * provider/backend without touching the components.
 */
export function extractReviews(metadata: MetaEntry[] | null | undefined): ReviewsData {
	const meta = new Map((metadata ?? []).map((m) => [m.key, m.value]));

	const avgRaw = Number.parseFloat(meta.get("rating_avg") ?? "");
	const countRaw = Number.parseInt(meta.get("rating_count") ?? "", 10);
	const avg = Number.isFinite(avgRaw) ? avgRaw : null;
	const count = Number.isFinite(countRaw) ? countRaw : null;

	const items: ProductReview[] = [];
	for (let i = 1; i <= 8; i++) {
		const body = meta.get(`review_${i}_body`);
		const author = meta.get(`review_${i}_author`);
		if (!body || !author) continue;
		const ratingRaw = Number.parseInt(meta.get(`review_${i}_rating`) ?? "5", 10);
		items.push({
			author,
			body,
			rating: Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, ratingRaw)) : 5,
			title: meta.get(`review_${i}_title`) || undefined,
			date: meta.get(`review_${i}_date`) || undefined,
			verified: meta.get(`review_${i}_verified`) === "true",
		});
	}

	// Derive an average from listed items if a headline avg wasn't provided.
	const derivedAvg = items.length > 0 ? items.reduce((s, r) => s + r.rating, 0) / items.length : null;

	return {
		avg: avg ?? derivedAvg,
		count: count ?? (items.length > 0 ? items.length : null),
		items,
	};
}

/** Star row that supports fractional fill via an overlay clip. */
export function RatingStars({ value, className }: { value: number; className?: string }) {
	const pct = Math.max(0, Math.min(100, (value / 5) * 100));
	return (
		<span className={cn("relative inline-flex shrink-0 align-middle", className)} aria-hidden="true">
			<span className="text-muted-foreground/30 flex">
				{Array.from({ length: 5 }).map((_, i) => (
					<Star key={i} className="h-4 w-4" />
				))}
			</span>
			<span className="absolute inset-0 flex overflow-hidden text-amber-400" style={{ width: `${pct}%` }}>
				{Array.from({ length: 5 }).map((_, i) => (
					<Star key={i} className="h-4 w-4 shrink-0 fill-current" />
				))}
			</span>
		</span>
	);
}

/** Compact inline rating shown near the product title. Renders nothing if no reviews. */
export function RatingSummary({ avg, count }: { avg: number | null; count: number | null }) {
	if (!avg || !count) return null;
	return (
		<a href="#reviews" className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-80">
			<RatingStars value={avg} />
			<span className="font-semibold text-foreground">{avg.toFixed(1)}</span>
			<span className="text-muted-foreground underline-offset-4 hover:underline">
				{count} {count === 1 ? "review" : "reviews"}
			</span>
		</a>
	);
}

function RatingHistogram({ items }: { items: ProductReview[] }) {
	if (items.length === 0) return null;
	const total = items.length;
	const buckets = [5, 4, 3, 2, 1].map((star) => ({
		star,
		n: items.filter((r) => Math.round(r.rating) === star).length,
	}));

	return (
		<div className="grid gap-1.5">
			{buckets.map(({ star, n }) => (
				<div key={star} className="flex items-center gap-2 text-xs">
					<span className="w-3 text-muted-foreground">{star}</span>
					<Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
					<span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
						<span
							className="block h-full rounded-full bg-amber-400"
							style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }}
						/>
					</span>
					<span className="w-6 text-right tabular-nums text-muted-foreground">{n}</span>
				</div>
			))}
		</div>
	);
}

function ReviewCard({ review }: { review: ProductReview }) {
	return (
		<article className="rounded-xl border border-border bg-card p-5">
			<div className="mb-2 flex items-center justify-between gap-3">
				<RatingStars value={review.rating} />
				{review.date && <span className="text-xs text-muted-foreground">{review.date}</span>}
			</div>
			{review.title && <h4 className="mb-1 text-sm font-semibold text-foreground">{review.title}</h4>}
			<p className="text-sm leading-relaxed text-muted-foreground">{review.body}</p>
			<div className="mt-3 flex items-center gap-1.5 text-xs">
				<span className="font-medium text-foreground">{review.author}</span>
				{review.verified && (
					<span className="inline-flex items-center gap-1 text-emerald-400">
						<BadgeCheck className="h-3.5 w-3.5" />
						Verified researcher
					</span>
				)}
			</div>
		</article>
	);
}

/** Full reviews section rendered below the main PDP grid. */
export function ProductReviews({ data, productName }: { data: ReviewsData; productName: string }) {
	const { avg, count, items } = data;
	const hasReviews = Boolean(count && count > 0);

	return (
		<section id="reviews" aria-label="Customer reviews" className="border-t border-border bg-card">
			<Reveal className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
				<div className="mb-8 flex items-center justify-between gap-4">
					<h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Researcher reviews</h2>
				</div>

				{hasReviews ? (
					<div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
						{/* Summary rail */}
						<div className="lg:sticky lg:top-24 lg:self-start">
							<div className="flex items-end gap-3">
								<span className="text-5xl font-semibold tracking-tight text-foreground">
									{(avg ?? 0).toFixed(1)}
								</span>
								<div className="pb-1">
									<RatingStars value={avg ?? 0} />
									<p className="mt-1 text-xs text-muted-foreground">
										{count} {count === 1 ? "review" : "reviews"}
									</p>
								</div>
							</div>
							{items.length > 0 && (
								<div className="mt-5">
									<RatingHistogram items={items} />
								</div>
							)}
						</div>

						{/* Review list */}
						<div className="grid gap-4">
							{items.length > 0 ? (
								items.map((review, i) => <ReviewCard key={i} review={review} />)
							) : (
								<p className="text-sm text-muted-foreground">
									{count} verified {count === 1 ? "review" : "reviews"} on record for {productName}.
								</p>
							)}
						</div>
					</div>
				) : (
					<div className="bg-card/50 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
						<span className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
							<MessageSquareText className="h-6 w-6" />
						</span>
						<h3 className="text-base font-semibold text-foreground">No reviews yet</h3>
						<p className="max-w-md text-sm text-muted-foreground">
							Be among the first research labs to share feedback on {productName}. Verified reviews from real
							orders appear here.
						</p>
						<LinkWithChannel
							href="/contact"
							className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
						>
							Share your feedback
						</LinkWithChannel>
					</div>
				)}
			</Reveal>
		</section>
	);
}
