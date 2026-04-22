"use client";

import type React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { Badge } from "@/ui/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProductCardData {
	id: string;
	name: string;
	slug: string;
	brand?: string | null;
	price: number;
	/** Maximum price in the variant range (used for "from X – Y" display) */
	maxPrice?: number | null;
	compareAtPrice?: number | null;
	currency: string;
	image: string;
	imageAlt?: string;
	hoverImage?: string | null;
	href: string;
	badge?: "Sale" | "New" | null;
	colors?: { name: string; hex: string }[];
	/** Available sizes for filtering (e.g., ["S", "M", "L"]) */
	sizes?: string[];
	/** Available concentrations / doses (e.g., ["5mg", "10mg"]) */
	concentrations?: string[];
	/** True when the product offers bulk / qty-based pricing (variant spread or metadata flag) */
	hasQtyDiscount?: boolean;
	/** Category for filtering */
	category?: { id: string; name: string; slug: string } | null;
	/** ISO date string for "newest" sorting */
	createdAt?: string | null;
	/** Whether this product has variants requiring selection (no quick add) */
	hasVariants?: boolean;
	/** Callback for quick add - if provided and no variants, enables quick add */
	onQuickAdd?: (productId: string) => void;
}

interface ProductCardProps {
	product: ProductCardData;
	priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
	const canQuickAdd = !product.hasVariants && product.onQuickAdd;

	const handleQuickAdd = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		product.onQuickAdd?.(product.id);
	};

	const formatPrice = (amount: number, currency: string) => {
		return new Intl.NumberFormat("en", {
			style: "currency",
			currency: currency,
		}).format(amount);
	};

	return (
		<article className="group">
			<Link href={product.href} className="block">
				{/* Card shell */}
				<div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-secondary to-card shadow-lg shadow-black/20 transition-all duration-500 hover:-translate-y-1 hover:border-emerald-500/15 hover:shadow-xl hover:shadow-emerald-900/20">
					{/* Image Container */}
					<div className="relative aspect-[3/4] overflow-hidden bg-secondary">
						<Image
							src={product.image}
							alt={product.imageAlt || product.name}
							fill
							sizes="(max-width: 1024px) 50vw, 33vw"
							className={cn(
								"object-cover transition-all duration-500 ease-out md:group-hover:scale-105",
								product.hoverImage && "md:group-hover:opacity-0",
							)}
							priority={priority}
						/>

						{product.hoverImage && (
							<Image
								src={product.hoverImage}
								alt={`${product.name} - alternate view`}
								fill
								sizes="(max-width: 1024px) 50vw, 33vw"
								className="object-cover opacity-0 transition-all duration-500 ease-out md:group-hover:scale-105 md:group-hover:opacity-100"
							/>
						)}

						{product.badge && (
							<Badge
								variant={product.badge === "Sale" ? "destructive" : "default"}
								className="absolute left-3 top-3"
							>
								{product.badge}
							</Badge>
						)}

						{canQuickAdd && (
							<div className="absolute bottom-0 left-0 right-0 hidden translate-y-2 p-3 opacity-0 transition-all duration-300 md:block md:group-hover:translate-y-0 md:group-hover:opacity-100">
								<Button
									className="w-full bg-emerald-500 text-white hover:bg-emerald-400"
									size="sm"
									onClick={handleQuickAdd}
									type="button"
								>
									<Plus className="mr-1.5 h-4 w-4" />
									Quick Add
								</Button>
							</div>
						)}
					</div>

					{/* Product Info */}
					<div className="border-t border-border px-4 py-4">
						{product.brand && (
							<p className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-400/80">
								{product.brand}
							</p>
						)}
						<h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors md:group-hover:text-foreground">
							{product.name}
						</h3>

						{product.colors && product.colors.length > 1 && (
							<div className="mt-2 flex items-center gap-1.5">
								{product.colors.slice(0, 4).map((color) => (
									<span
										key={color.name}
										className="h-3.5 w-3.5 rounded-full border border-white/10"
										style={{ backgroundColor: color.hex }}
										title={color.name}
									/>
								))}
								{product.colors.length > 4 && (
									<span className="ml-0.5 text-xs text-muted-foreground">+{product.colors.length - 4}</span>
								)}
							</div>
						)}

						{product.concentrations && product.concentrations.length > 0 && (
							<div
								className="mt-2 flex flex-wrap items-center gap-1"
								aria-label={`Available concentrations: ${product.concentrations.join(", ")}`}
							>
								{product.concentrations.slice(0, 4).map((dose) => (
									<span
										key={dose}
										className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400"
									>
										{dose}
									</span>
								))}
								{product.concentrations.length > 4 && (
									<span className="text-[11px] text-muted-foreground">
										+{product.concentrations.length - 4}
									</span>
								)}
							</div>
						)}

						<div className="mt-2 flex items-baseline gap-2">
							{product.maxPrice && product.maxPrice > product.price ? (
								<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									From
								</span>
							) : null}
							<span className="font-semibold text-foreground">
								{formatPrice(product.price, product.currency)}
							</span>
							{product.compareAtPrice && (
								<span className="text-sm text-muted-foreground line-through">
									{formatPrice(product.compareAtPrice, product.currency)}
								</span>
							)}
						</div>

						{product.hasQtyDiscount && (
							<p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
								<svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-11.707a1 1 0 00-1.414 0L7.586 8H6a1 1 0 100 2h1.586l-.293.293a1 1 0 101.414 1.414l2-2a1 1 0 000-1.414l-2-2z"
										clipRule="evenodd"
									/>
								</svg>
								Bulk pricing available
							</p>
						)}
					</div>
				</div>
			</Link>
		</article>
	);
}
