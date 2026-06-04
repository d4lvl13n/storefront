/**
 * Google Analytics 4 — measurement ID.
 *
 * - Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to override (any environment).
 * - In production, defaults to the live property when the env var is unset.
 * - In development, GA is off unless `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set (avoids dirty dev data).
 */
const DEFAULT_PRODUCTION_GA_ID = "G-KWEQ7ERZT6";

export function getGoogleAnalyticsMeasurementId(): string | undefined {
	const fromEnv = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
	if (fromEnv) {
		return fromEnv;
	}
	if (process.env.NODE_ENV === "production") {
		return DEFAULT_PRODUCTION_GA_ID;
	}
	return undefined;
}

/**
 * Google Tag Manager — container ID.
 *
 * - Set `NEXT_PUBLIC_GTM_ID` to override (any environment).
 * - In production, defaults to the live container when the env var is unset.
 * - In development, GTM is off unless `NEXT_PUBLIC_GTM_ID` is set (avoids dirty dev data).
 */
const DEFAULT_PRODUCTION_GTM_ID = "GTM-55X7GSQP";

export function getGoogleTagManagerId(): string | undefined {
	const fromEnv = process.env.NEXT_PUBLIC_GTM_ID?.trim();
	if (fromEnv) {
		return fromEnv;
	}
	if (process.env.NODE_ENV === "production") {
		return DEFAULT_PRODUCTION_GTM_ID;
	}
	return undefined;
}
