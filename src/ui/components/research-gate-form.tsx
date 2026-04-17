"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeResearchUse } from "@/app/actions";

export function ResearchGateForm() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const handleConfirm = () => {
		startTransition(async () => {
			await acknowledgeResearchUse();
			router.refresh();
		});
	};

	const handleDecline = () => {
		window.location.href = "/access-restricted";
	};

	return (
		<div className="mt-6 flex flex-col gap-3">
			<button
				type="button"
				onClick={handleConfirm}
				disabled={isPending}
				className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
			>
				{isPending ? "Confirming…" : "I affirm — continue to research catalog"}
			</button>
			<button
				type="button"
				onClick={handleDecline}
				disabled={isPending}
				className="h-10 w-full rounded-xl border border-border text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
			>
				I do not affirm — exit
			</button>
		</div>
	);
}
