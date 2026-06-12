import Image from "next/image";
import { addLineToCart } from "@/ui/components/cart/actions";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { AddToCartForm } from "./add-to-cart-form";
import { QuickAddButton } from "./quick-add-button";

export interface ProtocolItem {
	id: string;
	name: string;
	slug: string;
	price: string;
	thumbnailUrl?: string | null;
	thumbnailAlt?: string | null;
	/** Single-variant items can be quick-added; multi-variant items link to the PDP */
	variantId: string | null;
}

/**
 * "Complete your protocol" cross-sell, rendered as a full-width section of
 * product cards. Surfaces the Supplies category (bacteriostatic water, storage
 * vials) — the reconstitution essentials every lyophilized peptide needs.
 */
export function CompleteYourProtocol({ items, channel }: { items: ProtocolItem[]; channel: string }) {
	if (items.length === 0) return null;

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((item) => (
				<div
					key={item.id}
					className="bg-card/50 flex flex-col overflow-hidden rounded-2xl border border-border"
				>
					<LinkWithChannel
						href={`/products/${item.slug}`}
						className="relative aspect-[4/3] w-full overflow-hidden bg-secondary"
					>
						{item.thumbnailUrl && (
							<Image
								src={item.thumbnailUrl}
								alt={item.thumbnailAlt || item.name}
								fill
								className="object-cover"
								sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
							/>
						)}
					</LinkWithChannel>

					<div className="flex flex-1 flex-col gap-3 p-4">
						<div className="flex-1">
							<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-400">
								Essential
							</p>
							<LinkWithChannel
								href={`/products/${item.slug}`}
								className="mt-1 block text-sm font-semibold text-foreground transition-colors hover:text-emerald-400"
							>
								{item.name}
							</LinkWithChannel>
						</div>

						<div className="flex items-center justify-between gap-3">
							<span className="text-base font-semibold text-foreground">{item.price}</span>
							{item.variantId ? (
								<AddToCartForm action={addLineToCart}>
									<input type="hidden" name="channel" value={channel} />
									<input type="hidden" name="variantId" value={item.variantId} />
									<input type="hidden" name="quantity" value="1" />
									<QuickAddButton />
								</AddToCartForm>
							) : (
								<LinkWithChannel
									href={`/products/${item.slug}`}
									className="inline-flex shrink-0 items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
								>
									Select
								</LinkWithChannel>
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
