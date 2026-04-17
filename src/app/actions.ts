"use server";

import { cookies } from "next/headers";
import { getServerAuthClient } from "@/lib/auth/server";
import * as Checkout from "@/lib/checkout";

export async function logout() {
	"use server";
	(await getServerAuthClient()).signOut();
}

/**
 * Clear the checkout cookie after a successful order.
 * Call this after checkoutComplete succeeds.
 */
export async function clearCheckout(channel: string) {
	"use server";
	await Checkout.clearCheckoutCookie(channel);
}

/**
 * Set the ruo_acknowledged cookie after the visitor affirms research-use terms.
 *
 * This affirmation is the memo-recommended gate (Frier Levitt Peptide Guidance
 * Memorandum, Section III.B.b — Affirmation of Use). The visitor attests that
 * products will be used for in-vitro laboratory research only, and not for
 * human or animal administration. Middleware reads the same cookie to block
 * direct-navigation access to sensitive routes.
 */
export async function acknowledgeResearchUse() {
	"use server";
	const jar = await cookies();
	jar.set("ruo_acknowledged", "1", {
		maxAge: 60 * 60 * 24 * 365, // 1 year
		path: "/",
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		httpOnly: false, // readable client-side so modal can hide without reload
	});
}
