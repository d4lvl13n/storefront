"use client";

import { ImageCarousel, type ImageCarouselImage } from "@/ui/components/ui/image-carousel";

interface ProductGalleryProps {
	images: ImageCarouselImage[];
	productName: string;
	/** Optional purity value, surfaced as a badge over the main image */
	purity?: string | null;
}

/**
 * Product Gallery with mobile swipe support.
 *
 * Features:
 * - Horizontal swipe on mobile (Embla Carousel)
 * - Arrow navigation on desktop (hover to reveal)
 * - Thumbnail strip on desktop
 * - Dot indicators on mobile
 * - First image has priority for LCP optimization
 * - Premium framed presentation with an optional purity badge overlay, so
 *   single-image products still read as intentional and high-trust.
 *
 * Note: Zoom/lightbox is not included - can be added separately
 * via the `onImageClick` prop if needed in the future.
 */
export function ProductGallery({ images, productName, purity }: ProductGalleryProps) {
	const overlay = purity ? (
		<span className="bg-background/80 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400 backdrop-blur">
			<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
			{purity}
		</span>
	) : null;

	return (
		<ImageCarousel
			images={images}
			productName={productName}
			showArrows={true}
			showDots={true}
			showThumbnails={true}
			overlay={overlay}
		/>
	);
}
