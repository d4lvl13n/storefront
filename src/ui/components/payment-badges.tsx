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

export function PaymentBadges() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<VisaBadge />
			<MastercardBadge />
		</div>
	);
}
