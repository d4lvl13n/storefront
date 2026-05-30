"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useCart } from "@/ui/components/cart/cart-context";

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
 */
export function AddToCartSync() {
	const { pending } = useFormStatus();
	const { openCart } = useCart();
	const router = useRouter();
	const wasPending = useRef(false);

	useEffect(() => {
		if (wasPending.current && !pending) {
			router.refresh();
			openCart();
		}
		wasPending.current = pending;
	}, [pending, router, openCart]);

	return null;
}
