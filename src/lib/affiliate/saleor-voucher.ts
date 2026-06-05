import { executeRawGraphQL } from "@/lib/graphql";

/**
 * Automatic Saleor voucher creation on affiliate approval.
 *
 * The voucher (same code as the affiliate) is both the customer's discount
 * and the attribution mechanism. Uses `SALEOR_APP_TOKEN` — the app must have
 * the MANAGE_DISCOUNTS permission. Channel resolution: `SALEOR_CHANNEL_ID`
 * env when set, otherwise resolved from the channel slug at runtime.
 *
 * Contract notes (agreed with backend):
 * - Saleor returns HTTP 200 with an `errors[]` payload — always check it.
 * - Two-step atomicity: a voucher without a channel listing silently fails
 *   at checkout, so on step-2 failure the orphan voucher is DELETED and the
 *   whole operation fails — the caller must not activate the affiliate.
 * - Idempotency: a duplicate code (UNIQUE/ALREADY_EXISTS) is treated as
 *   already-provisioned so retries and manually-created vouchers don't 500.
 */

export type VoucherResult =
	| { ok: true; voucherId: string | null; alreadyExisted: boolean }
	| { ok: false; reason: string };

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

const VOUCHER_DELETE = /* GraphQL */ `
	mutation AffiliateVoucherDelete($id: ID!) {
		voucherDelete(id: $id) {
			errors {
				field
				code
				message
			}
		}
	}
`;

type SaleorError = { field: string | null; code: string; message: string | null };
type ChannelData = { channel: { id: string } | null };
type VoucherCreateData = {
	voucherCreate: { voucher: { id: string } | null; errors: SaleorError[] } | null;
};
type ListingData = {
	voucherChannelListingUpdate: { voucher: { id: string } | null; errors: SaleorError[] } | null;
};

/** Error codes meaning "a voucher with this code already exists". */
const ALREADY_EXISTS_CODES = new Set(["UNIQUE", "ALREADY_EXISTS", "DUPLICATED_INPUT_ITEM"]);

/**
 * Create an ENTIRE_ORDER percentage voucher with the affiliate's code and
 * activate it on the channel. `code` must already be canonical (UPPERCASE).
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

	// 1) Resolve the channel id (env override avoids a round trip).
	let channelId = process.env.SALEOR_CHANNEL_ID ?? null;
	if (!channelId) {
		const channelResult = await executeRawGraphQL<ChannelData>({
			query: CHANNEL_QUERY,
			variables: { slug: opts.channelSlug },
			headers,
		});
		channelId = channelResult.ok ? channelResult.data.channel?.id ?? null : null;
		if (!channelId) {
			return { ok: false, reason: `couldn't resolve channel "${opts.channelSlug}"` };
		}
	}

	// 2) Create the voucher with the affiliate's code.
	const createResult = await executeRawGraphQL<VoucherCreateData>({
		query: VOUCHER_CREATE,
		variables: {
			input: {
				name: `Affiliate — ${opts.code}`,
				type: "ENTIRE_ORDER",
				discountValueType: "PERCENTAGE",
				addCodes: [opts.code],
				// One redemption per buyer; no global usage limit.
				applyOncePerCustomer: true,
			},
		},
		headers,
	});
	if (!createResult.ok) {
		return { ok: false, reason: createResult.error.message.split("\n")[0] ?? "voucherCreate failed" };
	}
	const create = createResult.data.voucherCreate;
	if (!create?.voucher?.id) {
		const errors = create?.errors ?? [];
		// Code already exists in Saleor (retry, or the operator created it
		// manually) — treat as provisioned rather than failing the approval.
		if (errors.some((e) => ALREADY_EXISTS_CODES.has(e.code))) {
			return { ok: true, voucherId: null, alreadyExisted: true };
		}
		const first = errors[0];
		return {
			ok: false,
			reason: first
				? `${first.code}${first.field ? ` (${first.field})` : ""}${first.message ? `: ${first.message}` : ""}`
				: "voucherCreate failed",
		};
	}
	const voucherId = create.voucher.id;

	// 3) Activate it on the channel. A voucher without a channel listing is
	//    silently rejected at checkout, so on failure delete the orphan and
	//    fail the whole operation.
	const listingResult = await executeRawGraphQL<ListingData>({
		query: VOUCHER_CHANNEL_LISTING,
		variables: {
			id: voucherId,
			input: { addChannels: [{ channelId, discountValue: opts.discountPct }] },
		},
		headers,
	});
	const listingErrors = listingResult.ok
		? listingResult.data.voucherChannelListingUpdate?.errors ?? []
		: null;
	if (!listingResult.ok || (listingErrors && listingErrors.length > 0)) {
		await executeRawGraphQL({
			query: VOUCHER_DELETE,
			variables: { id: voucherId },
			headers,
		}).catch(() => undefined);
		console.error(
			"[affiliate] voucher channel listing failed; orphan voucher deleted:",
			listingErrors ?? (listingResult.ok ? null : listingResult.error.message),
		);
		return { ok: false, reason: "channel activation failed (voucher rolled back)" };
	}

	return { ok: true, voucherId, alreadyExisted: false };
}
