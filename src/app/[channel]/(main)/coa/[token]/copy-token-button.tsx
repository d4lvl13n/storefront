"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyTokenButtonProps {
	token: string;
}

export function CopyTokenButton({ token }: CopyTokenButtonProps) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(token);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Older browsers / non-secure contexts don't have the Clipboard API.
			// Fall back to the document.execCommand path with a temporary
			// textarea so users on these clients still get a working button.
			try {
				const textarea = document.createElement("textarea");
				textarea.value = token;
				textarea.style.position = "fixed";
				textarea.style.opacity = "0";
				document.body.appendChild(textarea);
				textarea.focus();
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			} catch {
				// Give up silently — the token is also `select-all` so the user
				// can copy with native keyboard shortcut.
			}
		}
	}

	return (
		<button
			type="button"
			onClick={handleCopy}
			aria-label={copied ? "Token copied to clipboard" : "Copy token to clipboard"}
			className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
		>
			{copied ? (
				<>
					<Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
					<span className="text-emerald-400">Copied</span>
				</>
			) : (
				<>
					<Copy className="h-3.5 w-3.5" aria-hidden="true" />
					<span>Copy</span>
				</>
			)}
		</button>
	);
}
