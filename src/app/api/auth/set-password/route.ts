import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const SET_PASSWORD_MUTATION = `
  mutation SetPassword($email: String!, $token: String!, $password: String!) {
    setPassword(email: $email, token: $token, password: $password) {
      token
      refreshToken
      errors {
        field
        message
        code
      }
    }
  }
`;

interface SetPasswordRequest {
	email: string;
	token: string;
	password: string;
}

interface SetPasswordResult {
	setPassword?: {
		token?: string;
		refreshToken?: string;
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

export async function POST(request: NextRequest) {
	// Throttle to slow brute-forcing of the reset token.
	const limit = await rateLimit({
		bucket: "auth:set-password",
		identifier: getClientIp(request),
		max: 10,
		windowMs: RATE_LIMIT_WINDOW_MS,
	});
	if (!limit.ok) {
		return NextResponse.json(
			{ errors: [{ message: "Too many attempts. Please try again later.", code: "RATE_LIMITED" }] },
			{ status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
		);
	}

	const body = (await request.json()) as SetPasswordRequest;
	const { email, token, password } = body;

	if (!email || !token || !password) {
		return NextResponse.json(
			{ errors: [{ message: "Email, token, and password are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	if (password.length < 8) {
		return NextResponse.json(
			{ errors: [{ message: "Password must be at least 8 characters", code: "PASSWORD_TOO_SHORT" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<SetPasswordResult>({
		query: SET_PASSWORD_MUTATION,
		variables: { email, token, password },
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Set password error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const setPassword = result.data.setPassword;

	// Saleor validation errors
	if (setPassword?.errors?.length) {
		console.error("Set password validation errors");
		const validationResult = asValidationError(setPassword.errors);
		return NextResponse.json({ errors: validationResult.error.validationErrors }, { status: 400 });
	}

	// Saleor returns a token when the password was set successfully. We do NOT
	// persist it here: the app recognises a session only via the auth-sdk's
	// own cookies (encoded names — see src/lib/auth/*), so writing bare
	// "token"/"refreshToken" cookies did nothing and produced a false
	// "you're signed in" state. Confirm success and route the user to sign in.
	if (setPassword?.token) {
		return NextResponse.json({
			success: true,
			message: "Password updated successfully. Please sign in.",
		});
	}

	return NextResponse.json(
		{ errors: [{ message: "Failed to set password", code: "UNKNOWN" }] },
		{ status: 500 },
	);
}
