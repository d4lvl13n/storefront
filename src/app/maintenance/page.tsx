import type { Metadata } from "next";
import styles from "./maintenance.module.css";

/**
 * Standalone maintenance / temporary-takedown screen.
 *
 * Inherits only the root layout (fonts + globals) — no storefront header,
 * footer, Saleor data, or channel. Pure-CSS animations (no client JS) so it
 * renders instantly and survives even if hydration or the API is unavailable.
 *
 * Reachable directly at /maintenance for preview. To swap the WHOLE site to it,
 * flip MAINTENANCE_MODE=1 (see src/middleware.ts) — that gate is OFF by default.
 */
export const metadata: Metadata = {
	title: "We'll be right back · InfinityBio Labs",
	description: "InfinityBio Labs is undergoing scheduled maintenance. We'll be back shortly.",
	// Don't let the maintenance copy get indexed in place of the real catalog.
	robots: { index: false, follow: false },
};

const STATUS_LINES = [
	"» untangling the double helix…",
	"» coaxing peptides to fold correctly…",
	"» recalibrating the centrifuge…",
	"» counting every molecule (twice)…",
	"» bribing the electrons to cooperate…",
	"» politely asking the AI to hurry…",
];

export default function MaintenancePage() {
	return (
		<main className={styles.screen}>
			<div className={`${styles.orb} ${styles.orbA}`} aria-hidden="true" />
			<div className={`${styles.orb} ${styles.orbB}`} aria-hidden="true" />

			<div className={styles.molecules} aria-hidden="true">
				<span className={`${styles.molecule} ${styles.m1}`} />
				<span className={`${styles.molecule} ${styles.m2}`} />
				<span className={`${styles.molecule} ${styles.m3}`} />
				<span className={`${styles.molecule} ${styles.m4}`} />
				<span className={`${styles.molecule} ${styles.m5}`} />
				<span className={`${styles.molecule} ${styles.m6}`} />
			</div>

			<div className={styles.stage}>
				<div className={styles.orbit} aria-hidden="true">
					<span className={styles.electron} />
				</div>
				{/* Plain <img>, not next/image: a takedown page must not depend on the
				    /_next/image optimizer, which can be unavailable when the site is down. */}
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src="/InfinityBio_logo1.png"
					alt="InfinityBio Labs"
					width={800}
					height={322}
					className={styles.logo}
				/>
			</div>

			<div className={styles.copy}>
				<span className={styles.badge}>
					<span className={styles.dot} aria-hidden="true" />
					Maintenance in progress
				</span>
				<h1 className={styles.title}>We&apos;ll be right back.</h1>
				<p className={styles.subtitle}>
					InfinityBio Labs is running scheduled maintenance. Our scientists are on it.
				</p>

				<div className={styles.ticker} aria-hidden="true">
					{/* extra copy of the first line at the end → seamless CSS loop */}
					<div className={styles.tickerList}>
						{[...STATUS_LINES, STATUS_LINES[0]].map((line, i) => (
							<span key={i} className={styles.tickerItem}>
								{line}
							</span>
						))}
					</div>
				</div>
			</div>

			<div className={styles.progressWrap} aria-hidden="true">
				<div className={styles.progressMeta}>
					<span>Reassembling the lab</span>
					<strong>∞%</strong>
				</div>
				<div className={styles.track}>
					<div className={styles.fill} />
				</div>
			</div>

			<p className={styles.footnote}>
				Estimated time remaining: <span>∞</span> · no molecules were harmed.
			</p>
		</main>
	);
}
