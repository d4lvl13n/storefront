"use client";

import { useEffect, useState } from "react";

/**
 * Hero scroll indicator that fades out once the user has started scrolling,
 * so it doesn't bounce forever.
 */
export function HeroScrollIndicator() {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const onScroll = () => {
			if (window.scrollY > 40) setVisible(false);
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div
			aria-hidden="true"
			className={`absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce transition-opacity duration-500 ${
				visible ? "opacity-100" : "pointer-events-none opacity-0"
			}`}
		>
			<div className="flex h-10 w-6 justify-center rounded-full border-2 border-muted-foreground pt-2">
				<div className="h-2 w-1 rounded-full bg-muted-foreground" />
			</div>
		</div>
	);
}
