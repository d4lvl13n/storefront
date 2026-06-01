import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface BreadcrumbItem {
	label: string;
	href: string;
}

/** A trust badge shown on the right of the hero (icon + short label). */
export interface HeroBadge {
	icon: LucideIcon;
	title: string;
	subtitle: string;
}

interface CategoryHeroProps {
	title: string;
	description?: string | null;
	backgroundImage?: string | null;
	breadcrumbs: BreadcrumbItem[];
	/** Optional trust badges rendered as the hero's right column. Omit to keep the hero copy-only. */
	badges?: HeroBadge[];
}

export function CategoryHero({
	title,
	description,
	backgroundImage,
	breadcrumbs,
	badges,
}: CategoryHeroProps) {
	const hasBadges = (badges?.length ?? 0) > 0;

	return (
		<section className="relative overflow-hidden bg-background pb-12 pt-10 sm:pb-16 sm:pt-14">
			{/* Ambient glow */}
			<div className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-emerald-500/[0.06] blur-[100px]" />
			<div className="pointer-events-none absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-teal-500/[0.04] blur-[80px]" />

			{backgroundImage && (
				<div className="absolute inset-0">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={backgroundImage} alt={title} className="h-full w-full object-cover" />
					<div className="absolute inset-0 bg-gradient-to-r from-background via-background to-background" />
				</div>
			)}

			{/* Bottom border glow */}
			<div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

			<div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between md:gap-10 lg:gap-16">
					{/* Copy */}
					<div className="max-w-xl">
						{/* Breadcrumbs */}
						<nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
							{breadcrumbs.map((crumb, index) => (
								<span key={crumb.href} className="flex items-center gap-1.5">
									{index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
									{index === breadcrumbs.length - 1 ? (
										<span className="font-medium text-foreground">{crumb.label}</span>
									) : (
										<Link href={crumb.href} className="transition-colors hover:text-foreground">
											{crumb.label}
										</Link>
									)}
								</span>
							))}
						</nav>

						<h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
							{title}
						</h1>
						{description && (
							<p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
								{description}
							</p>
						)}
					</div>

					{/* Trust badges — sit on the right, level with the copy */}
					{hasBadges && (
						<ul className="flex shrink-0 animate-fade-in-up-delay-2 flex-col gap-5 opacity-0">
							{badges!.map((badge) => {
								const Icon = badge.icon;
								return (
									<li key={badge.title} className="group flex items-start gap-3.5">
										<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] transition-colors duration-300 group-hover:border-emerald-500/30">
											<Icon className="h-[18px] w-[18px] text-emerald-400" strokeWidth={1.75} />
										</span>
										<span className="min-w-0 pt-0.5">
											<span className="block text-sm font-semibold leading-tight text-foreground">
												{badge.title}
											</span>
											<span className="mt-1 block text-xs leading-snug text-muted-foreground">
												{badge.subtitle}
											</span>
										</span>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
