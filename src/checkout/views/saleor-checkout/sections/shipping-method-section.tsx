"use client";

import { type FC } from "react";
import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckoutFragment } from "@/checkout/graphql";
import { formatShippingPrice } from "@/checkout/lib/utils/money";

interface ShippingMethodSectionProps {
	methods: NonNullable<CheckoutFragment["shippingMethods"]>;
	selectedMethodId?: string;
	onSelect: (id: string) => void;
	busy?: boolean;
}

/**
 * Shipping-method picker shown inline on the Information step (the dedicated
 * shipping step was removed). Methods only exist once a shipping address is on
 * the checkout; the first is auto-selected so a fee always shows in the summary.
 */
export const ShippingMethodSection: FC<ShippingMethodSectionProps> = ({
	methods,
	selectedMethodId,
	onSelect,
	busy = false,
}) => {
	if (methods.length === 0) return null;

	return (
		<section className="space-y-4">
			<h2 className="text-xl font-semibold">Shipping method</h2>
			<div className="space-y-3">
				{methods.map((method) => {
					const isSelected = selectedMethodId === method.id;
					const isFree = method.price?.amount === 0;
					return (
						<label
							key={method.id}
							className={cn(
								"flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors",
								"focus-within:ring-2 focus-within:ring-foreground focus-within:ring-offset-2",
								isSelected
									? "bg-muted/30 border-foreground"
									: "hover:border-muted-foreground/50 border-border",
								busy && "opacity-70",
							)}
						>
							<input
								type="radio"
								name="shippingMethod"
								value={method.id}
								checked={isSelected}
								onChange={() => onSelect(method.id)}
								disabled={busy}
								className="sr-only"
							/>
							<div
								className={cn(
									"flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
									isSelected ? "border-foreground" : "border-muted-foreground/50",
								)}
							>
								{isSelected && <div className="h-2.5 w-2.5 rounded-full bg-foreground" />}
							</div>
							<Truck className="h-5 w-5 shrink-0 text-muted-foreground" />
							<div className="flex-1">
								<span className="font-medium">{method.name}</span>
								{method.minimumDeliveryDays && method.maximumDeliveryDays && (
									<p className="text-sm text-muted-foreground">
										{method.minimumDeliveryDays}-{method.maximumDeliveryDays} business days
									</p>
								)}
							</div>
							<span className={cn("font-medium", isFree && "text-green-600")}>
								{formatShippingPrice(method.price)}
							</span>
						</label>
					);
				})}
			</div>
		</section>
	);
};
