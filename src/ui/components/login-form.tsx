"use client";

import { useSearchParams } from "next/navigation";
import { LoginMode } from "./auth/login-mode";
import { SetPasswordMode } from "./auth/set-password-mode";
import { ConfirmMode } from "./auth/confirm-mode";

export function LoginForm() {
	const searchParams = useSearchParams();
	const mode = searchParams.get("mode");
	const email = searchParams.get("email");
	const token = searchParams.get("token");

	// Account-confirmation link from the registration email:
	// `?mode=confirm&email=&token=`. Redeems the token via confirmAccount —
	// must NOT be confused with the password-reset flow below.
	if (mode === "confirm" && email && token) {
		return <ConfirmMode email={email} token={token} />;
	}

	// Password-reset link: `?email=&token=` (no mode). Sets a new password.
	if (email && token) {
		return <SetPasswordMode email={email} token={token} />;
	}

	return <LoginMode />;
}
