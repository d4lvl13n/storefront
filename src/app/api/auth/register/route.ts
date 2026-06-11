import { NextRequest, NextResponse } from "next/server";
import { executeRawGraphQL, asValidationError, getUserMessage } from "@/lib/graphql";
import { isAllowedRedirectUrl } from "@/lib/auth/safe-next";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const REGISTER_MUTATION = `
  mutation AccountRegister($input: AccountRegisterInput!) {
    accountRegister(input: $input) {
      user {
        id
        email
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface RegisterRequest {
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
	channel: string;
	redirectUrl: string;
}

interface AccountRegisterResult {
	accountRegister?: {
		user?: { id: string; email: string };
		errors?: Array<{ field?: string | null; message: string; code?: string | null }>;
	};
}

export async function POST(request: NextRequest) {
	// Throttle before any work: registration triggers a Saleor confirmation email.
	const limit = await rateLimit({
		bucket: "auth:register",
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

	const body = (await request.json()) as RegisterRequest;
	const { email, password, firstName, lastName, channel, redirectUrl } = body;

	if (!email || !password) {
		return NextResponse.json(
			{ errors: [{ message: "Email and password are required", code: "REQUIRED" }] },
			{ status: 400 },
		);
	}

	// redirectUrl is embedded in Saleor's confirmation email link; reject any
	// origin that isn't this storefront so it can't be used to harvest the token.
	if (!isAllowedRedirectUrl(redirectUrl, request.headers.get("origin"))) {
		return NextResponse.json(
			{ errors: [{ message: "Invalid redirect URL", code: "INVALID" }] },
			{ status: 400 },
		);
	}

	const result = await executeRawGraphQL<AccountRegisterResult>({
		query: REGISTER_MUTATION,
		variables: {
			input: {
				email,
				password,
				firstName: firstName || "",
				lastName: lastName || "",
				channel,
				redirectUrl,
			},
		},
	});

	// Network or GraphQL error
	if (!result.ok) {
		console.error("Registration error:", result.error.type);
		return NextResponse.json(
			{ errors: [{ message: getUserMessage(result.error), code: result.error.type.toUpperCase() }] },
			{ status: result.error.type === "network" ? 503 : 400 },
		);
	}

	const accountRegister = result.data.accountRegister;

	// Saleor validation errors
	if (accountRegister?.errors?.length) {
		const validationResult = asValidationError(accountRegister.errors);
		return NextResponse.json({ errors: validationResult.error.validationErrors }, { status: 400 });
	}

	// Success
	return NextResponse.json({
		user: accountRegister?.user,
		message: "Account created successfully. Please check your email to verify your account.",
	});
}
