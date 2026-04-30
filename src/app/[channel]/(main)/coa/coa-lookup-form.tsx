"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";

import { normalizeToken } from "@/lib/coa/token";

interface CoaLookupFormProps {
	channel: string;
}

type Status = "idle" | "loading" | "error";

export function CoaLookupForm({ channel }: CoaLookupFormProps) {
	const router = useRouter();
	const [token, setToken] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [errorMessage, setErrorMessage] = useState("");

	function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const canonical = normalizeToken(token);
		if (!canonical) {
			setStatus("error");
			setErrorMessage("That doesn't look like a valid COA token. Check the label on your vial.");
			return;
		}
		setStatus("loading");
		setErrorMessage("");
		router.push(`/${channel}/coa/${canonical}`);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-5">
			{status === "error" && (
				<div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
					<p className="text-sm text-red-300">{errorMessage}</p>
				</div>
			)}

			<div>
				<label htmlFor="coa-token" className="mb-2 block text-sm font-medium text-foreground">
					COA token <span className="text-red-400">*</span>
				</label>
				<input
					id="coa-token"
					name="token"
					type="text"
					required
					maxLength={20}
					placeholder="A8K2-9F4R-X2P7"
					value={token}
					onChange={(e) => {
						setToken(e.target.value);
						if (status === "error") {
							setStatus("idle");
							setErrorMessage("");
						}
					}}
					disabled={status === "loading"}
					autoComplete="off"
					autoCapitalize="characters"
					spellCheck={false}
					className="placeholder:text-muted-foreground/60 flex h-12 w-full rounded-md border border-border bg-secondary px-4 font-mono text-base uppercase tracking-[0.18em] text-foreground placeholder:tracking-[0.15em] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
				/>
				<p className="mt-2 text-xs text-muted-foreground">
					12 letters and digits, dashes optional. The token is on the label of your vial, near the QR code.
				</p>
			</div>

			<button
				type="submit"
				disabled={status === "loading" || token.length === 0}
				className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-semibold text-foreground shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
			>
				{status === "loading" ? (
					<>
						<Loader2 className="h-4 w-4 animate-spin" />
						Verifying…
					</>
				) : (
					<>
						<ShieldCheck className="h-4 w-4" />
						Verify COA
					</>
				)}
			</button>
		</form>
	);
}
