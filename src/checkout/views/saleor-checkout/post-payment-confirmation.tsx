"use client";

import { type FC, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Mail, MapPin, Package, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { useLatestOrderQuery, type OrderFragment } from "@/checkout/graphql";
import { localeConfig } from "@/config/locale";
import { formatMoneyWithFallback } from "@/checkout/lib/utils/money";

const POLL_INTERVAL = 1500;
const MAX_POLL_TIME = 30_000;

function formatAddress(address: OrderFragment["shippingAddress"]) {
	if (!address) return null;
	return [address.streetAddress1, address.city, address.postalCode, address.country?.country]
		.filter(Boolean)
		.join(", ");
}

export const PostPaymentConfirmation: FC = () => {
	const channel = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "us-usd";
	const searchParams = useSearchParams();
	const checkoutId = searchParams.get("checkout");

	const [timedOut, setTimedOut] = useState(false);
	const [pollStart] = useState(() => Date.now());

	const [{ data }, reexecuteQuery] = useLatestOrderQuery({
		variables: { languageCode: localeConfig.graphqlLanguageCode },
		requestPolicy: "network-only",
	});

	const latestOrder = data?.me?.orders?.edges?.[0]?.node ?? null;

	const matchedOrder = (() => {
		if (!latestOrder) return null;
		if (checkoutId) return latestOrder.checkoutId === checkoutId ? latestOrder : null;
		return latestOrder;
	})();

	useEffect(() => {
		if (matchedOrder || timedOut) return;

		const interval = setInterval(() => {
			if (Date.now() - pollStart > MAX_POLL_TIME) {
				setTimedOut(true);
				return;
			}
			reexecuteQuery({ requestPolicy: "network-only" });
		}, POLL_INTERVAL);

		return () => clearInterval(interval);
	}, [matchedOrder, timedOut, pollStart, reexecuteQuery]);

	if (!matchedOrder && !timedOut) {
		return <PollingState />;
	}

	if (timedOut && !matchedOrder) {
		return <TimeoutState channel={channel} />;
	}

	const order = matchedOrder!;
	const email = order.userEmail || "";
	const estimatedDelivery = new Date();
	estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);
	const formattedDelivery = estimatedDelivery.toLocaleDateString(localeConfig.default, {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
				<div className="rounded-lg border border-border bg-card p-8 md:p-12">
					<div className="space-y-8">
						{/* Success Header */}
						<div className="space-y-3 text-center">
							<div className="flex justify-center">
								<div className="relative">
									<div className="absolute inset-0 animate-ping rounded-full bg-green-400/20" />
									<CheckCircle className="relative h-16 w-16 text-green-500" />
								</div>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Order #{order.number}</p>
								<h1 className="mt-1 text-2xl font-semibold">Thank you for your order!</h1>
							</div>
						</div>

						{/* Order Info Card */}
						<div className="overflow-hidden rounded-lg border border-border">
							<div className="bg-secondary/50 border-b border-border p-4">
								<h2 className="font-semibold">Your order is confirmed</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									You&apos;ll receive a confirmation email at {email}
								</p>
							</div>

							<div className="space-y-4 p-4">
								<div className="flex items-start gap-3">
									<Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium">Confirmation email sent</p>
										<p className="break-words text-sm text-muted-foreground">{email}</p>
									</div>
								</div>
								{order.shippingAddress && (
									<div className="flex items-start gap-3">
										<MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium">Shipping to</p>
											<p className="text-sm text-muted-foreground">
												{order.shippingAddress.firstName} {order.shippingAddress.lastName}
											</p>
											<p className="break-words text-sm text-muted-foreground">
												{formatAddress(order.shippingAddress)}
											</p>
										</div>
									</div>
								)}
								{order.billingAddress && (
									<div className="flex items-start gap-3">
										<CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium">Billed to</p>
											<p className="break-words text-sm text-muted-foreground">
												{formatAddress(order.billingAddress)}
											</p>
										</div>
									</div>
								)}
								<div className="flex items-start gap-3">
									<Package className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium">Estimated delivery</p>
										<p className="text-sm text-muted-foreground">{formattedDelivery}</p>
									</div>
								</div>
							</div>
						</div>

						{/* Order Items */}
						{order.lines.length > 0 && (
							<div className="overflow-hidden rounded-lg border border-border">
								<div className="bg-secondary/50 border-b border-border px-4 py-3">
									<h3 className="text-sm font-semibold">
										Items ({order.lines.reduce((sum, l) => sum + l.quantity, 0)})
									</h3>
								</div>
								<div className="divide-y divide-border">
									{order.lines.map((line) => (
										<div key={line.id} className="flex items-center gap-4 p-4">
											{line.thumbnail && (
												<div className="bg-secondary/30 h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
													<Image
														src={line.thumbnail.url}
														alt={line.thumbnail.alt ?? ""}
														width={112}
														height={112}
														className="h-full w-full object-contain"
													/>
												</div>
											)}
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium">{line.productName}</p>
												{line.variantName && (
													<p className="text-xs text-muted-foreground">{line.variantName}</p>
												)}
												<p className="text-xs text-muted-foreground">Qty: {line.quantity}</p>
											</div>
											<p className="text-sm font-medium tabular-nums">
												{formatMoneyWithFallback(line.totalPrice?.gross)}
											</p>
										</div>
									))}
								</div>

								{/* Totals */}
								<div className="border-t border-border px-4 py-3">
									<dl className="space-y-1.5 text-sm">
										<div className="flex justify-between">
											<dt className="text-muted-foreground">Subtotal</dt>
											<dd className="tabular-nums">{formatMoneyWithFallback(order.subtotal?.gross)}</dd>
										</div>
										<div className="flex justify-between">
											<dt className="text-muted-foreground">Shipping</dt>
											<dd className="tabular-nums">
												{order.shippingPrice?.gross?.amount === 0
													? "Free"
													: formatMoneyWithFallback(order.shippingPrice?.gross)}
											</dd>
										</div>
										{order.total?.tax?.amount > 0 && (
											<div className="flex justify-between">
												<dt className="text-muted-foreground">Tax</dt>
												<dd className="tabular-nums">{formatMoneyWithFallback(order.total.tax)}</dd>
											</div>
										)}
										{order.discounts?.length > 0 &&
											order.discounts.map((d, i) => (
												<div key={i} className="flex justify-between text-green-600">
													<dt>{d.name || "Discount"}</dt>
													<dd className="tabular-nums">-{formatMoneyWithFallback(d.amount)}</dd>
												</div>
											))}
										<div className="flex justify-between border-t border-border pt-2 font-semibold">
											<dt>Total</dt>
											<dd className="tabular-nums">{formatMoneyWithFallback(order.total?.gross)}</dd>
										</div>
									</dl>
								</div>
							</div>
						)}

						{/* Actions */}
						<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Link
								href={`/${channel}`}
								className="hover:bg-primary/90 inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors"
							>
								Continue shopping
							</Link>
							<Link
								href={`/${channel}/account/orders/${order.number}`}
								className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-transparent px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
							>
								View order details
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

const PollingState: FC = () => (
	<div className="min-h-screen bg-background">
		<div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
			<div className="rounded-lg border border-border bg-card p-8 md:p-12">
				<div className="flex flex-col items-center gap-6 text-center">
					<div className="relative">
						<div className="bg-primary/20 absolute inset-0 animate-ping rounded-full" />
						<div className="bg-primary/10 relative rounded-full p-4">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
						</div>
					</div>
					<div className="space-y-2">
						<h1 className="text-xl font-semibold">Confirming your order</h1>
						<p className="text-sm text-muted-foreground">
							Your payment was successful. We&apos;re creating your order now...
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
);

const TimeoutState: FC<{ channel: string }> = ({ channel }) => (
	<div className="min-h-screen bg-background">
		<div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
			<div className="rounded-lg border border-border bg-card p-8 md:p-12">
				<div className="space-y-6 text-center">
					<div className="flex justify-center">
						<AlertCircle className="h-14 w-14 text-amber-500" />
					</div>
					<div className="space-y-2">
						<h1 className="text-xl font-semibold">Payment received</h1>
						<p className="text-sm text-muted-foreground">
							Your payment was processed successfully but order confirmation is taking longer than expected.
							You&apos;ll receive a confirmation email shortly.
						</p>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
						<Link
							href={`/${channel}`}
							className="hover:bg-primary/90 inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors"
						>
							Continue shopping
						</Link>
						<Link
							href={`/${channel}/account/orders`}
							className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-transparent px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
						>
							View orders
						</Link>
					</div>
				</div>
			</div>
		</div>
	</div>
);
