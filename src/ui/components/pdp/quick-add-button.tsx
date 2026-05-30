"use client";

import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";

/** Submit button for the cross-sell quick-add mini-forms, with a pending state. */
export function QuickAddButton() {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-70"
		>
			<Plus className="h-4 w-4" />
			{pending ? "Adding" : "Add"}
		</button>
	);
}
