import { ProductCard, type ProductCardData } from "./product-card";

interface ProductGridProps {
	products: ProductCardData[];
	/** Render a "View COA" link on each card (batch documentation picker) */
	showCoaLink?: boolean;
}

export function ProductGrid({ products, showCoaLink = false }: ProductGridProps) {
	return (
		<div className="grid w-full grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
			{products.map((product, index) => (
				<ProductCard key={product.id} product={product} priority={index < 4} showCoaLink={showCoaLink} />
			))}
		</div>
	);
}
