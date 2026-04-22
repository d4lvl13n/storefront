"use client";

import { useEffect, useRef, useState } from "react";

type Locale = {
	code: string;
	label: string;
	flag: React.ReactNode;
};

const USFlag = () => (
	<svg viewBox="0 0 24 16" className="h-4 w-6 shrink-0 overflow-hidden rounded-[2px]" aria-hidden="true">
		<rect width="24" height="16" fill="#B22234" />
		<rect y="1.23" width="24" height="1.23" fill="#fff" />
		<rect y="3.69" width="24" height="1.23" fill="#fff" />
		<rect y="6.15" width="24" height="1.23" fill="#fff" />
		<rect y="8.62" width="24" height="1.23" fill="#fff" />
		<rect y="11.08" width="24" height="1.23" fill="#fff" />
		<rect y="13.54" width="24" height="1.23" fill="#fff" />
		<rect width="9.6" height="8.62" fill="#3C3B6E" />
	</svg>
);

const ESFlag = () => (
	<svg viewBox="0 0 24 16" className="h-4 w-6 shrink-0 overflow-hidden rounded-[2px]" aria-hidden="true">
		<rect width="24" height="16" fill="#AA151B" />
		<rect y="4" width="24" height="8" fill="#F1BF00" />
	</svg>
);

const LOCALES: Locale[] = [
	{ code: "en-US", label: "English (US)", flag: <USFlag /> },
	{ code: "es", label: "Español", flag: <ESFlag /> },
];

const COOKIE_NAME = "preferred_locale";

function getCookie(name: string): string | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
	return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
	if (typeof document === "undefined") return;
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${
		60 * 60 * 24 * 365
	}; samesite=lax`;
}

export function LanguageSwitcher() {
	const [open, setOpen] = useState(false);
	const [current, setCurrent] = useState<string>("en-US");
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		requestAnimationFrame(() => {
			const saved = getCookie(COOKIE_NAME);
			if (saved && LOCALES.some((l) => l.code === saved)) {
				setCurrent(saved);
			}
		});
	}, []);

	useEffect(() => {
		if (!open) return;
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", handleClick);
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("mousedown", handleClick);
			document.removeEventListener("keydown", handleKey);
		};
	}, [open]);

	const active = LOCALES.find((l) => l.code === current) ?? LOCALES[0];

	function selectLocale(code: string) {
		setCurrent(code);
		setCookie(COOKIE_NAME, code);
		setOpen(false);
	}

	return (
		<div className="relative" ref={menuRef}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={`Language: ${active.label}`}
				className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
			>
				{active.flag}
				<span className="hidden sm:inline">{active.code.split("-")[0].toUpperCase()}</span>
				<svg
					className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
					viewBox="0 0 12 12"
					fill="none"
					aria-hidden="true"
				>
					<path
						d="M3 4.5L6 7.5L9 4.5"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{open && (
				<ul
					role="listbox"
					className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
				>
					{LOCALES.map((locale) => {
						const isActive = locale.code === current;
						return (
							<li key={locale.code} role="option" aria-selected={isActive}>
								<button
									type="button"
									onClick={() => selectLocale(locale.code)}
									className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
										isActive
											? "bg-accent text-foreground"
											: "text-muted-foreground hover:bg-accent hover:text-foreground"
									}`}
								>
									{locale.flag}
									<span>{locale.label}</span>
									{isActive && (
										<svg
											className="ml-auto h-4 w-4 text-emerald-400"
											viewBox="0 0 20 20"
											fill="currentColor"
											aria-hidden="true"
										>
											<path
												fillRule="evenodd"
												d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
												clipRule="evenodd"
											/>
										</svg>
									)}
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
