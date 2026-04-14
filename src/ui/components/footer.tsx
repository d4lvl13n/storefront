import Link from "next/link";
import { LinkWithChannel } from "../atoms/link-with-channel";
import { ChannelSelect } from "./channel-select";
import { ChannelsListDocument, MenuGetBySlugDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { CopyrightText } from "./copyright-text";
import { Logo } from "./shared/logo";

// Default footer links when no CMS data is available
const defaultFooterLinks = {
	support: [
		{ label: "Contact Us", href: "/contact" },
		{ label: "FAQs", href: "/faq" },
		{ label: "About", href: "/about" },
		{ label: "Affiliate Program", href: "/affiliate" },
	],
	tools: [{ label: "Peptide Calculator", href: "/peptide-calculator" }],
	legal: [
		{ label: "Privacy Policy", href: "/privacy" },
		{ label: "Terms of Service", href: "/terms" },
		{ label: "RUO Policy", href: "/ruo-policy" },
		{ label: "Waiver Agreement", href: "/waiver" },
	],
};

/** Cached channels list - rarely changes */
async function getChannels() {
	if (!process.env.SALEOR_APP_TOKEN) {
		return null;
	}

	const result = await executePublicGraphQL(ChannelsListDocument, {
		headers: {
			Authorization: `Bearer ${process.env.SALEOR_APP_TOKEN}`,
		},
		revalidate: 60 * 60 * 24,
	});

	return result.ok ? result.data : null;
}

/** Cached footer menu */
async function getFooterMenu(channel: string) {
	const result = await executePublicGraphQL(MenuGetBySlugDocument, {
		variables: { slug: "footer", channel },
		revalidate: 60 * 60 * 24,
	});

	return result.ok ? result.data : null;
}

export async function Footer({ channel }: { channel: string }) {
	const [footerLinks, channels] = await Promise.all([getFooterMenu(channel), getChannels()]);

	const menuItems = footerLinks?.menu?.items || [];

	return (
		<footer className="bg-background text-muted-foreground">
			{/* Extra bottom padding on mobile to account for sticky add-to-cart bar */}
			<div className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pb-12 lg:px-8 lg:py-16">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
					{/* Brand */}
					<div className="col-span-2 md:col-span-1">
						<Link href={`/${channel}`} prefetch={false} className="mb-4 inline-block">
							<Logo className="h-10 w-auto sm:h-14" />
						</Link>
						<p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
							Premium research peptides and biotech compounds. Lab-verified purity you can trust.
						</p>
					</div>

					{/* Dynamic menu items from Saleor CMS */}
					{menuItems.map((item) => (
						<div key={item.id}>
							<h4 className="mb-4 text-sm font-medium text-foreground">{item.name}</h4>
							<ul className="space-y-3">
								{item.children?.map((child) => {
									if (child.category) {
										return (
											<li key={child.id}>
												<LinkWithChannel
													href={`/categories/${child.category.slug}`}
													prefetch={false}
													className="text-sm text-muted-foreground transition-colors hover:text-foreground"
												>
													{child.category.name}
												</LinkWithChannel>
											</li>
										);
									}
									if (child.collection) {
										return (
											<li key={child.id}>
												<LinkWithChannel
													href={`/collections/${child.collection.slug}`}
													prefetch={false}
													className="text-sm text-muted-foreground transition-colors hover:text-foreground"
												>
													{child.collection.name}
												</LinkWithChannel>
											</li>
										);
									}
									if (child.page) {
										return (
											<li key={child.id}>
												<LinkWithChannel
													href={`/pages/${child.page.slug}`}
													prefetch={false}
													className="text-sm text-muted-foreground transition-colors hover:text-foreground"
												>
													{child.page.title}
												</LinkWithChannel>
											</li>
										);
									}
									if (child.url) {
										return (
											<li key={child.id}>
												<Link
													href={child.url}
													prefetch={false}
													className="text-sm text-muted-foreground transition-colors hover:text-foreground"
												>
													{child.name}
												</Link>
											</li>
										);
									}
									return null;
								})}
							</ul>
						</div>
					))}

					{/* Static links (if no CMS data) */}
					{menuItems.length === 0 && (
						<>
							<div>
								<h4 className="mb-4 text-sm font-medium text-foreground">Support</h4>
								<ul className="space-y-3">
									{defaultFooterLinks.support.map((link) => (
										<li key={link.href}>
											<LinkWithChannel
												href={link.href}
												prefetch={false}
												className="text-sm text-muted-foreground transition-colors hover:text-foreground"
											>
												{link.label}
											</LinkWithChannel>
										</li>
									))}
								</ul>
							</div>
							<div>
								<h4 className="mb-4 text-sm font-medium text-foreground">Tools</h4>
								<ul className="space-y-3">
									{defaultFooterLinks.tools.map((link) => (
										<li key={link.href}>
											<LinkWithChannel
												href={link.href}
												prefetch={false}
												className="text-sm text-muted-foreground transition-colors hover:text-foreground"
											>
												{link.label}
											</LinkWithChannel>
										</li>
									))}
								</ul>
								<h4 className="mb-4 mt-8 text-sm font-medium text-foreground">Legal</h4>
								<ul className="space-y-3">
									{defaultFooterLinks.legal.map((link) => (
										<li key={link.href}>
											<LinkWithChannel
												href={link.href}
												prefetch={false}
												className="text-sm text-muted-foreground transition-colors hover:text-foreground"
											>
												{link.label}
											</LinkWithChannel>
										</li>
									))}
								</ul>
							</div>
						</>
					)}
				</div>

				{/* Channel selector */}
				{channels?.channels && (
					<div className="mt-8 text-muted-foreground">
						<label className="flex items-center gap-2 text-sm">
							<span>Change currency:</span>
							<ChannelSelect channels={channels.channels} />
						</label>
					</div>
				)}

				{/* Bottom bar */}
				<div className="mt-12 border-t border-border pt-8">
					{/* Payment methods */}
					<div className="mb-6 flex flex-wrap items-center gap-3">
						<span className="text-xs text-muted-foreground">Accepted payments:</span>
						{/* Visa */}
						<div className="flex h-7 items-center rounded border border-border bg-card px-2">
							<svg viewBox="0 0 48 16" className="h-4 w-auto fill-foreground">
								<path d="M18.7 1.1L15.4 15H12L15.3 1.1h3.4zM32.2 10l1.8-5 1 5h-2.8zM35.7 15h3.1L36 1.1h-2.9c-.6 0-1.2.4-1.4 1L26.9 15h3.3l.7-1.8h4l.8 1.8zM25.5 10.7c0-3.3-4.6-3.5-4.6-5 0-.4.5-.9 1.4-.9 1.3 0 2.3.3 3 .6l.5-3A9 9 0 0023 2c-3.1 0-5.3 1.7-5.3 4 0 2.8 3.8 3 3.8 4.5 0 .6-.6 1-1.7 1-1.4 0-2.8-.4-3.6-.8l-.5 3.1c.9.4 2.5.8 4.2.8 3.3 0 5.6-1.6 5.6-3.9zM13.5 1.1L8.2 15H4.8L2.2 3.7C2 2.9 1.8 2.6 1.2 2.3 0 1.8-.2 1.4 0 1.2L0 1.1h5.4c.7 0 1.3.5 1.4 1.2l1.4 7.6 3.4-8.8h3.9z" />
							</svg>
						</div>
						{/* Mastercard */}
						<div className="flex h-7 items-center rounded border border-border bg-card px-2">
							<svg viewBox="0 0 38 24" className="h-5 w-auto">
								<circle cx="15" cy="12" r="7" fill="#eb001b" />
								<circle cx="23" cy="12" r="7" fill="#f79e1b" />
								<path d="M19 7.2A7 7 0 0122 12a7 7 0 01-3 4.8A7 7 0 0116 12a7 7 0 013-4.8z" fill="#ff5f00" />
							</svg>
						</div>
						{/* Amex */}
						<div className="flex h-7 items-center rounded border border-border bg-card px-2">
							<svg viewBox="0 0 50 16" className="h-4 w-auto">
								<path d="M0 0h50v16H0z" fill="#016fd0" />
								<path
									d="M5 4h3l1 2.5L10 4h3v8h-2.5V7l-1.5 3h-1L6.5 7v5H4V4h1zm12 0h6v2h-3.5v1H23v2h-3.5v1H23v2h-6V4zm9 0h4l2 3 2-3h4l-3.5 4 3.5 4h-4l-2-3-2 3h-4l3.5-4L26 4z"
									fill="white"
								/>
							</svg>
						</div>
						{/* Crypto */}
						<div className="flex h-7 items-center gap-1.5 rounded border border-border bg-card px-2">
							<svg viewBox="0 0 24 24" className="h-4 w-4 fill-amber-500">
								<path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.974.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.415-.614.32.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z" />
							</svg>
							<span className="text-[10px] font-medium text-muted-foreground">Crypto</span>
						</div>
						{/* Bank Transfer */}
						<div className="flex h-7 items-center gap-1.5 rounded border border-border bg-card px-2">
							<svg
								viewBox="0 0 24 24"
								className="h-4 w-4 fill-muted-foreground"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M2 10h20v2H2v-2zm0 4h20v2H2v-2zM12 2L2 7h20L12 2zM4 18h2v2H4v-2zm4 0h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" />
							</svg>
							<span className="text-[10px] font-medium text-muted-foreground">Wire</span>
						</div>
					</div>

					<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
						<p className="text-xs text-muted-foreground">
							<CopyrightText />
						</p>
						<div className="flex items-center gap-6">
							<LinkWithChannel
								href="/affiliate"
								prefetch={false}
								className="text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								Affiliate Program
							</LinkWithChannel>
							<LinkWithChannel
								href="/privacy"
								prefetch={false}
								className="text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								Privacy Policy
							</LinkWithChannel>
							<LinkWithChannel
								href="/terms"
								prefetch={false}
								className="text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								Terms of Service
							</LinkWithChannel>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
