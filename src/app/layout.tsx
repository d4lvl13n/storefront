import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DraftModeNotification } from "@/ui/components/draft-mode-notification";
import { GoogleAnalytics } from "@/ui/components/google-analytics";
import { GoogleTagManager, GoogleTagManagerNoscript } from "@/ui/components/google-tag-manager";
import { Klaviyo } from "@/ui/components/klaviyo";
import { ThemeProvider } from "@/ui/providers/theme-provider";
import { ResearchGate } from "@/ui/components/research-gate";
import { rootMetadata } from "@/lib/seo";
import { localeConfig } from "@/config/locale";

/**
 * Root metadata for the entire site.
 * Configuration is in src/lib/seo/config.ts
 */
export const metadata = rootMetadata;

export default function RootLayout(props: { children: ReactNode }) {
	const { children } = props;

	// During a site-wide takedown (see src/middleware.ts) every route renders the
	// standalone /maintenance screen, so suppress the storefront overlays — the
	// research-use gate and the Klaviyo newsletter popup — that would otherwise
	// cover it. Read from env (not headers()) so normal pages aren't forced dynamic.
	const maintenanceMode = process.env.MAINTENANCE_MODE === "1";

	return (
		<html
			lang={localeConfig.htmlLang}
			className={`${GeistSans.variable} ${GeistMono.variable} min-h-dvh`}
			suppressHydrationWarning
		>
			<body className="min-h-dvh font-sans" suppressHydrationWarning>
				{/* First in <body>: parser-executed GTM bootstrap (+ preload hoisted to
				    <head>), then the noscript iframe — per Google's placement rules. */}
				<GoogleTagManager />
				<GoogleTagManagerNoscript />
				<ThemeProvider>
					{children}
					{!maintenanceMode && <ResearchGate />}
				</ThemeProvider>
				<DraftModeNotification />
				<GoogleAnalytics />
				{!maintenanceMode && <Klaviyo />}
				<Analytics />
				{/* Web Vitals collection — the dependency was installed but never rendered */}
				<SpeedInsights />
			</body>
		</html>
	);
}
