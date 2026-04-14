import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import { DraftModeNotification } from "@/ui/components/draft-mode-notification";
import { GoogleAnalytics } from "@/ui/components/google-analytics";
import { ThemeProvider } from "@/ui/providers/theme-provider";
import { AgeGate } from "@/ui/components/age-gate";
import { rootMetadata } from "@/lib/seo";
import { localeConfig } from "@/config/locale";

/**
 * Root metadata for the entire site.
 * Configuration is in src/lib/seo/config.ts
 */
export const metadata = rootMetadata;

export default function RootLayout(props: { children: ReactNode }) {
	const { children } = props;

	return (
		<html
			lang={localeConfig.htmlLang}
			className={`${GeistSans.variable} ${GeistMono.variable} min-h-dvh`}
			suppressHydrationWarning
		>
			<body className="min-h-dvh font-sans" suppressHydrationWarning>
				<ThemeProvider>
					{children}
					<AgeGate />
				</ThemeProvider>
				<DraftModeNotification />
				<GoogleAnalytics />
				<Analytics />
			</body>
		</html>
	);
}
