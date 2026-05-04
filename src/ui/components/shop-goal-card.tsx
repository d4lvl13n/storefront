import Image from "next/image";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

/**
 * Minimal node shape used by the card. Compatible with both `CollectionsListQuery`
 * and `CategoriesListQuery` node types — either can be passed in.
 */
type GoalCardNode = {
	id: string;
	name: string;
	slug: string;
	backgroundImage?: { url: string; alt?: string | null } | null;
};

type CollectionNode = GoalCardNode;

type HoverMediaOverride = {
	src: string;
	alt?: string;
	objectPosition?: string;
};

// Media overrides keyed on current mechanism-class slugs. Images live under /public.
// Reuses the existing artwork where the semantic fit is neutral (molecular glass-vial
// hero shots). The abstract `GoalVisual` scenes render underneath regardless.
const hoverMediaOverrides: Partial<Record<string, HoverMediaOverride>> = {
	"glp-1-receptor-agonists": {
		src: "/cognitive.webp",
		alt: "GLP-1 receptor agonist reference vial",
		objectPosition: "center center",
	},
	"growth-hormone-secretagogues": {
		src: "/growth.webp",
		alt: "Growth hormone secretagogue reference vial",
		objectPosition: "center center",
	},
	"growth-hormone-derivatives": {
		src: "/growth.webp",
		alt: "Growth hormone derivative reference vial",
		objectPosition: "center center",
	},
	"growth-factors": {
		src: "/growth.webp",
		alt: "Growth factor reference vial",
		objectPosition: "center center",
	},
	"cytoprotective-peptides": {
		src: "/growth.webp",
		alt: "Cytoprotective peptide reference vial",
		objectPosition: "center center",
	},
	"thymic-peptides": {
		src: "/immune.webp",
		alt: "Thymic peptide reference vial",
		objectPosition: "center center",
	},
	"melanocortin-receptor-modulators": {
		src: "/Aesthetics.webp",
		alt: "Melanocortin receptor modulator reference vial",
		objectPosition: "center center",
	},
	"copper-peptide-complexes": {
		src: "/Aesthetics.webp",
		alt: "Copper peptide complex reference vial",
		objectPosition: "center center",
	},
	"nootropic-peptides": {
		src: "/cognitive.webp",
		alt: "Nootropic reference peptide vial",
		objectPosition: "center center",
	},
	"mitochondrial-peptides": {
		src: "/longevity.webp",
		alt: "Mitochondrial peptide reference vial",
		objectPosition: "center center",
	},
	"pineal-peptides": {
		src: "/longevity.webp",
		alt: "Pineal peptide reference vial",
		objectPosition: "center center",
	},
	"reproductive-hormones": {
		src: "/fertility.webp",
		alt: "Reproductive hormone reference vial",
		objectPosition: "center center",
	},
};

/**
 * Card eyebrow + tag metadata keyed on mechanism-class slugs.
 *
 * Labels describe chemical class or receptor target only. Do NOT re-introduce
 * benefit-language tags ("Longevity", "Recovery", "Vitality", "Performance",
 * "Dermal", "Immune", etc.) — those are the FDA "intended use" evidence pattern
 * per the Frier Levitt memo (Warrior Labz, Summit Research).
 */
const mechanismMeta: Record<string, { eyebrow: string; tag: string }> = {
	"glp-1-receptor-agonists": { eyebrow: "Incretin pathway", tag: "GLP-1" },
	"growth-hormone-secretagogues": { eyebrow: "Somatotropic axis", tag: "GH-secretagogue" },
	"growth-hormone-derivatives": { eyebrow: "GH fragment", tag: "GH derivative" },
	"growth-factors": { eyebrow: "Growth factor", tag: "IGF-family" },
	"cytoprotective-peptides": { eyebrow: "Cellular protection", tag: "Cytoprotective" },
	"thymic-peptides": { eyebrow: "Thymic signalling", tag: "Thymic" },
	"melanocortin-receptor-modulators": { eyebrow: "Melanocortin receptor", tag: "Melanocortin" },
	"copper-peptide-complexes": { eyebrow: "Copper complex", tag: "GHK-Cu" },
	"nootropic-peptides": { eyebrow: "Neurochemistry", tag: "Nootropic" },
	"mitochondrial-peptides": { eyebrow: "Mitochondrial", tag: "Bioenergetics" },
	"pineal-peptides": { eyebrow: "Pineal peptide", tag: "Chronobiology" },
	"antimicrobial-peptides": { eyebrow: "Host defence", tag: "Antimicrobial" },
	neuropeptides: { eyebrow: "Neuropeptide", tag: "Receptor research" },
	"reproductive-hormones": { eyebrow: "Reproductive axis", tag: "Endocrine" },
	"research-small-molecules": { eyebrow: "Small molecule", tag: "Non-peptide" },
	"peptide-blends": { eyebrow: "Multi-peptide", tag: "Blend" },
	"cosmetic-injectables": { eyebrow: "Cosmetic science", tag: "Injectable" },
	"metabolic-injectables": { eyebrow: "Metabolic research", tag: "Injectable" },
	"reference-peptides-miscellaneous": { eyebrow: "Reference peptides", tag: "Miscellaneous" },
	supplies: { eyebrow: "Lab consumables", tag: "Supplies" },
	"research-accessories": { eyebrow: "Lab consumables", tag: "Accessories" },
};

function getGoalMeta(slug: string) {
	return mechanismMeta[slug] ?? { eyebrow: "Research collection", tag: "Reference" };
}

function OrbitalScene() {
	return (
		<div className="absolute inset-0 overflow-hidden">
			<div className="absolute left-8 top-8 h-16 w-16 rounded-full border border-emerald-500/20 [animation:ib-goal-pulse_5.8s_ease-in-out_infinite]" />
			<div className="absolute left-10 top-10 h-12 w-12 rounded-full border border-border" />
			<div className="absolute left-8 top-8 h-16 w-16 [animation:ib-goal-orbit_14s_linear_infinite]">
				<span className="absolute -right-1 top-6 h-2.5 w-2.5 rounded-full bg-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
			</div>
			<div className="absolute right-8 top-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				<span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
				Multi-stage verified
			</div>
			<div className="absolute inset-x-8 bottom-10 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
			<div className="absolute bottom-8 left-8 right-8 flex items-end gap-2">
				{[44, 76, 58, 90, 64, 82].map((height, index) => (
					<span
						key={height}
						className="w-2 origin-bottom rounded-full bg-gradient-to-t from-emerald-500/20 to-emerald-300/80 [animation:ib-goal-bar_2.8s_ease-in-out_infinite]"
						style={{ height: `${height}px`, animationDelay: `${index * 130}ms` }}
					/>
				))}
			</div>
		</div>
	);
}

function WaveScene() {
	return (
		<div className="absolute inset-0 overflow-hidden">
			<svg
				className="absolute inset-x-6 bottom-10 top-8 h-[calc(100%-4.5rem)] w-[calc(100%-3rem)]"
				viewBox="0 0 240 120"
				fill="none"
			>
				<path
					d="M0 72C20 72 24 32 44 32C64 32 68 88 88 88C108 88 112 42 132 42C152 42 156 78 176 78C196 78 204 54 240 54"
					stroke="rgba(94,234,212,0.55)"
					strokeWidth="2"
					strokeLinecap="round"
					className="[animation:ib-goal-drift_4.6s_ease-in-out_infinite]"
				/>
				<path
					d="M0 88C16 88 26 56 42 56C58 56 70 96 88 96C106 96 112 64 132 64C152 64 156 102 180 102C204 102 212 76 240 76"
					stroke="rgba(52,211,153,0.35)"
					strokeWidth="1.5"
					strokeLinecap="round"
					className="[animation:ib-goal-drift_5.4s_ease-in-out_infinite]"
				/>
			</svg>
			<div className="absolute left-8 top-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				Response signal
			</div>
			<div className="absolute right-8 top-8 flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300/70" />
				Stable pattern
			</div>
			<div className="absolute inset-x-8 bottom-8 flex gap-2">
				{["Theta", "Delta", "REM"].map((label, index) => (
					<span
						key={label}
						className="rounded-full border border-emerald-500/15 bg-black/35 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-300/75 [animation:ib-goal-float_4.4s_ease-in-out_infinite]"
						style={{ animationDelay: `${index * 240}ms` }}
					>
						{label}
					</span>
				))}
			</div>
		</div>
	);
}

function TrajectoryScene() {
	return (
		<div className="absolute inset-0 overflow-hidden">
			<svg
				className="absolute inset-x-8 bottom-8 top-8 h-[calc(100%-4rem)] w-[calc(100%-4rem)]"
				viewBox="0 0 240 120"
				fill="none"
			>
				<path
					d="M6 96L68 58L118 68L182 28L234 16"
					stroke="rgba(52,211,153,0.8)"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M6 108L68 74L118 82L182 54L234 34"
					stroke="rgba(94,234,212,0.24)"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{[
					["68", "58"],
					["118", "68"],
					["182", "28"],
					["234", "16"],
				].map(([cx, cy], index) => (
					<circle
						key={`${cx}-${cy}`}
						cx={cx}
						cy={cy}
						r="4"
						fill="rgba(16,185,129,0.9)"
						className="[animation:ib-goal-pulse_3.4s_ease-in-out_infinite]"
						style={{ animationDelay: `${index * 160}ms` }}
					/>
				))}
			</svg>
			<div className="absolute left-8 top-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				Pathway lift
			</div>
			<div className="absolute right-8 top-8 rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
				+ verified trend
			</div>
		</div>
	);
}

function AuraScene() {
	return (
		<div className="absolute inset-0 overflow-hidden">
			<div className="from-emerald-400/18 via-teal-300/8 absolute left-8 top-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl [animation:ib-goal-pulse_5.6s_ease-in-out_infinite]" />
			<div className="absolute left-10 top-10 h-20 w-20 rounded-full border border-emerald-500/20" />
			<div className="absolute left-16 top-16 h-8 w-8 rounded-full border border-teal-300/30" />
			<div className="absolute right-8 top-8 flex gap-2">
				{["Visible", "Surface", "Tone"].map((label, index) => (
					<span
						key={label}
						className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground [animation:ib-goal-float_4.8s_ease-in-out_infinite]"
						style={{ animationDelay: `${index * 190}ms` }}
					>
						{label}
					</span>
				))}
			</div>
			<div className="absolute inset-x-8 bottom-8 flex items-center justify-between">
				{[0, 1, 2, 3].map((index) => (
					<span
						key={index}
						className="h-2.5 w-2.5 rounded-full bg-emerald-300/80 shadow-[0_0_18px_rgba(94,234,212,0.35)] [animation:ib-goal-pulse_2.6s_ease-in-out_infinite]"
						style={{ animationDelay: `${index * 220}ms` }}
					/>
				))}
			</div>
		</div>
	);
}

function FormulaScene() {
	return (
		<div className="absolute inset-0 overflow-hidden">
			<div className="absolute left-8 top-8 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				Compound stack
			</div>
			<div className="absolute right-8 top-8 font-mono text-[11px] text-emerald-300/70">C50 H69 N15 O9</div>
			<div className="absolute left-8 right-8 top-16 rounded-2xl border border-border bg-secondary p-4">
				<div className="mb-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
					<span>Assay sheet</span>
					<span className="text-emerald-300/70">Ready</span>
				</div>
				<div className="space-y-2">
					{[78, 92, 61, 84].map((width, index) => (
						<div key={width} className="h-2 overflow-hidden rounded-full bg-secondary">
							<div
								className="h-full rounded-full bg-gradient-to-r from-emerald-500/30 via-emerald-300/80 to-teal-300/60 [animation:ib-goal-drift_3.8s_ease-in-out_infinite]"
								style={{ width: `${width}%`, animationDelay: `${index * 140}ms` }}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// Scene mapping keyed on mechanism-class slugs. Scenes are purely abstract
// motion graphics (wave, orbit, trajectory, aura, formula) — none make a
// bodily-effect claim on their own. The mapping is aesthetic pairing only.
const mechanismSceneMap: Record<string, "orbital" | "wave" | "trajectory" | "aura" | "formula"> = {
	"glp-1-receptor-agonists": "trajectory",
	"growth-hormone-secretagogues": "trajectory",
	"growth-hormone-derivatives": "trajectory",
	"growth-factors": "trajectory",
	"cytoprotective-peptides": "orbital",
	"thymic-peptides": "orbital",
	"antimicrobial-peptides": "orbital",
	"melanocortin-receptor-modulators": "aura",
	"copper-peptide-complexes": "aura",
	"nootropic-peptides": "wave",
	neuropeptides: "wave",
	"mitochondrial-peptides": "orbital",
	"pineal-peptides": "wave",
	"reproductive-hormones": "wave",
	"research-small-molecules": "formula",
	"peptide-blends": "formula",
	"cosmetic-injectables": "aura",
	"metabolic-injectables": "formula",
	"reference-peptides-miscellaneous": "formula",
	supplies: "formula",
	"research-accessories": "formula",
};

function GoalVisual({ slug }: { slug: string }) {
	const scene = mechanismSceneMap[slug] ?? "formula";
	switch (scene) {
		case "orbital":
			return <OrbitalScene />;
		case "wave":
			return <WaveScene />;
		case "trajectory":
			return <TrajectoryScene />;
		case "aura":
			return <AuraScene />;
		case "formula":
		default:
			return <FormulaScene />;
	}
}

function resolveHoverMedia(collection: CollectionNode) {
	const override = hoverMediaOverrides[collection.slug];

	if (override?.src) {
		return {
			src: override.src,
			alt: override.alt ?? collection.name,
			objectPosition: override.objectPosition ?? "center center",
		};
	}

	// Fallback to Saleor-supplied collection background if mechanism override is absent.
	if (collection.backgroundImage?.url) {
		return {
			src: collection.backgroundImage.url,
			alt: collection.backgroundImage.alt ?? collection.name,
			objectPosition: "center center",
		};
	}

	return null;
}

export function ShopGoalCard({
	collection,
	description,
	hrefBase = "/collections",
}: {
	collection: CollectionNode;
	description?: string;
	/** Path prefix for the card link — use "/categories" when rendering Categories. */
	hrefBase?: "/categories" | "/collections";
}) {
	const meta = getGoalMeta(collection.slug);
	const hoverMedia = resolveHoverMedia(collection);

	return (
		<LinkWithChannel
			href={`${hrefBase}/${collection.slug}`}
			className="shop-goal-card hover:border-emerald-500/22 group relative flex min-h-[368px] flex-col overflow-hidden rounded-[1.9rem] border border-border bg-background shadow-[0_22px_60px_-34px_rgba(0,0,0,0.18)] transition-[transform,border-color,box-shadow,background-color] duration-500 hover:-translate-y-1.5 hover:shadow-[0_34px_90px_-42px_rgba(16,185,129,0.22)] dark:shadow-[0_22px_60px_-34px_rgba(0,0,0,0.95)] dark:hover:shadow-[0_34px_90px_-42px_rgba(16,185,129,0.38)]"
		>
			<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10" />
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100 dark:from-emerald-500/[0.035]" />
			<div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-black/[0.03] to-transparent opacity-0 blur-xl transition-opacity duration-500 [animation:ib-goal-sheen_5.5s_ease-in-out_infinite] group-hover:opacity-100 dark:via-white/[0.06]" />
			<div className="pointer-events-none absolute -right-10 top-10 h-36 w-36 rounded-full bg-emerald-500/[0.03] blur-3xl [animation:ib-goal-pulse_8s_ease-in-out_infinite] dark:bg-emerald-500/[0.06]" />

			<div className="relative z-10 flex h-full flex-col p-6 sm:p-7 lg:p-8">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 max-w-[18rem] pr-2">
						<p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
							{meta.eyebrow}
						</p>
						{/*
						 * `min-h` keeps the title row at 2 lines tall even when the
						 * category name fits on a single line. Without this, 1-line
						 * titles like "Growth Factors" pull the description block up,
						 * de-aligning their card against neighbours with 2-line titles
						 * like "Growth Hormone Secretagogues".
						 *
						 * Calculation: 2 × line-height (1.25) × font-size — for the
						 * sm:text-[1.35rem] breakpoint this is roughly 3.4rem.
						 */}
						<h3 className="mt-3 min-h-[3rem] text-xl font-semibold leading-tight tracking-tight text-foreground sm:min-h-[3.4rem] sm:text-[1.35rem]">
							{collection.name}
						</h3>
					</div>
					<span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-500 group-hover:border-emerald-500/20 group-hover:text-emerald-300/85">
						{meta.tag}
					</span>
				</div>

				{/*
				 * Description height is locked top AND bottom so all six homepage
				 * cards align perfectly:
				 *   - `min-h-[72px]` (= 3 lines × 24px line-height) keeps short
				 *     descriptions from collapsing
				 *   - `line-clamp-3` truncates anything longer than 3 lines with
				 *     an ellipsis instead of pushing the card taller
				 * If a future Saleor description is too long to fit, edit it down;
				 * never bump the clamp without bumping `min-h` to match.
				 */}
				<p className="mt-4 line-clamp-3 min-h-[72px] max-w-[34ch] text-sm leading-6 text-muted-foreground transition-colors duration-500 group-hover:text-muted-foreground">
					{description ?? ""}
				</p>

				<div className="relative mt-6 h-[152px] shrink-0 overflow-hidden rounded-[1.5rem] border border-white/5 bg-black/25 sm:h-[164px]">
					<div className="absolute inset-0 transition-all duration-700 group-hover:scale-[1.02] group-hover:opacity-80">
						<GoalVisual slug={collection.slug} />
					</div>

					{hoverMedia ? (
						<div className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-700 group-hover:opacity-100">
							<Image
								src={hoverMedia.src}
								alt={hoverMedia.alt}
								fill
								className="scale-[1.08] object-cover object-center transition-transform duration-700 group-hover:scale-100"
								style={{ objectPosition: hoverMedia.objectPosition }}
							/>
							<div className="from-black/78 via-black/58 to-black/92 absolute inset-0 bg-gradient-to-t" />
							<div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
						</div>
					) : null}

					<div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black via-black/55 to-transparent" />
				</div>

				<div className="mt-auto flex items-center justify-between border-t border-border pt-5">
					<span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-300 group-hover:text-emerald-400">
						Explore collection
					</span>
					<div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary transition-all duration-300 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10">
						<svg
							className="h-3.5 w-3.5 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-emerald-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</div>
				</div>
			</div>
		</LinkWithChannel>
	);
}
