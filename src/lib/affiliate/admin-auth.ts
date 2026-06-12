import { getCurrentUser } from "@/app/[channel]/(main)/account/get-current-user";

/**
 * Operator gate for the affiliate admin page (`/[channel]/affiliate/admin`).
 *
 * Reuses the storefront's Saleor login: the operator signs in with their
 * normal account, and access is granted only when their email appears in the
 * `AFFILIATE_ADMIN_EMAILS` env var (comma-separated, case-insensitive).
 *
 * Fail-closed: no env var → nobody gets in. Must be called by the page AND
 * by every server action — never trust that the form came from a gated page.
 */

export type OperatorGate =
	| { status: "anonymous" }
	| { status: "forbidden"; email: string }
	| { status: "ok"; email: string };

function allowList(): string[] {
	return (process.env.AFFILIATE_ADMIN_EMAILS ?? "")
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

export async function getOperatorGate(): Promise<OperatorGate> {
	const user = await getCurrentUser();
	if (!user?.email) return { status: "anonymous" };

	const allowed = allowList();
	if (allowed.length === 0 || !allowed.includes(user.email.toLowerCase())) {
		return { status: "forbidden", email: user.email };
	}

	return { status: "ok", email: user.email };
}

/** For server actions: returns the operator email or throws. */
export async function requireOperator(): Promise<string> {
	const gate = await getOperatorGate();
	if (gate.status !== "ok") {
		throw new Error("Not authorized");
	}
	return gate.email;
}
