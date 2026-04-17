"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { cn } from "@/lib/utils";

interface AddToCartProps {
	price: string;
	compareAtPrice?: string | null;
	discountPercent?: number | null;
	disabled?: boolean;
	disabledReason?: "no-selection" | "out-of-stock";
}

const MAX_QTY = 10;

function QuantityStepper({ disabled }: { disabled?: boolean }) {
	const [qty, setQty] = useState(1);
	const dec = () => setQty((q) => Math.max(1, q - 1));
	const inc = () => setQty((q) => Math.min(MAX_QTY, q + 1));

	return (
		<div className="flex items-center gap-3">
			<span className="text-sm font-medium text-muted-foreground">Quantity</span>
			<div className="inline-flex items-center rounded-full border border-border bg-background">
				<button
					type="button"
					aria-label="Decrease quantity"
					onClick={dec}
					disabled={disabled || qty <= 1}
					className="flex h-10 w-10 items-center justify-center rounded-l-full text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Minus className="h-4 w-4" />
				</button>
				<span aria-live="polite" className="w-10 text-center text-sm font-semibold tabular-nums">
					{qty}
				</span>
				<button
					type="button"
					aria-label="Increase quantity"
					onClick={inc}
					disabled={disabled || qty >= MAX_QTY}
					className="flex h-10 w-10 items-center justify-center rounded-r-full text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Plus className="h-4 w-4" />
				</button>
			</div>
			<input type="hidden" name="quantity" value={qty} />
		</div>
	);
}

function AddToCartButton({
	disabled,
	disabledReason,
}: {
	disabled?: boolean;
	disabledReason?: "no-selection" | "out-of-stock";
}) {
	const { pending } = useFormStatus();

	const getButtonText = () => {
		if (pending) return "Adding...";
		if (!disabled) return "Add to bag";
		if (disabledReason === "out-of-stock") return "Out of stock";
		return "Select options";
	};

	// Simple, clean - no success state needed
	// The cart badge/drawer updating IS the feedback (like Apple)
	return (
		<Button
			type="submit"
			size="lg"
			disabled={disabled || pending}
			className={cn("h-14 w-full text-base font-medium transition-all duration-200", pending && "opacity-80")}
		>
			<ShoppingBag className={cn("mr-2 h-5 w-5 transition-transform", pending && "scale-90")} />
			{getButtonText()}
		</Button>
	);
}

export function AddToCart({
	price,
	compareAtPrice,
	discountPercent,
	disabled = false,
	disabledReason,
}: AddToCartProps) {
	return (
		<div className="space-y-4">
			{/* Price Display */}
			<div className="flex items-baseline gap-3">
				<span className="text-2xl font-semibold tracking-tight">{price}</span>
				{compareAtPrice && (
					<>
						<span className="text-lg text-muted-foreground line-through">{compareAtPrice}</span>
						{discountPercent && (
							<span className="text-sm font-medium text-destructive">-{discountPercent}%</span>
						)}
					</>
				)}
			</div>

			{/* Quantity Stepper */}
			<QuantityStepper disabled={disabled} />

			{/* Add to Cart Button */}
			<AddToCartButton disabled={disabled} disabledReason={disabledReason} />

			{/* Trust Signals */}
			<div className="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
				<span className="flex items-center gap-1.5">
					<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</svg>
					Secure checkout
				</span>
				<span className="flex items-center gap-1.5">
					<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
						<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
						<path d="M9 22V12h6v10" />
					</svg>
					Free delivery over $150
				</span>
			</div>
		</div>
	);
}
