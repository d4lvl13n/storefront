import { Suspense } from "react";
import { Logo } from "./logo";
import { CartNavItem } from "./nav/components/cart-nav-item";
import { UserMenuContainer } from "./nav/components/user-menu/user-menu-container";
import { MobileMenu } from "./nav/components/mobile-menu";
import { SearchBar } from "./nav/components/search-bar";
import { ScrollHeader } from "./scroll-header";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

const primaryNavItems = [
	{ href: "/products", label: "Shop", description: "Full research catalog" },
	{ href: "/coa/find", label: "COA", description: "Verify batch documentation" },
	{ href: "/peptide-calculator", label: "Tools", description: "Protocol planning utilities" },
	{ href: "/research-library", label: "Research", description: "Peer-reviewed literature" },
	{ href: "/faq", label: "FAQ", description: "Shipping, storage, and orders" },
];

function SearchBarSkeleton() {
	return <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-secondary" />;
}

function DesktopNav() {
	return (
		<ul className="flex items-center gap-7">
			{primaryNavItems.map((item) => (
				<li key={item.href} className="inline-flex">
					<LinkWithChannel
						href={item.href}
						prefetch={false}
						className="text-[20px] font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{item.label}
					</LinkWithChannel>
				</li>
			))}
		</ul>
	);
}

function MobileNavItems({ channel }: { channel: string }) {
	return (
		<>
			<li className="pb-2">
				<Suspense fallback={<SearchBarSkeleton />}>
					<SearchBar channel={channel} />
				</Suspense>
			</li>
			{primaryNavItems.map((item) => (
				<li key={item.href}>
					<LinkWithChannel href={item.href} prefetch={false} className="block">
						<span className="block text-base font-medium text-foreground">{item.label}</span>
						<span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
					</LinkWithChannel>
				</li>
			))}
		</>
	);
}

export async function Header({ channel }: { channel: string }) {
	return (
		<ScrollHeader>
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-20 items-center justify-between gap-4">
					<Logo className="-my-1 h-14 w-auto sm:h-16 lg:h-[4.5rem]" />

					<nav className="hidden flex-1 justify-center lg:flex" aria-label="Primary navigation">
						<DesktopNav />
					</nav>

					<div className="hidden flex-1 justify-center md:flex lg:hidden">
						<LinkWithChannel
							href="/products"
							className="bg-background/70 inline-flex h-10 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-emerald-500/40 hover:bg-secondary"
						>
							Shop catalog
						</LinkWithChannel>
					</div>

					<div className="flex items-center gap-1.5">
						<div className="hidden w-[18rem] xl:block">
							<Suspense fallback={<SearchBarSkeleton />}>
								<SearchBar channel={channel} />
							</Suspense>
						</div>
						<div className="hidden 2xl:block">
							<LanguageSwitcher />
						</div>
						<ThemeToggle />
						<Suspense fallback={<div className="h-10 w-10" />}>
							<UserMenuContainer />
						</Suspense>
						<Suspense fallback={<div className="h-10 w-10" />}>
							<CartNavItem channel={channel} />
						</Suspense>
						<Suspense>
							<MobileMenu>
								<MobileNavItems channel={channel} />
							</MobileMenu>
						</Suspense>
					</div>
				</div>
			</div>
		</ScrollHeader>
	);
}
