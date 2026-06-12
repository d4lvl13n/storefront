import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Commission } from "@/lib/affiliate/types";

const mocks = vi.hoisted(() => ({
	getAffiliateByCode: vi.fn(),
	recordCommission: vi.fn(),
	getCommissionByOrderId: vi.fn(),
	reverseCommissionByOrderId: vi.fn(),
	mirrorPaidOrderToKlaviyo: vi.fn(),
	executeRawGraphQL: vi.fn(),
}));

vi.mock("@/lib/affiliate/db", () => ({
	getAffiliateByCode: mocks.getAffiliateByCode,
	recordCommission: mocks.recordCommission,
	getCommissionByOrderId: mocks.getCommissionByOrderId,
	reverseCommissionByOrderId: mocks.reverseCommissionByOrderId,
}));

vi.mock("@/lib/analytics/klaviyo-server", () => ({
	mirrorPaidOrderToKlaviyo: mocks.mirrorPaidOrderToKlaviyo,
}));

vi.mock("@/lib/graphql", () => ({
	executeRawGraphQL: mocks.executeRawGraphQL,
}));

const SECRET = "webhook-secret";

function signedRequest(payload: unknown, headers: Record<string, string> = {}) {
	const rawBody = JSON.stringify(payload);
	const signature = createHmac("sha256", SECRET).update(rawBody).digest("hex");
	return new Request("https://storefront.test/api/affiliate/webhook", {
		method: "POST",
		headers: {
			"saleor-signature": signature,
			"saleor-event": "order_paid",
			...headers,
		},
		body: rawBody,
	});
}

async function loadPost() {
	vi.resetModules();
	process.env.SALEOR_WEBHOOK_SECRET = SECRET;
	return (await import("./route")).POST;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("affiliate webhook", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.SALEOR_APP_TOKEN;
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		vi.spyOn(console, "log").mockImplementation(() => undefined);
		vi.spyOn(console, "warn").mockImplementation(() => undefined);

		mocks.getCommissionByOrderId.mockResolvedValue(null);
		mocks.getAffiliateByCode.mockResolvedValue({
			id: 7,
			code: "LAB10",
			name: "Lab Partner",
			email: "affiliate@example.com",
			commission_rate: 0.1,
			active: true,
		});
	});

	it("does not record an affiliate commission when buyer email is missing", async () => {
		const POST = await loadPost();
		const response = await POST(
			signedRequest({
				order: {
					id: "T3JkZXI6MQ==",
					number: "1001",
					total: { gross: { amount: 100, currency: "USD" } },
					voucher: { code: "LAB10" },
				},
			}) as never,
		);

		await expect(response.json()).resolves.toMatchObject({
			ok: true,
			skipped: true,
			reason: "missing-user-email",
		});
		expect(mocks.recordCommission).not.toHaveBeenCalled();
	});

	it("uses the app-token fallback email before recording a commission", async () => {
		process.env.SALEOR_APP_TOKEN = "app-token";
		mocks.executeRawGraphQL.mockResolvedValue({
			ok: true,
			data: { order: { userEmail: "buyer@example.com" } },
		});
		mocks.recordCommission.mockResolvedValue({
			id: 3,
			order_number: "1002",
		} satisfies Partial<Commission>);

		const POST = await loadPost();
		const response = await POST(
			signedRequest({
				order: {
					id: "T3JkZXI6Mg==",
					number: "1002",
					total: { gross: { amount: 250, currency: "USD" } },
					voucher: { code: "LAB10" },
				},
			}) as never,
		);

		await expect(response.json()).resolves.toMatchObject({ ok: true });
		expect(mocks.executeRawGraphQL).toHaveBeenCalledWith(
			expect.objectContaining({
				variables: { id: "T3JkZXI6Mg==" },
				headers: { Authorization: "Bearer app-token" },
			}),
		);
		expect(mocks.recordCommission).toHaveBeenCalledWith(
			expect.objectContaining({
				affiliate_id: 7,
				order_id: "T3JkZXI6Mg==",
				commission_amount: 25,
			}),
		);
	});
});
