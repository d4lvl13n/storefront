import { getGoogleTagManagerId } from "@/config/analytics";

/**
 * GTM bootstrap. Google asks for this "as high in the <head> as possible", but
 * the App Router owns <head> and `next/script strategy="beforeInteractive"` is
 * NOT equivalent: it serializes inline scripts into the `self.__next_s` queue,
 * which only executes after the Next.js bootstrap chunk loads.
 *
 * Instead we render a plain inline <script> as the first element of <body> —
 * the parser executes it immediately, before any Next.js JS — plus a
 * <link rel="preload"> that React hoists into <head>, so the gtm.js download
 * starts during head parsing exactly as it would with literal head placement.
 */
export function GoogleTagManager() {
	const gtmId = getGoogleTagManagerId();
	if (!gtmId) {
		return null;
	}

	return (
		<>
			{/* React hoists <link> into <head> — kicks off the gtm.js fetch early */}
			<link rel="preload" href={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`} as="script" />
			{/* eslint-disable-next-line @next/next/next-script-for-ga -- deliberate:
			    next/script beforeInteractive defers inline scripts behind the Next.js
			    bootstrap chunk (see component docblock) */}
			<script
				id="google-tag-manager"
				dangerouslySetInnerHTML={{
					__html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
				}}
			/>
		</>
	);
}

/**
 * GTM <noscript> fallback. Must be rendered immediately after the opening
 * <body> tag (Google's instructions) — see the root layout.
 */
export function GoogleTagManagerNoscript() {
	const gtmId = getGoogleTagManagerId();
	if (!gtmId) {
		return null;
	}

	return (
		<noscript>
			<iframe
				src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
				height="0"
				width="0"
				style={{ display: "none", visibility: "hidden" }}
				title="Google Tag Manager"
			/>
		</noscript>
	);
}
