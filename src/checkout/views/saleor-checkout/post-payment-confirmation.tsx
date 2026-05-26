"use client";

import { type FC } from "react";
import Link from "next/link";
import { CheckCircle, Mail, ShieldCheck } from "lucide-react";

export const PostPaymentConfirmation: FC = () => {
	const channel = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "us-usd";

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="rounded-lg border border-border bg-card p-8 md:p-12">
					<div className="space-y-8 text-center">
						<div className="flex justify-center">
							<div className="relative">
								<div className="absolute inset-0 animate-ping rounded-full bg-green-400/20" />
								<CheckCircle className="relative h-16 w-16 text-green-500" />
							</div>
						</div>

						<div className="space-y-2">
							<h1 className="text-2xl font-semibold">Thank you for your order!</h1>
							<p className="text-muted-foreground">Your payment has been processed successfully.</p>
						</div>

						<div className="bg-secondary/30 mx-auto max-w-sm space-y-4 rounded-lg p-6 text-left">
							<div className="flex items-start gap-3">
								<Mail className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Confirmation email</p>
									<p className="text-sm text-muted-foreground">
										A confirmation email with your order details is on its way.
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">Order tracking</p>
									<p className="text-sm text-muted-foreground">
										You can track your order status from your account page.
									</p>
								</div>
							</div>
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
};
