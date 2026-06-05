import { executeRawGraphQL } from "@/lib/graphql";

/**
 * Automatic Saleor voucher creation on affiliate approval.
 *
 * The voucher (same code as the affiliate) is both the customer's discount
 * and the attribution mechanism — leaving it manual risked a typo silently
 * breaking attribution. Uses SALEOR_APP_TOKEN (same token as /api/track-order);
 * requires the MANAGE_DISCOUNTS permission on the app.
 *
 * FAIL-SOFT by design: any failure (missing token, missing permission,
 * network) returns { ok: false, reason } and the approval flow falls back to
 * instructing the operator to create the voucher manually — it never blocks.
 */

export type VoucherResult = { ok: true } | { ok: false; reason: string };

const CHANNEL_QUERY = /* GraphQL */ `
	query AffiliateVoucherChannel($slug: String!) {
		channel(slug: $slug) {
			id
		}
	}
`;

const VOUCHER_CREATE = /* GraphQL */ `
	mutation AffiliateVoucherCreate($input: VoucherInput!) {
		voucherCreate(input: $input) {
			voucher {
				id
			}
			errors {
				field
				code
				message
			}
		}
	}
`;

const VOUCHER_CHANNEL_LISTING = /* GraphQL */ `
	mutation AffiliateVoucherChannelListing($id: ID!, $input: VoucherChannelListingInput!) {
		voucherChannelListingUpdate(id: $id, input: $input) {
			voucher {
				id
			}
			errors {
				field
				code
				message
			}
		}
	}
`;

type ChannelData = { channel: { id: string } | null };
type VoucherCreateData = {
	voucherCreate: {
		voucher: { id: string } | null;
		errors: Array<{ field: string | null; code: string; message: string | null }>;
	} | null;
};
type ListingData = {
	voucherChannelListingUpdate: {
		voucher: { id: string } | null;
		errors: Array<{ field: string | null; code: string; message: string | null }>;
	} | null;
};

/**
 * Create an ENTIRE_ORDER percentage voucher with the affiliate's code and
 * activate it on the given channel.
 */
export async function createAffiliateVoucher(opts: {
	code: string;
	discountPct: number;
	channelSlug: string;
}): Promise<VoucherResult> {
	const appToken = process.env.SALEOR_APP_TOKEN;
	if (!appToken) {
		return { ok: false, reason: "SALEOR_APP_TOKEN is not configured" };
	}
	const headers = { Authorization: `Bearer ${appToken}` };

	// 1) Resolve the channel id.
	const channelResult = await executeRawGraphQL<ChannelData>({
		query: CHANNEL_QUERY,
		variables: { slug: opts.channelSlug },
		headers,
	});
	if (!channelResult.ok || !channelResult.data.channel?.id) {
		return { ok: false, reason: `couldn't resolve channel "${opts.channelSlug}"` };
	}
	const channelId = channelResult.data.channel.id;

	// 2) Create the voucher with the affiliate's code.
	const createResult = await executeRawGraphQL<VoucherCreateData>({
		query: VOUCHER_CREATE,
		variables: {
			input: {
				name: `Affiliate — ${opts.code}`,
				type: "ENTIRE_ORDER",
				discountValueType: "PERCENTAGE",
				addCodes: [opts.code],
			},
		},
		headers,
	});
	if (!createResult.ok) {
		return { ok: false, reason: createResult.error.message.split("\n")[0] ?? "voucherCreate failed" };
	}
	const create = createResult.data.voucherCreate;
	if (!create?.voucher?.id) {
		const first = create?.errors?.[0];
		return {
			ok: false,
			reason: first ? `${first.code}${first.field ? ` (${first.field})` : ""}` : "voucherCreate failed",
		};
	}

	// 3) Activate it on the channel with the discount value.
	const listingResult = await executeRawGraphQL<ListingData>({
		query: VOUCHER_CHANNEL_LISTING,
		variables: {
			id: create.voucher.id,
			input: { addChannels: [{ channelId, discountValue: opts.discountPct }] },
		},
		headers,
	});
	if (!listingResult.ok) {
		return {
			ok: false,
			reason: "voucher created but channel activation failed — finish it in the Dashboard",
		};
	}
	const listing = listingResult.data.voucherChannelListingUpdate;
	if (listing?.errors?.length) {
		return {
			ok: false,
			reason: "voucher created but channel activation failed — finish it in the Dashboard",
		};
	}

	return { ok: true };
}
