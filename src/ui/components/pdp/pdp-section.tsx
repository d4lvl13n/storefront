import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PdpSectionProps {
	id?: string;
	label?: string;
	title?: string;
	children: ReactNode;
	className?: string;
}

/**
 * Consistent full-width PDP section wrapper.
 *
 * Centered brand label + heading over a top divider, with generous vertical
 * padding, so every below-the-fold section reads as one editorial system.
 */
export function PdpSection({ id, label, title, children, className }: PdpSectionProps) {
	return (
		<section
			id={id}
			aria-label={title ?? label}
			className={cn("border-t border-border bg-background", className)}
		>
			<div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
				{(label || title) && (
					<div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
						{label && (
							<p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-400">{label}</p>
						)}
						{title && <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>}
					</div>
				)}
				{children}
			</div>
		</section>
	);
}
