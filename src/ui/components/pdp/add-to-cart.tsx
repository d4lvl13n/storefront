"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Minus, Plus, ShoppingBag, ShieldCheck } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { cn } from "@/lib/utils";
import { freeShippingThresholdLabel } from "@/config/brand";

interface AddToCartProps {
	disabled?: boolean;
	disabledReason?: "no-selection" | "out-of-stock";
	/**
	 * When true (a bulk pack is selected) the pack IS the quantity, so we hide
	 * the stepper and submit a fixed quantity of 1 — never multiply pack_size.
	 */
	lockQuantity?: boolean;
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
		if (!disabled) return "Add to cart";
		if (disabledReason === "out-of-stock") return "Out of stock";
		return "Select options";
	};

	return (
		<Button
			type="submit"
			size="lg"
			variant="accent"
			disabled={disabled || pending}
			className={cn(
				"h-14 w-full text-base font-semibold transition-all duration-200",
				pending && "opacity-80",
			)}
		>
			<ShoppingBag className={cn("mr-2 h-5 w-5 transition-transform", pending && "scale-90")} />
			{getButtonText()}
		</Button>
	);
}

export function AddToCart({ disabled = false, disabledReason, lockQuantity = false }: AddToCartProps) {
	return (
		<div className="space-y-4">
			{/* Quantity: stepper for single vials; fixed at 1 for bulk packs */}
			{lockQuantity ? (
				<input type="hidden" name="quantity" value={1} />
			) : (
				<QuantityStepper disabled={disabled} />
			)}

			{/* Add to Cart Button */}
			<AddToCartButton disabled={disabled} disabledReason={disabledReason} />

			{/* Verify batch documentation (Certificate of Analysis picker) */}
			<LinkWithChannel
				href="/coa/find"
				className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-medium text-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
			>
				<ShieldCheck className="h-4 w-4" />
				View COA
			</LinkWithChannel>

			{/* Trust Signals */}
			<div className="flex items-center justify-center gap-6 pt-1 text-xs text-muted-foreground">
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
					Free delivery over {freeShippingThresholdLabel}
				</span>
			</div>
		</div>
	);
}
