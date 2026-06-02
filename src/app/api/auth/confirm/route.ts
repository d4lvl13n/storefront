import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";

/**
 * Confirms a newly-registered account via the email link token.
 *
 * This is the counterpart to `accountRegister` (see /api/auth/register): Saleor
 * emails the user a link back to the storefront with `?email=&token=`, and that
 * token must be redeemed with `confirmAccount` to activate the account. It is
 * NOT the same as the password-reset flow (`setPassword`) — confirmation must
 * never ask the user to choose a password again, since they set one at sign-up.
 *
 * `confirmAccount` returns no auth token, so the caller redirects to the login
 * screen afterwards; the user signs in with the password they already chose.
 */
const CONFIRM_ACCOUNT_MUTATION = `
  mutation ConfirmAccount($email: String!, $token: String!) {
    confirmAccount(email: $email, token: $token) {
      user {
        id
        email
        isActive
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface ConfirmRequest {
	email: string;
	token: string;
}

interface ConfirmAccountResult {
	confirmAccount?: {
		user?: { id: string; email: string; isActive: boolean };
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

export async function POST(request: NextRequest) {
	const body = (await request.json()) as ConfirmRequest;
	const { email, token } = body;

	if (!email || !token) {
		return NextResponse.json(
			{ errors: [{ message: "Email and token are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<ConfirmAccountResult>({
		query: CONFIRM_ACCOUNT_MUTATION,
		variables: { email, token },
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Account confirmation error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const confirmAccount = result.data.confirmAccount;

	// Saleor validation errors (e.g. expired/invalid token).
	if (confirmAccount?.errors?.length) {
		const validationResult = asValidationError(confirmAccount.errors);
		return NextResponse.json({ errors: validationResult.error.validationErrors }, { status: 400 });
	}

	// Success
	return NextResponse.json({
		success: true,
		user: confirmAccount?.user,
		message: "Email verified. You can now sign in.",
	});
}
