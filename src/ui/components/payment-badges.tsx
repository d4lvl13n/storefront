/**
 * Branded payment badges used in the footer.
 *
 * Each badge renders as a small white card with the official-style
 * brand mark inside. White backgrounds are used intentionally so the
 * badges look like real payment card art on the dark footer.
 */

const cardShell =
	"inline-flex h-7 w-12 items-center justify-center rounded-[5px] border border-white/10 bg-white shadow-sm";

function VisaBadge() {
	return (
		<div className={cardShell} aria-label="Visa">
			<svg viewBox="0 0 40 16" className="h-3.5 w-auto" aria-hidden="true">
				<path
					fill="#1A1F71"
					d="M16.539 15.235h-3.21L15.345 1.21h3.21L16.54 15.235zM28.76 1.53c-.64-.25-1.64-.52-2.89-.52-3.18 0-5.42 1.66-5.44 4.04-.02 1.76 1.6 2.74 2.83 3.33 1.26.6 1.68.99 1.68 1.53 0 .82-1.01 1.2-1.95 1.2-1.3 0-2-.19-3.07-.64l-.42-.2-.46 2.79c.76.35 2.18.66 3.66.68 3.38 0 5.58-1.64 5.61-4.18.02-1.39-.86-2.45-2.74-3.32-1.14-.56-1.84-.93-1.83-1.5 0-.5.58-1.04 1.85-1.04 1.06-.02 1.83.22 2.42.46l.29.14.46-2.7zM37.39 1.21h-2.48c-.77 0-1.35.22-1.69 1.01l-4.76 13.01h3.37s.55-1.5.68-1.83h4.11c.1.42.39 1.83.39 1.83h2.97L37.39 1.21zm-3.9 9.04c.27-.7 1.28-3.38 1.28-3.38-.02.03.26-.7.43-1.15l.22 1.04s.61 2.89.74 3.49h-2.67zM10.54 1.21L7.44 10.7l-.33-1.66c-.58-1.92-2.4-4-4.43-5.04l2.83 11.22h3.4L13.94 1.21h-3.4z"
				/>
			</svg>
		</div>
	);
}

function MastercardBadge() {
	return (
		<div className={cardShell} aria-label="Mastercard">
			<svg viewBox="0 0 40 24" className="h-5 w-auto" aria-hidden="true">
				<circle cx="15" cy="12" r="7.5" fill="#EB001B" />
				<circle cx="25" cy="12" r="7.5" fill="#F79E1B" />
				<path d="M20 6.15a7.49 7.49 0 010 11.7 7.49 7.49 0 010-11.7z" fill="#FF5F00" />
			</svg>
		</div>
	);
}

function AmexBadge() {
	return (
		<div
			className="inline-flex h-7 items-center justify-center rounded-[5px] border border-white/10 px-2 shadow-sm"
			style={{ backgroundColor: "#1F72CD" }}
			aria-label="American Express"
		>
			<span className="font-sans text-[9px] font-bold leading-none tracking-[0.02em] text-white">
				AMERICAN
				<br />
				EXPRESS
			</span>
		</div>
	);
}

function ApplePayBadge() {
	return (
		<div
			className="inline-flex h-7 w-12 items-center justify-center gap-0.5 rounded-[5px] border border-white/10 shadow-sm"
			style={{ backgroundColor: "#000" }}
			aria-label="Apple Pay"
		>
			<svg viewBox="0 0 24 24" className="h-3 w-3 fill-white" aria-hidden="true">
				<path d="M17.05 12.04c-.03-2.93 2.4-4.35 2.5-4.42-1.36-1.99-3.48-2.26-4.24-2.3-1.8-.18-3.52 1.06-4.44 1.06-.93 0-2.34-1.04-3.84-1.01-1.98.03-3.8 1.15-4.82 2.92-2.06 3.57-.53 8.86 1.47 11.77.98 1.42 2.15 3.02 3.68 2.96 1.48-.06 2.04-.96 3.83-.96 1.79 0 2.29.96 3.85.93 1.59-.03 2.6-1.45 3.57-2.88 1.13-1.65 1.6-3.25 1.62-3.33-.04-.01-3.1-1.19-3.13-4.74zm-2.96-8.7c.82-.99 1.37-2.37 1.22-3.74-1.18.05-2.6.78-3.45 1.77-.76.88-1.43 2.28-1.25 3.63 1.32.1 2.66-.67 3.48-1.66z" />
			</svg>
			<span className="font-sans text-[8px] font-semibold leading-none text-white">Pay</span>
		</div>
	);
}

function PaypalBadge() {
	return (
		<div className={cardShell} aria-label="PayPal">
			<svg viewBox="0 0 40 14" className="h-3 w-auto" aria-hidden="true">
				<path
					fill="#003087"
					d="M6.55 2.2H3.2a.4.4 0 00-.4.33L1.5 10.7a.25.25 0 00.25.29h1.6a.4.4 0 00.4-.33l.35-2.22a.4.4 0 01.4-.33h1.06c2.2 0 3.47-1.07 3.8-3.18.15-.92 0-1.65-.42-2.16-.47-.56-1.3-.86-2.4-.86zm.38 3.14c-.18 1.2-1.1 1.2-1.99 1.2h-.5l.35-2.24a.24.24 0 01.24-.2h.23c.6 0 1.18 0 1.47.34.17.2.23.5.2.9z"
				/>
				<path
					fill="#009CDE"
					d="M17.57 5.28h-1.6a.24.24 0 00-.24.2l-.07.44-.11-.16c-.34-.5-1.11-.67-1.88-.67-1.76 0-3.27 1.34-3.56 3.22-.15.94.06 1.83.58 2.46.48.57 1.17.81 2 .81 1.42 0 2.21-.92 2.21-.92l-.07.43c-.03.16.1.3.25.3h1.44a.4.4 0 00.4-.34l.87-5.48a.25.25 0 00-.22-.29zm-2.24 3.12c-.15.9-.87 1.5-1.8 1.5-.47 0-.84-.15-1.08-.44-.24-.28-.33-.69-.26-1.14.14-.9.88-1.52 1.8-1.52.45 0 .83.16 1.07.45.24.3.34.7.27 1.15z"
				/>
				<path
					fill="#003087"
					d="M26.1 5.28h-1.6a.4.4 0 00-.34.18L21.95 9l-.95-3.4a.4.4 0 00-.39-.3h-1.57a.24.24 0 00-.23.32l1.77 5.19-1.66 2.35a.24.24 0 00.2.38h1.6a.4.4 0 00.33-.17l5.34-7.7a.24.24 0 00-.2-.39z"
				/>
				<path
					fill="#009CDE"
					d="M31.38 2.2h-3.35a.4.4 0 00-.4.33l-1.3 8.17a.25.25 0 00.25.29h1.72a.28.28 0 00.28-.24l.37-2.32a.4.4 0 01.4-.33h1.06c2.2 0 3.47-1.07 3.8-3.18.15-.92 0-1.65-.42-2.16-.47-.56-1.3-.86-2.41-.86zm.38 3.14c-.18 1.2-1.1 1.2-1.99 1.2h-.5l.35-2.24a.24.24 0 01.24-.2h.23c.6 0 1.17 0 1.47.34.17.2.22.5.2.9z"
				/>
				<path
					fill="#009CDE"
					d="M38.4 5.28h-1.6a.24.24 0 00-.23.2l-.08.44-.11-.16c-.34-.5-1.11-.67-1.88-.67-1.76 0-3.27 1.34-3.56 3.22-.15.94.07 1.83.58 2.46.48.57 1.17.81 2 .81 1.42 0 2.21-.92 2.21-.92l-.07.43c-.03.16.1.3.25.3h1.44a.4.4 0 00.4-.34l.87-5.48a.24.24 0 00-.22-.29zm-2.24 3.12c-.15.9-.87 1.5-1.8 1.5-.47 0-.84-.15-1.08-.44-.24-.28-.33-.69-.26-1.14.14-.9.88-1.52 1.8-1.52.45 0 .83.16 1.07.45.24.3.34.7.27 1.15z"
				/>
			</svg>
		</div>
	);
}

function CryptoBadge() {
	return (
		<div
			className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[5px] border border-white/10 px-2 shadow-sm"
			style={{ backgroundColor: "#F7931A" }}
			aria-label="Crypto (Bitcoin, Ethereum, USDC)"
		>
			<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white" aria-hidden="true">
				<path d="M15.04 10.09c.22-1.45-.88-2.23-2.39-2.75l.49-1.96-1.19-.3-.48 1.92c-.31-.08-.63-.15-.96-.23l.48-1.93-1.19-.3-.49 1.96-.76-.18-1.64-.41-.32 1.28s.88.2.86.21c.48.12.57.44.55.7l-1.33 5.37c-.07.15-.22.38-.56.29.02.02-.88-.22-.88-.22l-.6 1.37 1.55.39.85.22-.5 1.99 1.2.3.49-1.96c.32.09.64.17.95.25l-.49 1.95 1.2.3.5-1.99c2.03.38 3.55.23 4.2-1.6.52-1.48-.03-2.33-1.1-2.88.77-.18 1.35-.69 1.5-1.74zm-2.71 3.81c-.37 1.48-2.85.68-3.65.48l.65-2.62c.8.2 3.4.61 3 2.14zm.37-3.83c-.34 1.35-2.4.66-3.07.5l.59-2.38c.67.17 2.83.48 2.48 1.88z" />
			</svg>
			<span className="font-sans text-[9px] font-bold leading-none tracking-wide text-white">CRYPTO</span>
		</div>
	);
}

function WireBadge() {
	return (
		<div
			className="inline-flex h-7 items-center justify-center gap-1.5 rounded-[5px] border border-white/10 bg-white px-2 shadow-sm"
			aria-label="Bank wire transfer"
		>
			<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-neutral-800" aria-hidden="true">
				<path d="M3 10h18v2H3zm0 4h18v2H3zM12 2 1 7h22zM5 18h2v2H5zm4 0h2v2H9zm4 0h2v2h-2zm4 0h2v2h-2z" />
			</svg>
			<span className="font-sans text-[9px] font-bold leading-none tracking-wide text-neutral-800">WIRE</span>
		</div>
	);
}

export function PaymentBadges() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<VisaBadge />
			<MastercardBadge />
			<AmexBadge />
			<ApplePayBadge />
			<PaypalBadge />
			<CryptoBadge />
			<WireBadge />
		</div>
	);
}
