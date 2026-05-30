import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PdpSectionProps {
	id?: string;
	label?: string;
	title?: string;
	/** Optional element rendered on the right of the header (e.g. a "View all" link) */
	action?: ReactNode;
	children: ReactNode;
	className?: string;
}

/**
 * Consistent full-width PDP section wrapper.
 *
 * Gives every below-the-fold section the same rhythm — top divider, brand
 * emerald label, heading and vertical padding — so the long-scroll PDP reads
 * as one editorial system rather than stacked widgets.
 */
export function PdpSection({ id, label, title, action, children, className }: PdpSectionProps) {
	return (
		<section
			id={id}
			aria-label={title ?? label}
			className={cn("border-t border-border bg-background", className)}
		>
			<div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
				{(label || title || action) && (
					<div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
						<div>
							{label && (
								<p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">{label}</p>
							)}
							{title && <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>}
						</div>
						{action}
					</div>
				)}
				{children}
			</div>
		</section>
	);
}
