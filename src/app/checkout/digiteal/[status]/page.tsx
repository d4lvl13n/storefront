import Link from "next/link";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { noIndexRobots } from "@/lib/seo";

export const metadata = {
	title: "Payment status | InfinityBio Labs",
	robots: noIndexRobots,
};

type DigitealReturnStatus = "confirm" | "error" | "cancel";

const statusContent = {
	confirm: {
		icon: CheckCircle,
		iconClassName: "text-green-600",
		title: "Payment submitted",
		body: "We are confirming the payment with Digiteal. Your order status will update as soon as the payment confirmation is received.",
	},
	error: {
		icon: AlertTriangle,
		iconClassName: "text-amber-600",
		title: "Payment could not be completed",
		body: "Digiteal reported that the payment did not complete. Please return to checkout and try again.",
	},
	cancel: {
		icon: XCircle,
		iconClassName: "text-muted-foreground",
		title: "Payment cancelled",
		body: "The Digiteal payment was cancelled. No payment was captured for this checkout.",
	},
} satisfies Record<
	DigitealReturnStatus,
	{
		icon: typeof CheckCircle;
		iconClassName: string;
		title: string;
		body: string;
	}
>;

export default async function DigitealReturnPage({
	params,
	searchParams,
}: {
	params: Promise<{ status: string }>;
	searchParams: Promise<{ transaction?: string }>;
}) {
	const { status } = await params;

	if (!isDigitealReturnStatus(status)) {
		notFound();
	}

	const { transaction } = await searchParams;
	const content = statusContent[status];
	const Icon = content.icon;
	const channel = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || "us-us";

	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<section className="w-full max-w-lg rounded-lg border border-border bg-card p-8 text-center shadow-sm">
				<div className="flex justify-center">
					<Icon className={`h-14 w-14 ${content.iconClassName}`} />
				</div>
				<h1 className="mt-6 text-2xl font-semibold">{content.title}</h1>
				<p className="mt-3 text-sm leading-6 text-muted-foreground">{content.body}</p>
				{transaction && (
					<p className="mt-5 break-all rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
						Transaction reference: {transaction}
					</p>
				)}
				<div className="mt-8 flex flex-col gap-3 sm:flex-row">
					<Link
						href={`/${channel}/cart`}
						className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						Return to cart
					</Link>
					<Link
						href={`/${channel}`}
						className="hover:bg-primary/90 inline-flex h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors"
					>
						Continue shopping
					</Link>
				</div>
			</section>
		</main>
	);
}

const isDigitealReturnStatus = (status: string): status is DigitealReturnStatus =>
	status === "confirm" || status === "error" || status === "cancel";
