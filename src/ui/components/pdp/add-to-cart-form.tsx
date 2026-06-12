"use client";

import { type ReactNode, useActionState } from "react";
import { AddToCartSync, type AddToCartTrackingItem } from "./add-to-cart-sync";

export type AddToCartActionState =
	| { status: "idle" }
	| { status: "success" }
	| { status: "error"; message: string };

export type AddToCartAction = (
	state: AddToCartActionState,
	formData: FormData,
) => Promise<AddToCartActionState>;

const initialState: AddToCartActionState = { status: "idle" };

export function AddToCartForm({
	action,
	children,
	className,
	item,
}: {
	action: AddToCartAction;
	children: ReactNode;
	className?: string;
	item?: AddToCartTrackingItem;
}) {
	const [state, formAction] = useActionState(action, initialState);

	return (
		<form action={formAction} className={className}>
			{children}
			<AddToCartSync item={item} result={state} />
			{state.status === "error" && (
				<p className="text-sm text-destructive" role="status" aria-live="polite">
					{state.message}
				</p>
			)}
		</form>
	);
}
