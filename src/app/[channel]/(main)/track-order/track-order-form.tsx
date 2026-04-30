"use client";

import { useState, type FormEvent } from "react";
import { Package, Mail, Hash, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

type Fulfillment = {
	status: string;
	created: string;
	trackingNumber: string | null;
};

type TrackedOrder = {
	number: string;
	status: string;
	statusDisplay: string;
	paymentStatus: string;
	created: string;
	fulfillments: Fulfillment[];
};

interface TrackOrderFormProps {
	channel: string;
}

export function TrackOrderForm({ channel }: TrackOrderFormProps) {
	const [orderNumber, setOrderNumber] = useState("");
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [errorMessage, setErrorMessage] = useState("");
	const [order, setOrder] = useState<TrackedOrder | null>(null);

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setStatus("loading");
		setErrorMessage("");
		setOrder(null);

		try {
			const res = await fetch("/api/track-order", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orderNumber, email, channel }),
			});
			const data = (await res.json()) as { order?: TrackedOrder; error?: string };

			if (!res.ok) {
				setStatus("error");
				setErrorMessage(data.error ?? "Something went wrong. Please try again.");
				return;
			}

			if (!data.order) {
				setStatus("error");
				setErrorMessage("We couldn't find an order matching that number and email.");
				return;
			}

			setOrder(data.order);
			setStatus("success");
		} catch {
			setStatus("error");
			setErrorMessage("Network error. Please check your connection and try again.");
		}
	}

	function reset() {
		setStatus("idle");
		setOrder(null);
		setOrderNumber("");
		setEmail("");
		setErrorMessage("");
	}

	if (status === "success" && order) {
		return <OrderResult order={order} onLookupAnother={reset} />;
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
				<label htmlFor="order-number" className="mb-2 block text-sm font-medium text-foreground">
					Order number <span className="text-red-400">*</span>
				</label>
				<div className="relative">
					<Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						id="order-number"
						name="orderNumber"
						type="text"
						required
						maxLength={32}
						placeholder="e.g. ORD-1234"
						value={orderNumber}
						onChange={(e) => setOrderNumber(e.target.value)}
						disabled={status === "loading"}
						autoComplete="off"
						className="flex h-11 w-full rounded-md border border-border bg-secondary pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
					/>
				</div>
			</div>

			<div>
				<label htmlFor="track-email" className="mb-2 block text-sm font-medium text-foreground">
					Email used at checkout <span className="text-red-400">*</span>
				</label>
				<div className="relative">
					<Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						id="track-email"
						name="email"
						type="email"
						required
						maxLength={200}
						placeholder="you@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={status === "loading"}
						autoComplete="email"
						className="flex h-11 w-full rounded-md border border-border bg-secondary pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
					/>
				</div>
			</div>

			<button
				type="submit"
				disabled={status === "loading" || !orderNumber || !email}
				className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 text-sm font-semibold text-foreground shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
			>
				{status === "loading" ? (
					<>
						<Loader2 className="h-4 w-4 animate-spin" />
						Looking up your order…
					</>
				) : (
					<>
						<Package className="h-4 w-4" />
						Track my order
					</>
				)}
			</button>

			<p className="text-center text-xs text-muted-foreground">
				We&apos;ll only show order status to the email used at checkout.
			</p>
		</form>
	);
}

function OrderResult({ order, onLookupAnother }: { order: TrackedOrder; onLookupAnother: () => void }) {
	const placedAt = new Date(order.created);
	const placedAtLabel = new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(placedAt);

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
				<div className="flex items-start gap-3">
					<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
					<div className="flex-1">
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">Found</p>
						<p className="mt-1 text-lg font-semibold text-foreground">Order #{order.number}</p>
						<p className="text-sm text-muted-foreground">Placed {placedAtLabel}</p>
					</div>
				</div>
			</div>

			<div className="space-y-3">
				<StatusRow label="Order status" value={prettyStatus(order.statusDisplay || order.status)} />
				<StatusRow label="Payment" value={prettyStatus(order.paymentStatus)} />
			</div>

			{order.fulfillments.length > 0 && (
				<div>
					<h3 className="mb-3 text-sm font-medium text-foreground">Shipments</h3>
					<ul className="space-y-3">
						{order.fulfillments.map((f, idx) => (
							<li key={`${f.created}-${idx}`} className="bg-card/40 rounded-xl border border-border p-4">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-foreground">
											Shipment {idx + 1} &middot; {prettyStatus(f.status)}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											Updated{" "}
											{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(f.created))}
										</p>
									</div>
								</div>
								{f.trackingNumber && (
									<p className="mt-3 break-all rounded-lg bg-secondary px-3 py-2 font-mono text-xs text-foreground">
										Tracking: {f.trackingNumber}
									</p>
								)}
							</li>
						))}
					</ul>
				</div>
			)}

			{order.fulfillments.length === 0 && (
				<p className="bg-secondary/40 rounded-xl border border-border p-4 text-sm text-muted-foreground">
					No shipments dispatched yet. We&rsquo;ll update this view as soon as your order ships.
				</p>
			)}

			<button
				type="button"
				onClick={onLookupAnother}
				className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:border-emerald-500/40 hover:text-foreground"
			>
				Look up another order
			</button>
		</div>
	);
}

function StatusRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-card/40 flex items-center justify-between rounded-xl border border-border px-4 py-3">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
			<p className="text-sm font-semibold text-foreground">{value}</p>
		</div>
	);
}

function prettyStatus(value: string) {
	if (!value) return "—";
	// Saleor returns enums like "PARTIALLY_FULFILLED" — soften them.
	return value
		.toLowerCase()
		.split(/[\s_]+/)
		.filter(Boolean)
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(" ");
}
