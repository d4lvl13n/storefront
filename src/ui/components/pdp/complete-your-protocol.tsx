import Image from "next/image";
import { FlaskConical } from "lucide-react";
import { addLineToCart } from "@/ui/components/cart/actions";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";
import { AddToCartSync } from "./add-to-cart-sync";
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
 * "Complete your protocol" cross-sell.
 *
 * Surfaces the Supplies category (bacteriostatic water, storage vials) — the
 * reconstitution essentials every lyophilized peptide needs — as a quick-add
 * strip in the buy column. Distinct from "Related Compounds", which are
 * alternatives rather than complements.
 */
export function CompleteYourProtocol({ items, channel }: { items: ProtocolItem[]; channel: string }) {
	if (items.length === 0) return null;

	return (
		<div className="bg-card/50 rounded-2xl border border-border p-4">
			<div className="mb-1 flex items-center gap-2">
				<FlaskConical className="h-4 w-4 text-emerald-400" />
				<h2 className="text-sm font-semibold text-foreground">Complete your protocol</h2>
			</div>
			<p className="mb-3 text-xs text-muted-foreground">Reconstitution &amp; storage essentials</p>

			<ul className="divide-y divide-border">
				{items.map((item) => (
					<li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
						<LinkWithChannel
							href={`/products/${item.slug}`}
							className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary"
						>
							{item.thumbnailUrl && (
								<Image
									src={item.thumbnailUrl}
									alt={item.thumbnailAlt || item.name}
									fill
									className="object-cover"
									sizes="56px"
								/>
							)}
						</LinkWithChannel>

						<div className="min-w-0 flex-1">
							<LinkWithChannel
								href={`/products/${item.slug}`}
								className="block truncate text-sm font-medium text-foreground transition-colors hover:text-emerald-400"
							>
								{item.name}
							</LinkWithChannel>
							<p className="text-sm text-muted-foreground">{item.price}</p>
						</div>

						{item.variantId ? (
							<form action={addLineToCart}>
								<input type="hidden" name="channel" value={channel} />
								<input type="hidden" name="variantId" value={item.variantId} />
								<input type="hidden" name="quantity" value="1" />
								<QuickAddButton />
								<AddToCartSync />
							</form>
						) : (
							<LinkWithChannel
								href={`/products/${item.slug}`}
								className="inline-flex shrink-0 items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
							>
								Select
							</LinkWithChannel>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
