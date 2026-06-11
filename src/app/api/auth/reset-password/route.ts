import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, getUserMessage } from "@/lib/graphql";
import { isAllowedRedirectUrl } from "@/lib/auth/safe-next";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($email: String!, $channel: String!, $redirectUrl: String!) {
    requestPasswordReset(email: $email, channel: $channel, redirectUrl: $redirectUrl) {
      errors {
        field
        message
        code
      }
    }
  }
`;

interface ResetPasswordRequest {
	email: string;
	channel: string;
	redirectUrl: string;
}

interface RequestPasswordResetResult {
	requestPasswordReset?: {
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

export async function POST(request: NextRequest) {
	// Throttle before any work: a reset request triggers a Saleor email to the
	// address, so an unthrottled endpoint is an email-bombing primitive.
	const limit = await rateLimit({
		bucket: "auth:reset-password",
		identifier: getClientIp(request),
		max: 5,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.ok) {
		return NextResponse.json(
			{ errors: [{ message: "Too many attempts. Please try again later.", code: "RATE_LIMITED" }] },
			{ status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
		);
	}

	const body = (await request.json()) as ResetPasswordRequest;
	const { email, channel, redirectUrl } = body;

	if (!email || !channel || !redirectUrl) {
		return NextResponse.json(
			{ errors: [{ message: "Email, channel, and redirectUrl are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	// redirectUrl is embedded in Saleor's reset email link; reject any origin that
	// isn't this storefront so it can't be used to harvest the reset token.
	if (!isAllowedRedirectUrl(redirectUrl, request.headers.get("origin"))) {
		return NextResponse.json(
			{ errors: [{ message: "Invalid redirect URL", code: "INVALID" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<RequestPasswordResetResult>({
		query: REQUEST_PASSWORD_RESET_MUTATION,
		variables: { email, channel, redirectUrl },
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Password reset error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const requestPasswordReset = result.data.requestPasswordReset;

	// Saleor validation errors - log but don't expose to prevent email enumeration
	if (requestPasswordReset?.errors?.length) {
		console.error("Password reset validation errors");
		// Still return success to prevent email enumeration
	}

	// Always return success to prevent email enumeration
	return NextResponse.json({ success: true });
}
