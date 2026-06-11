"use client";

import { useEffect, useRef, type FC } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutHeader } from "./checkout-header";
import { OrderSummary } from "./order-summary";
import { InformationStep } from "./information-step";
import { PaymentStep } from "./payment-step";
import { ConfirmationStep } from "./confirmation-step";
import { useCheckout } from "@/checkout/hooks/use-checkout";
import { useUser } from "@/checkout/hooks/use-user";
import { useCustomerAttach } from "@/checkout/hooks/use-customer-attach";
import { useAffiliateCode } from "@/checkout/hooks/use-affiliate-code";
import { EmptyCartPage } from "../empty-cart-page";
import { PageNotFound } from "../page-not-found";
import { PostPaymentConfirmation } from "./post-payment-confirmation";
import { CheckoutSkeleton } from "./checkout-skeleton";
import { getCheckoutSteps, getCurrentStepFromParams, type CheckoutStepType } from "./flow";
import { createQueryString } from "@/checkout/lib/utils/url";
import { trackBeginCheckoutFromCheckout } from "@/lib/analytics/track";

/**
 * Saleor checkout view with multi-step flow.
 *
 * Uses consistent step-by-step flow for all users.
 * For logged-in users with addresses, InformationStep shows address selector.
 * For guests, InformationStep shows address form.
 *
 * For digital products (isShippingRequired=false), shipping step is skipped.
 *
 * Layout: Full-width header, centered two-column content on gray background.
 */
export const SaleorCheckout: FC = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { checkout, fetching: fetchingCheckout, hasCheckoutId } = useCheckout();
	const { loading: isAuthenticating } = useUser();

	// Auto-attach logged-in user to checkout (runs once, persists across step changes)
	useCustomerAttach();

	// Auto-apply affiliate promo code from cookie (set via ?ref=CODE URL param)
	useAffiliateCode(checkout);

	// For digital products, skip shipping step (1 = info, 2 = payment, 3 = confirmation)
	// For physical products, full flow (1 = info, 2 = shipping, 3 = payment, 4 = confirmation)
	const isShippingRequired = checkout?.isShippingRequired ?? true;

	// Determine current step from URL
	const currentStep = getCurrentStepFromParams(searchParams, isShippingRequired);

	const dummyGatewayId = "mirumee.payments.dummy";
	const isHostedPaymentStep =
		currentStep.id === "PAYMENT" && checkout?.availablePaymentGateways?.some((g) => g.id !== dummyGatewayId);

	const stepRef = useRef<HTMLDivElement>(null);

	// Scroll to top and focus content when step changes (mobile UX + a11y)
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "instant" });
		stepRef.current?.focus();
	}, [currentStep.id]);

	// GA4 begin_checkout — once per checkout, when the user enters the flow (not on
	// the post-payment confirmation view, where the checkout is already consumed).
	const beganCheckoutFor = useRef<string | null>(null);
	useEffect(() => {
		if (!checkout || fetchingCheckout) return;
		if (searchParams.get("step") === "confirmation") return;
		if (beganCheckoutFor.current === checkout.id) return;
		beganCheckoutFor.current = checkout.id;
		trackBeginCheckoutFromCheckout(checkout);
	}, [checkout, fetchingCheckout, searchParams]);

	// Post-payment: if step=confirmation, show success page immediately.
	// The checkout is consumed by Saleor after payment, so don't wait for it.
	const stepSlug = searchParams.get("step");
	if (stepSlug === "confirmation") {
		return <PostPaymentConfirmation />;
	}

	// Checkout is invalid if: no checkout ID in URL, or fetching is done but no checkout data
	const isCheckoutInvalid = !hasCheckoutId || (!fetchingCheckout && !checkout && !isAuthenticating);
	const isEmptyCart = checkout && !checkout.lines.length;

	// Only show skeleton on initial load when we have no data yet
	const showInitialSkeleton = !checkout && (isAuthenticating || fetchingCheckout);

	if (isCheckoutInvalid) {
		return <PageNotFound />;
	}

	if (showInitialSkeleton) {
		return <CheckoutSkeleton />;
	}

	if (isEmptyCart) {
		return <EmptyCartPage />;
	}

	// Navigation helper
	const goToStep = (stepType: CheckoutStepType) => {
		const steps = getCheckoutSteps(isShippingRequired);
		const targetStep = steps.find((s) => s.id === stepType);
		if (targetStep) {
			const newQuery = createQueryString(searchParams, { step: targetStep.slug });
			// Using replace for smoother UX, could use push for history
			router.push(`?${newQuery}`, { scroll: false });
		}
	};

	return (
		<div className="min-h-screen overscroll-none bg-background">
			{/* Header - full width, white background */}
			<CheckoutHeader
				step={currentStep.index}
				onStepClick={(stepIndex) => {
					// Find step by index to get its slug
					const steps = getCheckoutSteps(isShippingRequired);
					const step = steps.find((s) => s.index === stepIndex);
					if (step) {
						goToStep(step.id);
					}
				}}
				isShippingRequired={isShippingRequired}
			/>

			{isHostedPaymentStep ? (
				<main className="flex-1">
					<div ref={stepRef} tabIndex={-1} className="outline-none">
						<PaymentStep
							checkout={checkout}
							onBack={() => goToStep("INFO")}
							onComplete={() => goToStep("CONFIRMATION")}
							onGoToInformation={() => goToStep("INFO")}
						/>
					</div>
				</main>
			) : (
				<main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 md:py-8 md:pb-8 lg:px-8">
					<div className="flex flex-col gap-8 md:flex-row">
						<div className="min-w-0 flex-1">
							<div className="mb-4 overflow-hidden rounded-lg border border-border bg-card md:hidden">
								<OrderSummary checkout={checkout} />
							</div>
							<div className="rounded-lg border border-border bg-card p-6 md:p-8">
								<div ref={stepRef} tabIndex={-1} className="outline-none">
									{currentStep.id === "INFO" && (
										<InformationStep checkout={checkout} onNext={() => goToStep("PAYMENT")} />
									)}
									{currentStep.id === "PAYMENT" && (
										<PaymentStep
											checkout={checkout}
											onBack={() => goToStep("INFO")}
											onComplete={() => goToStep("CONFIRMATION")}
											onGoToInformation={() => goToStep("INFO")}
										/>
									)}
									{currentStep.id === "CONFIRMATION" && <ConfirmationStep checkout={checkout} />}
								</div>
							</div>
						</div>

						<div className="hidden md:block md:shrink-0 md:basis-[30%]">
							<div className="overflow-hidden rounded-lg border border-border bg-card md:sticky md:top-8">
								<OrderSummary checkout={checkout} />
							</div>
						</div>
					</div>
				</main>
			)}
		</div>
	);
};
