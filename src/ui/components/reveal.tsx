"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-reveal wrapper — fades + slides its content in the first time it
 * enters the viewport. Zero-dependency (IntersectionObserver + CSS), and
 * respects prefers-reduced-motion via Tailwind's `motion-safe` variant, so
 * reduced-motion users always see fully-visible, unanimated content.
 */
export function Reveal({
	children,
	className,
	delayMs = 0,
}: {
	children: ReactNode;
	className?: string;
	delayMs?: number;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [shown, setShown] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		// If the browser can't observe, reveal on the next frame (deferred so we
		// never call setState synchronously inside the effect body).
		if (typeof IntersectionObserver === "undefined") {
			const raf = requestAnimationFrame(() => setShown(true));
			return () => cancelAnimationFrame(raf);
		}

		const io = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setShown(true);
					io.disconnect();
				}
			},
			{ threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<div
			ref={ref}
			style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
			className={cn(
				"motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
				shown ? "translate-y-0 opacity-100" : "motion-safe:translate-y-8 motion-safe:opacity-0",
				className,
			)}
		>
			{children}
		</div>
	);
}
