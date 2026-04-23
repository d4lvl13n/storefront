import Link from "next/link";
import { LinkWithChannel } from "../atoms/link-with-channel";
import { ChannelSelect } from "./channel-select";
import { ChannelsListDocument, MenuGetBySlugDocument } from "@/gql/graphql";
import { executePublicGraphQL } from "@/lib/graphql";
import { CopyrightText } from "./copyright-text";
import { Logo } from "./shared/logo";
import { PaymentBadges } from "./payment-badges";

// Default footer links when no CMS data is available
const defaultFooterLinks = {
	support: [
		{ label: "Contact Us", href: "/contact" },
		{ label: "FAQs", href: "/faq" },
		{ label: "About", href: "/about" },
	],
	tools: [
		{ label: "Peptide Calculator", href: "/peptide-calculator" },
		{ label: "Partner Program", href: "/affiliate" },
	],
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
							USA premium research peptides and biotech compounds. Every product is tested and verified by
							trusted US labs — purity (HPLC and MS), endotoxins, heavy metals, microbial safety, and spectral
							analysis — to guarantee the integrity of your research results.
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
							</div>
							<div>
								<h4 className="mb-4 text-sm font-medium text-foreground">Legal</h4>
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
						<PaymentBadges />
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
								Partner Program
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
