"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { ShoppingBag } from "lucide-react";
import { throttle } from "lodash-es";
import { Button } from "@/ui/components/ui/button";
import { cn } from "@/lib/utils";

/** Scroll threshold (in pixels) before showing the sticky bar */
const SCROLL_THRESHOLD = 500;

function subscribeToScroll(callback: () => void) {
	const handler = throttle(callback, 100);
	window.addEventListener("scroll", handler, { passive: true });
	return () => {
		handler.cancel();
		window.removeEventListener("scroll", handler);
	};
}

function getScrollSnapshot() {
	return window.scrollY > SCROLL_THRESHOLD;
}

function getServerScrollSnapshot() {
	return false;
}

interface StickyBarProps {
	productName: string;
	price: string;
	show?: boolean;
}

function StickyAddButton() {
	const { pending } = useFormStatus();

	return (
		<Button
			type="submit"
			size="lg"
			variant="accent"
			disabled={pending}
			className={cn(
				"min-w-[130px] shrink-0",
				// Override transition to prevent flash on state change
				"transition-none disabled:opacity-100",
			)}
		>
			<ShoppingBag className="h-4 w-4" />
			{pending ? "Adding..." : "Add to bag"}
		</Button>
	);
}

export function StickyBar({ productName, price, show = false }: StickyBarProps) {
	const scrolledPastThreshold = useSyncExternalStore(
		subscribeToScroll,
		getScrollSnapshot,
		getServerScrollSnapshot,
	);

	// Only show if both conditions are met
	const isVisible = show && scrolledPastThreshold;

	return (
		<div
			className={cn(
				"fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-emerald-500/70 bg-card shadow-[0_12px_45px_-10px_rgba(16,185,129,0.4)] transition-all duration-300 sm:inset-x-4 sm:bottom-4",
				isVisible
					? "translate-y-0 opacity-100"
					: "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0",
			)}
		>
			<div className="flex items-center justify-between gap-4 px-4 py-3">
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium">{productName}</p>
					<p className="text-sm text-muted-foreground">{price}</p>
				</div>
				<StickyAddButton />
			</div>
		</div>
	);
}
