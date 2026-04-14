"use client";

import clsx from "clsx";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

export function Pagination({
	pageInfo,
}: {
	pageInfo: {
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		endCursor?: string | null;
		startCursor?: string | null;
	};
}) {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Construct next and previous page URLs based on the current search parameters
	// and the pageInfo provided.
	const nextSearchParams = new URLSearchParams(searchParams);
	nextSearchParams.set("cursor", pageInfo.endCursor ?? "");
	nextSearchParams.set("direction", "next");
	const nextPageUrl = `${pathname}?${nextSearchParams.toString()}`;

	const prevSearchParams = new URLSearchParams(searchParams);
	prevSearchParams.set("cursor", pageInfo.startCursor ?? "");
	prevSearchParams.set("direction", "prev");
	const prevPageUrl = `${pathname}?${prevSearchParams.toString()}`;

	return (
		<nav className="flex items-center justify-center gap-x-3 px-4 pb-4 pt-14">
			<Link
				href={pageInfo.hasPreviousPage ? prevPageUrl : "#"}
				className={clsx("rounded-lg px-5 py-2.5 text-sm font-medium transition-all", {
					"border border-border bg-secondary text-foreground hover:border-muted-foreground hover:bg-card hover:text-foreground":
						pageInfo.hasPreviousPage,
					"cursor-not-allowed border border-border text-muted-foreground": !pageInfo.hasPreviousPage,
					"pointer-events-none": !pageInfo.hasPreviousPage,
				})}
				aria-disabled={!pageInfo.hasPreviousPage}
			>
				Previous
			</Link>

			<Link
				href={pageInfo.hasNextPage ? nextPageUrl : "#"}
				className={clsx("rounded-lg px-5 py-2.5 text-sm font-medium transition-all", {
					"border border-border bg-secondary text-foreground hover:border-muted-foreground hover:bg-card hover:text-foreground":
						pageInfo.hasNextPage,
					"cursor-not-allowed border border-border text-muted-foreground": !pageInfo.hasNextPage,
					"pointer-events-none": !pageInfo.hasNextPage,
				})}
				aria-disabled={!pageInfo.hasNextPage}
			>
				Next
			</Link>
		</nav>
	);
}
