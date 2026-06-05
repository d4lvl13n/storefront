"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { type CoaIndexEntry } from "@/lib/coa/schema";

/**
 * Dropdown product selector for the shared/mis-printed QR landing page.
 *
 * Native <select> on purpose: nearly everyone lands here from a phone QR
 * scan, and the OS wheel/sheet picker beats any custom combobox on mobile.
 * The styling makes it feel custom; the control stays native.
 */

const STATUS_READOUT: Record<
	CoaIndexEntry["status"],
	{ dot: string; text: string; label: string; pulse?: boolean }
> = {
	active: { dot: "bg-emerald-400", text: "text-emerald-300", label: "Lab report available" },
	pending: {
		dot: "bg-amber-400",
		text: "text-amber-200",
		label: "Lab report pending publication",
		pulse: true,
	},
	superseded: { dot: "bg-amber-400", text: "text-amber-200", label: "Updated report available" },
	recalled: {
		dot: "bg-red-400",
		text: "text-red-300",
		label: "Batch recalled — review details",
		pulse: true,
	},
};

export function CoaProductPicker({ entries }: { entries: CoaIndexEntry[] }) {
	const router = useRouter();
	const { channel } = useParams<{ channel?: string }>();
	const [token, setToken] = useState("");
	const [navigating, setNavigating] = useState(false);

	const options = useMemo(() => [...entries].sort((a, b) => a.product.localeCompare(b.product)), [entries]);
	const selected = options.find((entry) => entry.token === token) ?? null;
	const readout = selected ? STATUS_READOUT[selected.status] : null;

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		if (!selected || !channel) return;
		setNavigating(true);
		// `via`, not `ref` — middleware reserves ?ref= for affiliate capture.
		router.push(`/${channel}/coa/${selected.token}?via=label-misprint`);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label
					htmlFor="coa-product"
					className="mb-2 block text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-400"
				>
					Product on your vial label
				</label>
				<div className="group relative">
					<select
						id="coa-product"
						value={token}
						onChange={(event) => setToken(event.target.value)}
						className="h-14 w-full cursor-pointer appearance-none truncate rounded-xl border border-neutral-700/80 bg-neutral-900/80 pl-4 pr-14 text-base font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-all duration-200 focus:border-emerald-500/60 focus:bg-neutral-900 focus:ring-4 focus:ring-emerald-500/25 [&>option]:bg-neutral-900 [&>option]:text-white"
					>
						<option value="" disabled>
							Select your product…
						</option>
						{options.map((entry) => (
							<option key={entry.token} value={entry.token}>
								{entry.product}
								{entry.batch ? ` — Batch ${entry.batch}` : ""}
							</option>
						))}
					</select>
					{/* Custom chevron — sits over the native control, never intercepts taps */}
					<span
						aria-hidden="true"
						className="pointer-events-none absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-neutral-700/70 bg-neutral-800/80 text-emerald-400 transition-colors duration-200 group-focus-within:border-emerald-500/50 group-focus-within:text-emerald-300"
					>
						<svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
							<path
								d="M2.5 4.5L6 8L9.5 4.5"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
				</div>
			</div>

			{/* Status readout — materialises once a product is chosen, re-animates per selection */}
			{selected && readout && (
				<div
					key={selected.token}
					className="flex animate-[ib-card-enter_0.35s_ease-out_both] items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3"
				>
					<span className={`flex items-center gap-2.5 text-xs font-medium ${readout.text}`}>
						<span className="relative flex h-2 w-2">
							{readout.pulse && (
								<span
									className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${readout.dot}`}
								/>
							)}
							<span className={`relative inline-flex h-2 w-2 rounded-full ${readout.dot}`} />
						</span>
						{readout.label}
					</span>
					<span className="select-all font-mono text-[11px] tracking-wide text-neutral-500">
						{selected.token}
					</span>
				</div>
			)}

			<button
				type="submit"
				disabled={!selected || navigating}
				className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-neutral-950 transition-all duration-200 hover:bg-emerald-400 hover:shadow-[0_0_28px_rgba(16,185,129,0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none"
			>
				<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
					/>
				</svg>
				{navigating ? "Opening certificate…" : "View Certificate of Analysis"}
			</button>
		</form>
	);
}
