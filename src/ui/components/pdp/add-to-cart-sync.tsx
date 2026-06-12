"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useCart } from "@/ui/components/cart/cart-context";
import { trackAddToCart } from "@/lib/analytics/track";
import type { AddToCartActionState } from "./add-to-cart-form";

/** The item currently wired to the add-to-cart form (the selected variant/pack). */
export interface AddToCartTrackingItem {
	id: string;
	name: string;
	variant?: string;
	sku?: string;
	/** Unit price in major currency units. */
	price: number;
	currency: string;
}

/**
 * Invisible helper that lives inside the PDP add-to-cart <form>.
 *
 * The add-to-cart server action revalidates the cart route but does not, on its
 * own, refresh the header badge / drawer that are server-rendered on the current
 * route. When the action finishes (pending transitions true -> false) this:
 *   1. router.refresh() — re-renders the layout so the cart badge + drawer pick
 *      up the new line.
 *   2. openCart() — slides the cart drawer open as add-to-cart confirmation
 *      (which also surfaces the free-shipping progress bar at the ideal moment).
 *   3. trackAddToCart() — GA4 `add_to_cart` + Klaviyo `Added to Cart`, using the
 *      quantity actually submitted (read from the in-flight FormData). Bulk packs
 *      flow through here too: the pack variant is `item`, with quantity 1.
 */
export function AddToCartSync({
	item,
	result,
}: {
	item?: AddToCartTrackingItem;
	result: AddToCartActionState;
}) {
	const { pending, data } = useFormStatus();
	const { openCart } = useCart();
	const router = useRouter();
	const wasPending = useRef(false);
	// Capture the submitted FormData while the action is in flight; `data` is null
	// again by the time pending flips back to false, so stash it from an effect.
	const submitted = useRef<FormData | null>(null);
	useEffect(() => {
		if (pending && data) submitted.current = data;
	}, [pending, data]);

	useEffect(() => {
		if (wasPending.current && !pending) {
			if (result.status === "success") {
				router.refresh();
				openCart();
			}
			if (result.status === "success" && item) {
				const rawQty = Number(submitted.current?.get("quantity") ?? 1);
				const quantity = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
				trackAddToCart({
					currency: item.currency,
					items: [
						{
							id: item.id,
							name: item.name,
							variant: item.variant,
							sku: item.sku,
							price: item.price,
							quantity,
						},
					],
				});
			}
		}
		wasPending.current = pending;
	}, [pending, router, openCart, item, result.status]);

	return null;
}
