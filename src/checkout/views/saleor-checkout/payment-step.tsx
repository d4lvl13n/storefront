"use client";

import { useState, useEffect, useCallback, useRef, type FC } from "react";
import { ChevronLeft, AlertCircle, CreditCard, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/ui/components/ui/button";
import { CheckoutSummaryContext, buildPaymentSummaryRows } from "./checkout-summary-context";
import {
	type CheckoutFragment,
	type CountryCode,
	type AddressFragment,
	useCheckoutBillingAddressUpdateMutation,
	useTransactionInitializeMutation,
	useCheckoutCompleteMutation,
} from "@/checkout/graphql";
import { useCheckout } from "@/checkout/hooks/use-checkout";
import { useUser } from "@/checkout/hooks/use-user";
import { getAddressInputData } from "@/checkout/components/address-form/utils";
import { createQueryString } from "@/checkout/lib/utils/url";
import { localeConfig } from "@/config/locale";
import { MobileStickyAction } from "./mobile-sticky-action";
import { getStepNumber } from "./flow";
import {
	BillingAddressSection,
	type CardData,
	type BillingAddressData,
	isCardDataValid,
} from "@/checkout/components/payment";
import { LoadingSpinner } from "@/checkout/ui-kit/loading-spinner";
import { formatMoneyWithFallback } from "@/checkout/lib/utils/money";

const dummyGatewayId = "mirumee.payments.dummy";

type HostedPaymentData = {
	widgetUrl: string;
	widgetMode: string;
	merchantId: string;
	currency: string;
	fromApiPayload: Record<string, unknown>;
};

interface PaymentStepProps {
	checkout: CheckoutFragment;
	onBack: () => void;
	onComplete: () => void;
	onGoToInformation?: () => void;
}

type PaymentGateway = NonNullable<CheckoutFragment["availablePaymentGateways"]>[number];

const isHostedGateway = (gateway: PaymentGateway) => gateway.id !== dummyGatewayId;

const parsePaymentData = (data: unknown): Record<string, unknown> | null => {
	if (typeof data === "string") {
		try {
			return parsePaymentData(JSON.parse(data) as unknown);
		} catch {
			return null;
		}
	}
	if (!data || typeof data !== "object") return null;
	return data as Record<string, unknown>;
};

const extractHostedPaymentUrl = (data: unknown, externalUrl?: string | null): string | null => {
	if (externalUrl) return externalUrl;
	const payload = parsePaymentData(data);
	if (!payload) return null;
	const paymentUrl = payload.paymentUrl ?? payload.externalUrl;
	return typeof paymentUrl === "string" && paymentUrl.length > 0 ? paymentUrl : null;
};

const extractPaymentMessage = (data: unknown, eventMessage?: string | null): string | null => {
	const payload = parsePaymentData(data);
	const dataMessage = payload?.message;
	if (typeof dataMessage === "string" && dataMessage.length > 0) return dataMessage;
	return eventMessage || null;
};

export const PaymentStep: FC<PaymentStepProps> = ({
	checkout: initialCheckout,
	onBack,
	onComplete: _onComplete,
	onGoToInformation,
}) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { checkout: liveCheckout } = useCheckout();
	const checkout = liveCheckout || initialCheckout;
	const { user, authenticated } = useUser();

	const isShippingRequired = checkout.isShippingRequired;
	const hasShippingAddress = !!checkout.shippingAddress;
	const shippingAddress = checkout.shippingAddress;

	const [cardData] = useState<CardData>(() => ({
		cardNumber: "",
		expiry: "",
		cvc: "",
		nameOnCard: "",
	}));

	const [sameAsBilling, setSameAsBilling] = useState(isShippingRequired && hasShippingAddress);
	const [billingData, setBillingData] = useState<BillingAddressData>(() => ({
		countryCode: (checkout.billingAddress?.country?.code as CountryCode) || "US",
		formData: {
			firstName: checkout.billingAddress?.firstName || "",
			lastName: checkout.billingAddress?.lastName || "",
			streetAddress1: checkout.billingAddress?.streetAddress1 || "",
			streetAddress2: checkout.billingAddress?.streetAddress2 || "",
			companyName: checkout.billingAddress?.companyName || "",
			city: checkout.billingAddress?.city || "",
			postalCode: checkout.billingAddress?.postalCode || "",
			countryArea: checkout.billingAddress?.countryArea || "",
			phone: checkout.billingAddress?.phone || "",
		},
	}));

	useEffect(() => {
		const billing = checkout.billingAddress;
		if (billing) {
			setBillingData((prev) => ({
				...prev,
				countryCode: (billing.country?.code as CountryCode) || "US",
				formData: {
					firstName: billing.firstName || "",
					lastName: billing.lastName || "",
					streetAddress1: billing.streetAddress1 || "",
					streetAddress2: billing.streetAddress2 || "",
					companyName: billing.companyName || "",
					city: billing.city || "",
					postalCode: billing.postalCode || "",
					countryArea: billing.countryArea || "",
					cityArea: billing.cityArea || "",
					phone: billing.phone || "",
				},
			}));
		}
	}, [checkout.billingAddress]);

	const [isProcessing, setIsProcessing] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [hostedPaymentData, setHostedPaymentData] = useState<HostedPaymentData | null>(null);
	const widgetInitialized = useRef(false);

	const [, updateBillingAddress] = useCheckoutBillingAddressUpdateMutation();
	const [transactionState, transactionInitialize] = useTransactionInitializeMutation();
	const [completeState, checkoutComplete] = useCheckoutCompleteMutation();

	const availableGateways = checkout.availablePaymentGateways || [];
	const hostedGateway = availableGateways.find(isHostedGateway);
	const hasHostedGateway = Boolean(hostedGateway);
	const hasDummyGateway = availableGateways.some((g) => g.id === dummyGatewayId);
	const hasSupportedGateway = hasHostedGateway || hasDummyGateway;

	const syncBillingAddress = useCallback(async () => {
		if (sameAsBilling && shippingAddress) {
			const addressInput = getAddressInputData({
				firstName: shippingAddress.firstName || "",
				lastName: shippingAddress.lastName || "",
				streetAddress1: shippingAddress.streetAddress1 || "",
				streetAddress2: shippingAddress.streetAddress2 || "",
				companyName: shippingAddress.companyName || "",
				city: shippingAddress.city || "",
				postalCode: shippingAddress.postalCode || "",
				countryArea: shippingAddress.countryArea || "",
				phone: shippingAddress.phone || "",
				countryCode: shippingAddress.country?.code as CountryCode,
			});
			await updateBillingAddress({
				checkoutId: checkout.id,
				billingAddress: addressInput,
				languageCode: localeConfig.graphqlLanguageCode,
			});
		}
	}, [sameAsBilling, shippingAddress, checkout.id, updateBillingAddress]);

	const initializeHostedPayment = useCallback(async () => {
		if (!hostedGateway || widgetInitialized.current) return;
		widgetInitialized.current = true;

		setIsProcessing(true);
		try {
			await syncBillingAddress();

			const amount = checkout.totalPrice?.gross.amount;
			if (!amount) {
				setErrors({ payment: "Checkout total is missing." });
				return;
			}

			const initResult = await transactionInitialize({
				checkoutId: checkout.id,
				amount,
				paymentGateway: { id: hostedGateway.id, data: {} },
			});

			if (initResult.error) {
				setErrors({ payment: "Payment initialization failed. Please try again." });
				widgetInitialized.current = false;
				return;
			}

			const txErrors = initResult.data?.transactionInitialize?.errors;
			if (txErrors?.length) {
				setErrors({ payment: txErrors[0].message || "Payment initialization failed" });
				widgetInitialized.current = false;
				return;
			}

			const responseData = parsePaymentData(initResult.data?.transactionInitialize?.data);

			if (responseData?.fromApiPayload) {
				setHostedPaymentData({
					widgetUrl: responseData.widgetUrl as string,
					widgetMode: responseData.widgetMode as string,
					merchantId: responseData.merchantId as string,
					currency: responseData.currency as string,
					fromApiPayload: responseData.fromApiPayload as Record<string, unknown>,
				});
				return;
			}

			const redirectUrl = extractHostedPaymentUrl(
				initResult.data?.transactionInitialize?.data,
				initResult.data?.transactionInitialize?.transactionEvent?.externalUrl,
			);
			if (redirectUrl) {
				window.location.assign(redirectUrl);
				return;
			}

			setErrors({
				payment:
					extractPaymentMessage(
						initResult.data?.transactionInitialize?.data,
						initResult.data?.transactionInitialize?.transactionEvent?.message,
					) || "Payment is unavailable. Please try again.",
			});
			widgetInitialized.current = false;
		} finally {
			setIsProcessing(false);
		}
	}, [
		hostedGateway,
		checkout.id,
		checkout.totalPrice?.gross.amount,
		transactionInitialize,
		syncBillingAddress,
	]);

	useEffect(() => {
		if (hasHostedGateway && !hostedPaymentData && !widgetInitialized.current) {
			initializeHostedPayment();
		}
	}, [hasHostedGateway, hostedPaymentData, initializeHostedPayment]);

	const handleBillingDataChange = useCallback((data: BillingAddressData) => {
		setBillingData(data);
	}, []);

	const summaryRows = buildPaymentSummaryRows(checkout);

	const handleGoToStep = (step: number) => {
		if (step === 1 && onGoToInformation) onGoToInformation();
		else if (step === 2) onBack();
	};

	const total = checkout.totalPrice?.gross;
	const totalStr = formatMoneyWithFallback(total);

	const handleDummySubmit = useCallback(
		async (event?: React.FormEvent) => {
			if (event) event.preventDefault();
			setErrors({});
			setIsProcessing(true);

			try {
				const needsBillingForm = !sameAsBilling || !hasShippingAddress;

				if (needsBillingForm) {
					let addressInput;
					if (billingData.selectedAddressId && user?.addresses) {
						const selectedAddress = user.addresses.find((addr) => addr.id === billingData.selectedAddressId);
						if (selectedAddress) {
							addressInput = getAddressInputData({
								firstName: selectedAddress.firstName || "",
								lastName: selectedAddress.lastName || "",
								streetAddress1: selectedAddress.streetAddress1 || "",
								streetAddress2: selectedAddress.streetAddress2 || "",
								companyName: selectedAddress.companyName || "",
								city: selectedAddress.city || "",
								postalCode: selectedAddress.postalCode || "",
								countryArea: selectedAddress.countryArea || "",
								phone: selectedAddress.phone || "",
								countryCode: selectedAddress.country?.code as CountryCode,
							});
						}
					}
					if (!addressInput) {
						addressInput = getAddressInputData({
							...billingData.formData,
							countryCode: billingData.countryCode,
						});
					}
					const result = await updateBillingAddress({
						checkoutId: checkout.id,
						billingAddress: addressInput,
						languageCode: localeConfig.graphqlLanguageCode,
					});
					if (result.error) {
						setErrors({ streetAddress1: "Failed to update billing address" });
						return;
					}
					const billingErrors = result.data?.checkoutBillingAddressUpdate?.errors;
					if (billingErrors?.length) {
						const errorMap: Record<string, string> = {};
						billingErrors.forEach((err) => {
							const field = err.field || "streetAddress1";
							errorMap[field] = err.message || "Invalid value";
						});
						setErrors(errorMap);
						return;
					}
				} else if (shippingAddress) {
					await syncBillingAddress();
				}

				const initResult = await transactionInitialize({
					checkoutId: checkout.id,
					paymentGateway: {
						id: dummyGatewayId,
						data: { event: { includePspReference: true, type: "CHARGE_SUCCESS" } },
					},
				});

				if (initResult.error || initResult.data?.transactionInitialize?.errors?.length) {
					setErrors({ payment: "Payment failed. Please try again." });
					return;
				}

				const completeResult = await checkoutComplete({ checkoutId: checkout.id });
				if (completeResult.error || completeResult.data?.checkoutComplete?.errors?.length) {
					const firstError = completeResult.data?.checkoutComplete?.errors?.[0];
					setErrors({ payment: firstError?.message || "Failed to complete order." });
					return;
				}

				const order = completeResult.data?.checkoutComplete?.order;
				if (order) {
					const newQuery = createQueryString(searchParams, { orderId: order.id });
					router.replace(`?${newQuery}`, { scroll: false });
				}
			} finally {
				setIsProcessing(false);
			}
		},
		[
			sameAsBilling,
			hasShippingAddress,
			billingData,
			user?.addresses,
			shippingAddress,
			checkout.id,
			syncBillingAddress,
			updateBillingAddress,
			transactionInitialize,
			checkoutComplete,
			searchParams,
			router,
		],
	);

	const isPaymentProcessing = transactionState.fetching || completeState.fetching;
	const isLoading = isProcessing || isPaymentProcessing;

	if (hasHostedGateway) {
		return (
			<div className="-mx-6 -my-6 md:-mx-8 md:-my-8">
				{isLoading && !hostedPaymentData && (
					<div className="flex flex-col items-center justify-center gap-6 py-20">
						<div className="relative">
							<div className="bg-primary/20 absolute inset-0 animate-ping rounded-full" />
							<div className="bg-primary/10 relative rounded-full p-4">
								<LoadingSpinner />
							</div>
						</div>
						<div className="text-center">
							<p className="font-medium">Preparing secure payment</p>
							<p className="mt-1 text-sm text-muted-foreground">Connecting to payment provider...</p>
						</div>
					</div>
				)}

				{errors.payment && (
					<div className="p-6 md:p-8">
						<div className="border-destructive/50 bg-destructive/10 flex items-start gap-3 rounded-lg border p-4">
							<AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
							<div>
								<p className="font-medium text-destructive">Payment failed</p>
								<p className="text-destructive/80 text-sm">{errors.payment}</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onBack}
							className="mt-4 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<ChevronLeft className="h-4 w-4" />
							Return to shipping
						</button>
					</div>
				)}

				{hostedPaymentData &&
					(() => {
						const totals = hostedPaymentData.fromApiPayload?.merchantSuppliedTotals as
							| Record<string, number | string>
							| undefined;
						return (
							<div className="flex flex-col">
								{/* Widget container — clean white surface */}
								<div className="overflow-hidden rounded-t-lg bg-white">
									<div
										data-sellabroad-payment-container
										data-merchant-id={hostedPaymentData.merchantId}
										data-platform="api"
										data-mode={hostedPaymentData.widgetMode}
										data-currency={hostedPaymentData.currency}
										data-subtotal-cents={totals?.subtotal_cents}
										data-shipping-cents={totals?.shipping_cents}
										data-tax-cents={totals?.tax_cents}
										data-discount-cents={totals?.discount_cents}
										data-total-cents={totals?.total_cents}
										data-success-url={`${window.location.origin}/checkout?step=confirmation`}
										data-from-api-payload={JSON.stringify(hostedPaymentData.fromApiPayload)}
										className="min-h-[420px] w-full"
									/>
									<script src={hostedPaymentData.widgetUrl} async />
								</div>

								{/* Footer bar */}
								<div className="bg-card/50 flex items-center justify-between border-t border-border px-6 py-4">
									<button
										type="button"
										onClick={onBack}
										className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
									>
										<ChevronLeft className="h-4 w-4" />
										{isShippingRequired ? "Return to shipping" : "Return to information"}
									</button>
									<div className="flex items-center gap-2 text-xs text-muted-foreground">
										<ShieldCheck className="h-3.5 w-3.5" />
										<span>256-bit SSL encrypted</span>
									</div>
								</div>
							</div>
						);
					})()}
			</div>
		);
	}

	const isCardValid = isCardDataValid(cardData);
	const isDisabled = isLoading || !hasSupportedGateway || !isCardValid;
	const buttonText = isLoading
		? completeState.fetching
			? "Creating order..."
			: "Processing payment..."
		: `Pay ${totalStr}`;

	return (
		<form className="space-y-8" onSubmit={handleDummySubmit}>
			<CheckoutSummaryContext checkout={checkout} rows={summaryRows} onGoToStep={handleGoToStep} />

			{!hasSupportedGateway && (
				<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
					<div>
						<p className="font-medium text-amber-800">No payment gateway configured</p>
						<p className="mt-1 text-sm text-amber-700">
							To accept payments, install a payment app from the Saleor Dashboard.
						</p>
					</div>
				</div>
			)}

			{hasDummyGateway && (
				<div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
					<div>
						<p className="font-medium text-blue-800">Test Mode</p>
						<p className="mt-1 text-sm text-blue-700">
							Using test payment gateway. No real charges will be made.
						</p>
					</div>
				</div>
			)}

			<section className="space-y-4">
				<h2 className="text-lg font-semibold">Payment</h2>
				<div className="rounded-lg border border-foreground p-4">
					<div className="flex items-center gap-3">
						<CreditCard className="h-5 w-5 text-muted-foreground" />
						<span className="font-medium">Credit card</span>
						<span className="ml-auto text-xs text-muted-foreground">Test mode</span>
					</div>
				</div>
			</section>

			<BillingAddressSection
				billingAddress={checkout.billingAddress}
				shippingAddress={shippingAddress}
				userAddresses={authenticated ? (user?.addresses as AddressFragment[]) : undefined}
				defaultBillingAddressId={user?.defaultBillingAddress?.id}
				isShippingRequired={isShippingRequired}
				errors={errors}
				onChange={handleBillingDataChange}
				onSameAsShippingChange={setSameAsBilling}
				initialSameAsShipping={sameAsBilling}
			/>

			{errors.payment && (
				<div className="border-destructive/50 bg-destructive/10 flex items-start gap-3 rounded-lg border p-4">
					<AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
					<div>
						<p className="font-medium text-destructive">Payment failed</p>
						<p className="text-destructive/80 text-sm">{errors.payment}</p>
					</div>
				</div>
			)}

			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ChevronLeft className="h-4 w-4" />
					{isShippingRequired ? "Return to shipping" : "Return to information"}
				</button>
				<Button type="submit" disabled={isDisabled} className="hidden h-12 min-w-[200px] px-8 md:flex">
					{isLoading ? (
						<span className="flex items-center gap-2">
							<LoadingSpinner />
							{buttonText}
						</span>
					) : (
						buttonText
					)}
				</Button>
			</div>

			<MobileStickyAction
				step={getStepNumber("PAYMENT", isShippingRequired)}
				isShippingRequired={isShippingRequired}
				type="submit"
				onAction={handleDummySubmit}
				isLoading={isLoading}
				disabled={isDisabled}
				total={totalStr}
				loadingText={completeState.fetching ? "Creating order..." : "Processing payment..."}
			/>
		</form>
	);
};
