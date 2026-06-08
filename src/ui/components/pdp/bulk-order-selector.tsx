"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Layers, Loader2 } from "lucide-react";

import { cn, formatMoney } from "@/lib/utils";

/**
 * A single bulk pack variant, pre-filtered to those carrying `pack_size`
 * metadata. Pricing is the *pack total* (not per-vial) straight from Saleor.
 */
export interface BulkPackVariant {
	id: string;
	name: string;
	/** "10" | "20" | "50" — count of vials in the pack. */
	packSize: string;
	quantityAvailable: number;
	/** Pack total, gross. */
	price: number;
	currency: string;
}

interface BulkOrderSelectorProps {
	/** Variant id of the base single vial (the deselect / default target). */
	singleId: string;
	/** Single-vial gross price — the baseline for per-vial savings. */
	singleUnitPrice: number;
	currency: string;
	packs: readonly BulkPackVariant[];
	/** Currently active variant id (from `?variant=`), single or a pack. */
	selectedVariantId: string | undefined;
	channel: string;
	productSlug: string;
}

/**
 * "Buy in bulk & save" — a collapsed pack-tier selector shown under the buy box.
 *
 * Each pack variant already carries its bulk-discounted total from Saleor, so we
 * only derive the *display* numbers client-side: per-vial cost and % saved vs a
 * single vial. Selecting a tier sets `?variant=<packId>`, which re-renders the
 * server buy box to that pack (price + Add to Cart) — the pack IS the quantity,
 * so the cart adds it at quantity 1 (no multiplication).
 *
 * Render only when packs exist; collapsed by default, auto-expanded when a pack
 * is the active variant so the customer can see their selection.
 */
export function BulkOrderSelector({
	singleId,
	singleUnitPrice,
	currency,
	packs,
	selectedVariantId,
	channel,
	productSlug,
}: BulkOrderSelectorProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [pendingId, setPendingId] = useState<string | null>(null);

	// Derive per-tier display: per-vial price + savings vs a single vial.
	const tiers = useMemo(() => {
		return packs
			.map((v) => {
				const size = Number(v.packSize);
				const total = v.price;
				const perUnit = size > 0 ? total / size : total;
				const savingsPct = singleUnitPrice > 0 ? Math.round((1 - perUnit / singleUnitPrice) * 100) : 0;
				return { ...v, size, total, perUnit, savingsPct };
			})
			.sort((a, b) => a.size - b.size);
	}, [packs, singleUnitPrice]);

	const maxSavings = useMemo(() => Math.max(0, ...tiers.map((t) => t.savingsPct)), [tiers]);

	const isPackSelected = useMemo(
		() => packs.some((p) => p.id === selectedVariantId),
		[packs, selectedVariantId],
	);

	// Auto-expand when a pack is already the active variant.
	const [open, setOpen] = useState(isPackSelected);

	const select = useCallback(
		(variantId: string) => {
			if (variantId === selectedVariantId) return;
			setPendingId(variantId);
			startTransition(() => {
				router.push(`/${channel}/products/${productSlug}?variant=${variantId}`, { scroll: false });
			});
		},
		[channel, productSlug, router, selectedVariantId],
	);

	if (tiers.length === 0) return null;

	return (
		<div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
			{/* Teaser header — toggles the tier list */}
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				aria-expanded={open}
				className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-emerald-500/[0.06]"
			>
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
					<Layers className="h-5 w-5" />
				</span>
				<span className="flex-1">
					<span className="block text-sm font-semibold text-foreground">Buy in bulk &amp; save</span>
					<span className="block text-xs text-muted-foreground">
						{maxSavings > 0 ? `Save up to ${maxSavings}% per vial` : "Multi-vial packs available"}
					</span>
				</span>
				{isPackSelected && !open && (
					<span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
						Pack selected
					</span>
				)}
				<ChevronDown
					className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
				/>
			</button>

			{open && (
				<div className="space-y-2 border-t border-emerald-500/15 p-3">
					{tiers.map((tier) => {
						const isActive = tier.id === selectedVariantId;
						const isSoldOut = tier.quantityAvailable <= 0;
						const isLoading = isPending && pendingId === tier.id;

						return (
							<button
								key={tier.id}
								type="button"
								disabled={isSoldOut || isLoading}
								onClick={() => select(tier.id)}
								aria-pressed={isActive}
								className={cn(
									"flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
									isActive
										? "border-emerald-500 bg-emerald-500/10"
										: "border-border bg-background hover:border-emerald-500/40",
									isSoldOut && "cursor-not-allowed opacity-50 hover:border-border",
								)}
							>
								{/* Selection indicator */}
								<span
									className={cn(
										"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
										isActive ? "border-emerald-500 bg-emerald-500 text-white" : "border-border",
									)}
								>
									{isLoading ? (
										<Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
									) : (
										isActive && <Check className="h-3 w-3" />
									)}
								</span>

								<span className="flex-1">
									<span className="flex items-baseline gap-2">
										<span className="text-sm font-semibold text-foreground">{tier.size}-pack</span>
										{!isSoldOut && tier.savingsPct > 0 && (
											<span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-400">
												Save {tier.savingsPct}%
											</span>
										)}
									</span>
									<span className="mt-0.5 block text-xs text-muted-foreground">
										{isSoldOut ? "Out of stock" : `${formatMoney(tier.perUnit, currency)}/vial`}
									</span>
								</span>

								<span className="shrink-0 text-sm font-semibold text-foreground">
									{formatMoney(tier.total, currency)}
								</span>
							</button>
						);
					})}

					{/* Switch back to the single vial */}
					<button
						type="button"
						onClick={() => select(singleId)}
						className={cn(
							"flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
							isPackSelected
								? "text-emerald-400 hover:bg-emerald-500/10"
								: "cursor-default text-muted-foreground",
						)}
						disabled={!isPackSelected}
					>
						{isPackSelected
							? "← Back to single vial"
							: `Single vial · ${formatMoney(singleUnitPrice, currency)} each`}
					</button>
				</div>
			)}
		</div>
	);
}
