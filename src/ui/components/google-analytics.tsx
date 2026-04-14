import Script from "next/script";
import { getGoogleAnalyticsMeasurementId } from "@/config/analytics";

/**
 * GA4 via gtag.js. Uses `afterInteractive` so it does not block first paint.
 */
export function GoogleAnalytics() {
	const measurementId = getGoogleAnalyticsMeasurementId();
	if (!measurementId) {
		return null;
	}

	return (
		<>
			<Script
				src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
				strategy="afterInteractive"
			/>
			<Script id="google-analytics-gtag" strategy="afterInteractive">
				{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');
`}
			</Script>
		</>
	);
}
