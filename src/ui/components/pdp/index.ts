export { ProductGallery } from "./product-gallery";
export { AddToCart } from "./add-to-cart";
export { BulkOrderSelector, type BulkPackVariant } from "./bulk-order-selector";
export { PdpTrustRow } from "./trust-row";
export { StickyBar } from "./sticky-bar";

// Variant Selection System
// Re-export main components for convenient access
export {
	VariantSelectionSection,
	VariantSelector,
	ColorSwatchOption,
	SizeButtonOption,
	TextOption,
} from "./variant-selection";

// Cache Components - Dynamic variant section with Suspense support
export { VariantSectionDynamic, VariantSectionSkeleton } from "./variant-section-dynamic";
export { VariantSectionError } from "./variant-section-error";

// Phase 2 - cross-sell, lab-data datasheet, reviews
export { CompleteYourProtocol, type ProtocolItem } from "./complete-your-protocol";
export { ProductSpecsDatasheet } from "./product-specs-datasheet";
export { ProductReviews, RatingSummary, extractReviews, type ReviewsData } from "./product-reviews";

// Phase 3 - full-width section system
export { PdpSection } from "./pdp-section";
export { TalkToExpertBand } from "./talk-to-expert";
export { QualityVerification } from "./quality-verification";
export { ProductFaq, type FaqEntry } from "./product-faq";
