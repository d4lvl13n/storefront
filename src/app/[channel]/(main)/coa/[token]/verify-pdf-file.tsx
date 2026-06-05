"use client";

import { useRef, useState } from "react";

/**
 * Client-side fingerprint check: the customer picks the PDF they downloaded
 * and we hash it locally (Web Crypto) against the published SHA-256. Nothing
 * is uploaded; works regardless of registry CORS policy — and it verifies
 * the exact bytes the customer holds, not what the server would re-serve.
 */
export function VerifyPdfFile({ expectedSha256 }: { expectedSha256: string }) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [state, setState] = useState<"idle" | "hashing" | "match" | "mismatch" | "error">("idle");
	const [actual, setActual] = useState("");

	const onFile = async (file: File | undefined) => {
		if (!file) return;
		setState("hashing");
		try {
			const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
			const hex = Array.from(new Uint8Array(digest))
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
			setActual(hex);
			setState(hex.toLowerCase() === expectedSha256.toLowerCase() ? "match" : "mismatch");
		} catch {
			setState("error");
		}
	};

	return (
		<div className="space-y-2">
			<input
				ref={inputRef}
				type="file"
				accept=".pdf,application/pdf"
				className="hidden"
				onChange={(event) => void onFile(event.target.files?.[0])}
			/>
			<button
				type="button"
				disabled={state === "hashing"}
				onClick={() => inputRef.current?.click()}
				className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-emerald-500/40 disabled:opacity-50"
			>
				{state === "hashing" ? "Checking…" : "Check a downloaded file"}
			</button>
			{state === "match" && (
				<p className="text-xs font-medium text-emerald-400">
					Fingerprint matches — your file is the original lab document.
				</p>
			)}
			{state === "mismatch" && (
				<div className="space-y-1">
					<p className="text-xs font-medium text-red-400">
						Fingerprint does not match. Stop using this file and contact us.
					</p>
					<p className="break-all font-mono text-[11px] text-neutral-500">Your file: {actual}</p>
				</div>
			)}
			{state === "error" && (
				<p className="text-xs text-neutral-500">
					Couldn&rsquo;t read that file in your browser — use the terminal command above instead.
				</p>
			)}
		</div>
	);
}
