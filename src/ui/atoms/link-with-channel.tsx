"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { type ComponentProps } from "react";

export const LinkWithChannel = ({
	href,
	...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) => {
	const { channel } = useParams<{ channel?: string }>();
	const pathname = usePathname();

	if (!href.startsWith("/")) {
		return <Link {...props} href={href} />;
	}

	// During hydration/recovery there can be a transient moment where params
	// are unavailable. Fall back to the first path segment from pathname.
	// This keeps href stable between SSR/CSR and avoids hydration mismatches.
	const pathnameChannel = pathname?.split("/").filter(Boolean)[0];
	const resolvedChannel = channel ?? pathnameChannel;

	if (!resolvedChannel) {
		return <Link {...props} href={href} />;
	}

	// Prevent accidental double-prefixing when href already includes /{channel}/...
	if (href === `/${resolvedChannel}` || href.startsWith(`/${resolvedChannel}/`)) {
		return <Link {...props} href={href} />;
	}

	const encodedChannel = encodeURIComponent(resolvedChannel);
	const hrefWithChannel = `/${encodedChannel}${href}`;
	return <Link {...props} href={hrefWithChannel} />;
};
