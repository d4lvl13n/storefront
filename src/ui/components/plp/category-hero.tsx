import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
	label: string;
	href: string;
}

interface CategoryHeroProps {
	title: string;
	description?: string | null;
	backgroundImage?: string | null;
	breadcrumbs: BreadcrumbItem[];
}

export function CategoryHero({ title, description, backgroundImage, breadcrumbs }: CategoryHeroProps) {
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

				<h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">{title}</h1>
				{description && (
					<p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
						{description}
					</p>
				)}
			</div>
		</section>
	);
}
