import { type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { brandConfig, formatPageTitle } from "@/config/brand";

export const metadata = {
	title: formatPageTitle("Checkout"),
	description: brandConfig.description,
};

export default function RootLayout(props: { children: ReactNode }) {
	return (
		<>
			{/*
			 * Warm DNS + TLS to the SellAbroad widget host up front. The widget
			 * <script> URL is only known after transactionInitialize returns, so the
			 * connection would otherwise be cold when it's injected; preconnecting
			 * here shaves the handshake off the critical path.
			 */}
			<link rel="preconnect" href="https://app.sellabroad.com" crossOrigin="anonymous" />
			<link rel="dns-prefetch" href="https://app.sellabroad.com" />
			<main className="min-h-screen bg-background">
				<AuthProvider>{props.children}</AuthProvider>
			</main>
		</>
	);
}
