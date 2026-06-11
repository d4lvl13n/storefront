"use client";

import { useEffect, useRef } from "react";
import { trackViewProduct, type AnalyticsItem } from "@/lib/analytics/track";

/**
 * Invisible client child of the (server-rendered) variant section. Fires the
 * Klaviyo `Viewed Product` event once per mount. VariantSectionDynamic re-streams
 * when the `?variant=` param changes, so a deliberate variant switch produces a
 * fresh view event — desired for browse-abandonment targeting.
 */
export function ProductViewTracker({ item, currency }: { item: AnalyticsItem; currency: string }) {
	const fired = useRef(false);

	useEffect(() => {
		if (fired.current) return;
		fired.current = true;
		trackViewProduct({ item, currency });
	}, [item, currency]);

	return null;
}
