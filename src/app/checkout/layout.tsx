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
			{/*
			 * Warm DNS + TLS to the SellAbroad widget + OMS hosts up front. After the
			 * widget mounts it runs a sequential chain against the OMS host
			 * (/carts/from-api → /checkout-settings → /payments/links) plus Stripe
			 * Elements, which is the skeleton→card-fields wait. Both prod and staging
			 * hosts are listed because the active one depends on the PSP app's env.
			 */}
			<link rel="preconnect" href="https://app.sellabroad.com" crossOrigin="anonymous" />
			<link rel="preconnect" href="https://oms.sellabroad.com" crossOrigin="anonymous" />
			<link rel="preconnect" href="https://app-staging.sellabroad.com" crossOrigin="anonymous" />
			<link rel="preconnect" href="https://oms-staging.sellabroad.com" crossOrigin="anonymous" />
			<link rel="dns-prefetch" href="https://oms.sellabroad.com" />
			<link rel="dns-prefetch" href="https://oms-staging.sellabroad.com" />
			<main className="min-h-screen bg-background">
				<AuthProvider>{props.children}</AuthProvider>
			</main>
		</>
	);
}
