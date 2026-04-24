import Script from "next/script";

/**
 * Klaviyo onsite tracking snippet.
 *
 * Loads klaviyo.js and bootstraps the in-page queue so any `klaviyo.push(...)`
 * calls fired before the SDK finishes loading are replayed once it does.
 *
 * Company ID is a public identifier (also visible in the script URL), so the
 * public Klaviyo public key is safe to ship to the browser. The value can be
 * overridden per environment via NEXT_PUBLIC_KLAVIYO_COMPANY_ID.
 */
export function Klaviyo() {
	const companyId = process.env.NEXT_PUBLIC_KLAVIYO_COMPANY_ID ?? "VQxsBE";

	if (!companyId) {
		return null;
	}

	return (
		<>
			<Script
				id="klaviyo-init"
				strategy="afterInteractive"
			>{`!function(){if(!window.klaviyo){window._klOnsite=window._klOnsite||[];try{window.klaviyo=new Proxy({},{get:function(n,i){return"push"===i?function(){var n;(n=window._klOnsite).push.apply(n,arguments)}:function(){for(var n=arguments.length,o=new Array(n),w=0;w<n;w++)o[w]=arguments[w];var t="function"==typeof o[o.length-1]?o.pop():void 0,e=new Promise((function(n){window._klOnsite.push([i].concat(o,[function(i){t&&t(i),n(i)}]))}));return e}}})}catch(n){window.klaviyo=window.klaviyo||[],window.klaviyo.push=function(){var n;(n=window._klOnsite).push.apply(n,arguments)}}}}();`}</Script>
			<Script
				id="klaviyo-onsite"
				src={`https://static.klaviyo.com/onsite/js/${companyId}/klaviyo.js?company_id=${companyId}`}
				strategy="afterInteractive"
			/>
		</>
	);
}
