"use server";

import { revalidatePath } from "next/cache";
import { executeAuthenticatedGraphQL } from "@/lib/graphql";
import {
	CheckoutAddLineDocument,
	CheckoutDeleteLinesDocument,
	CheckoutLinesUpdateDocument,
	TypedDocumentString,
} from "@/gql/graphql";
import * as Checkout from "@/lib/checkout";

// Hand-authored document (codegen can't run without a live Saleor API). It is
// the same TypedDocumentString class codegen emits, so it flows through the
// authenticated executor and carries the user's bearer token.
type CheckoutCustomerAttachResult = {
	checkoutCustomerAttach?: {
		errors?: Array<{ field?: string | null; message?: string | null; code?: string | null }>;
		checkout?: { id: string } | null;
	} | null;
};

const CheckoutCustomerAttachDocument = new TypedDocumentString<
	CheckoutCustomerAttachResult,
	{ checkoutId: string }
>(`
	mutation CheckoutCustomerAttach($checkoutId: ID!) {
		checkoutCustomerAttach(id: $checkoutId) {
			errors {
				field
				message
				code
			}
			checkout {
				id
			}
		}
	}
`);

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

/**
 * Binds the current anonymous cart to the now-authenticated user.
 *
 * Call right after sign-in so the cart the shopper built before logging in or
 * registering becomes *their* checkout — it isn't orphaned, and the order lands
 * in their history. Best-effort: it never throws and never blocks the redirect.
 * Runs server-side, so it reads the SDK auth cookie the client wrote during
 * sign-in and sends an authenticated request.
 */
export async function attachCheckoutToCustomer(channel: string) {
	const checkoutId = await Checkout.getIdFromCookies(channel);
	if (!checkoutId) return;

	const result = await executeAuthenticatedGraphQL(CheckoutCustomerAttachDocument, {
		variables: { checkoutId },
		cache: "no-cache",
	});

	if (!result.ok) {
		console.error("attachCheckoutToCustomer failed:", result.error.message);
		return;
	}

	// A non-empty errors array here is non-fatal: "cannot reassign" means the
	// checkout is already attached (typically to this same user). The cart cookie
	// stays valid either way, so we only log.
	const errors = result.data.checkoutCustomerAttach?.errors;
	if (errors?.length) {
		console.warn("attachCheckoutToCustomer:", errors.map((e) => e.message).join("; "));
	}
}
