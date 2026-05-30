"use server";

import { revalidatePath } from "next/cache";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import {
	CheckoutAddLineDocument,
	CheckoutDeleteLinesDocument,
	CheckoutLinesUpdateDocument,
} from "@/gql/graphql";
import * as Checkout from "@/lib/checkout";

/**
 * Reusable quick-add server action.
 *
 * Reads `channel`, `variantId` and (optional) `quantity` from the submitted
 * form, so any component — the PDP buy box, the cross-sell strip, etc. — can
 * drop a hidden-input <form> and add a line to the cart. Pairs with
 * <AddToCartSync /> for the open-drawer + refresh feedback.
 */
export async function addLineToCart(formData: FormData) {
	const channel = String(formData.get("channel") ?? "");
	const variantId = String(formData.get("variantId") ?? "");
	const rawQty = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
	const quantity = Number.isFinite(rawQty) ? Math.min(10, Math.max(1, rawQty)) : 1;

	if (!channel || !variantId) return;

	const checkout = await Checkout.findOrCreate({
		checkoutId: await Checkout.getIdFromCookies(channel),
		channel,
	});

	if (!checkout) {
		console.error("addLineToCart: failed to create checkout");
		return;
	}

	await Checkout.saveIdToCookie(channel, checkout.id);

	const result = await executeAuthenticatedGraphQL(CheckoutAddLineDocument, {
		variables: {
			id: checkout.id,
			productVariantId: decodeURIComponent(variantId),
			quantity,
		},
		cache: "no-cache",
	});

	if (!result.ok) {
		console.error("addLineToCart failed:", result.error.message);
		return;
	}

	revalidatePath(`/${channel}/cart`);
}

export async function deleteCartLine(checkoutId: string, lineId: string, channel: string) {
	const result = await executeAuthenticatedGraphQL(CheckoutDeleteLinesDocument, {
		variables: {
			checkoutId,
			lineIds: [lineId],
		},
		cache: "no-cache",
	});

	// If cart is now empty, clear the checkout cookie to start fresh next time
	if (result.ok) {
		const checkout = result.data.checkoutLinesDelete?.checkout;
		if (checkout && checkout.lines.length === 0) {
			await Checkout.clearCheckoutCookie(checkout.channel.slug);
		}
	}

	revalidatePath(`/${channel}/cart`);
	revalidatePath(`/${channel}`);
}

export async function updateCartLineQuantity(
	checkoutId: string,
	lineId: string,
	quantity: number,
	channel: string,
) {
	if (quantity < 1) {
		return deleteCartLine(checkoutId, lineId, channel);
	}

	await executeAuthenticatedGraphQL(CheckoutLinesUpdateDocument, {
		variables: {
			checkoutId,
			lines: [{ lineId, quantity }],
		},
		cache: "no-cache",
	});

	revalidatePath(`/${channel}/cart`);
	revalidatePath(`/${channel}`);
}
