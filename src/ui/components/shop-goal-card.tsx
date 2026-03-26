import Image from "next/image";
import type { CollectionsListQuery } from "@/gql/graphql";
import { LinkWithChannel } from "@/ui/atoms/link-with-channel";

export const shopGoalCardStyles = `
  @keyframes ib-goal-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-7px); }
  }

  @keyframes ib-goal-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.45;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.9;
    }
  }

  @keyframes ib-goal-sheen {
    0% {
      transform: translateX(-135%);
      opacity: 0;
    }
    20%, 80% {
      opacity: 1;
    }
    100% {
      transform: translateX(135%);
      opacity: 0;
    }
  }

  @keyframes ib-goal-orbit {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes ib-goal-bar {
    0%, 100% { transform: scaleY(0.45); opacity: 0.35; }
    50% { transform: scaleY(1); opacity: 0.95; }
  }

  @keyframes ib-goal-drift {
    0%, 100% { transform: translateX(0px); opacity: 0.35; }
    50% { transform: translateX(8px); opacity: 0.9; }
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

type CollectionNode = NonNullable<NonNullable<CollectionsListQuery["collections"]>["edges"][number]>["node"];

type HoverMediaOverride = {
	src: string;
	alt?: string;
	objectPosition?: string;
};

const hoverMediaOverrides: Partial<Record<string, HoverMediaOverride>> = {
	aesthetics: {
		src: "/Aesthetics.webp",
		alt: "Infinity BioLabs aesthetics research vial",
		objectPosition: "center center",
	},
	"anti-aging-longevity": {
		src: "/longevity.webp",
		alt: "Longevity study vials with hourglass motif",
		objectPosition: "center center",
	},
	"cognitive-mood": {
		src: "/cognitive.webp",
		alt: "Cognitive research vial with neural network backdrop",
		objectPosition: "center center",
	},
	"fertility-hormonal": {
		src: "/fertility.webp",
		alt: "Fertility research vials with hormone chart display",
		objectPosition: "center center",
	},
	"growth-recovery": {
		src: "/growth.webp",
		alt: "Tissue repair study vial with structural growth visualization",
		objectPosition: "center center",
	},
	"immune-support": {
		src: "/immune.webp",
		alt: "Immune support vial with protective shield visualization",
		objectPosition: "center center",
	},
};

function includesAny(slug: string, terms: string[]) {
	return terms.some((term) => slug.includes(term));
}

function getGoalMeta(slug: string) {
	if (includesAny(slug, ["anti", "longevity"])) {
		return { eyebrow: "Cellular protocol", tag: "Longevity" };
	}

	if (includesAny(slug, ["cognitive", "mood", "sleep"])) {
		return {
			eyebrow: slug.includes("sleep") ? "Circadian stack" : "Neuro assay",
			tag: slug.includes("sleep") ? "Sleep" : "Cognition",
		};
	}

	if (includesAny(slug, ["growth", "recovery", "healing"])) {
		return { eyebrow: "Repair pathway", tag: slug.includes("healing") ? "Healing" : "Recovery" };
	}

	if (includesAny(slug, ["weight", "metabolic"])) {
		return { eyebrow: "Metabolic track", tag: "Metabolism" };
	}

	if (includesAny(slug, ["performance"])) {
		return { eyebrow: "Output stack", tag: "Performance" };
	}

	if (includesAny(slug, ["immune"])) {
		return { eyebrow: "Defense matrix", tag: "Immune" };
	}

	if (includesAny(slug, ["sexual"])) {
		return { eyebrow: "Hormonal track", tag: "Vitality" };
	}

	if (includesAny(slug, ["tanning", "skin"])) {
		return { eyebrow: "Pigmentation lab", tag: "Dermal" };
	}

	if (includesAny(slug, ["aesthetic", "cosmetic"])) {
		return { eyebrow: "Cosmetic pathway", tag: "Aesthetics" };
	}

	if (includesAny(slug, ["fertility", "hormonal", "endocrine"])) {
		return { eyebrow: "Endocrine focus", tag: "Hormonal" };
	}

	if (includesAny(slug, ["vitamin", "supplement"])) {
		return { eyebrow: "Foundation stack", tag: "Foundational" };
	}

	return { eyebrow: "Research collection", tag: "Protocol" };
}

function OrbitalScene() {
	return (
		<div className="absolute inset-0 overflow-hidden">
			<div className="absolute left-8 top-7 h-16 w-16 rounded-full border border-emerald-500/20 [animation:ib-goal-pulse_5.8s_ease-in-out_infinite]" />
			<div className="border-white/8 absolute left-[2.15rem] top-[2.05rem] h-12 w-12 rounded-full border" />
			<div className="absolute left-8 top-7 h-16 w-16 [animation:ib-goal-orbit_14s_linear_infinite]">
				<span className="absolute -right-1 top-6 h-2.5 w-2.5 rounded-full bg-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,0.45)]" />
			</div>
			<div className="absolute right-10 top-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
				<span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
				Multi-stage verified
			</div>
			<div className="absolute inset-x-8 bottom-8 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
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
			<div className="absolute left-8 top-8 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
				Response signal
			</div>
			<div className="border-white/6 absolute right-8 top-8 flex items-center gap-2 rounded-full border bg-white/[0.02] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500">
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
			<div className="absolute left-8 top-8 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
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
						className="border-white/6 rounded-full border bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 [animation:ib-goal-float_4.8s_ease-in-out_infinite]"
						style={{ animationDelay: `${index * 190}ms` }}
					>
						{label}
					</span>
				))}
			</div>
			<div className="absolute inset-x-8 bottom-10 flex items-center justify-between">
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
			<div className="absolute left-8 top-8 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">
				Compound stack
			</div>
			<div className="absolute right-8 top-8 font-mono text-[11px] text-emerald-300/70">C50 H69 N15 O9</div>
			<div className="border-white/6 absolute left-8 right-8 top-16 rounded-2xl border bg-white/[0.02] p-4">
				<div className="mb-3 flex items-center justify-between font-mono text-[11px] text-neutral-500">
					<span>Assay sheet</span>
					<span className="text-emerald-300/70">Ready</span>
				</div>
				<div className="space-y-2">
					{[78, 92, 61, 84].map((width, index) => (
						<div key={width} className="h-2 overflow-hidden rounded-full bg-neutral-800">
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

function GoalVisual({ slug }: { slug: string }) {
	if (includesAny(slug, ["anti", "longevity", "immune", "healing"])) {
		return <OrbitalScene />;
	}

	if (includesAny(slug, ["cognitive", "mood", "sleep"])) {
		return <WaveScene />;
	}

	if (includesAny(slug, ["growth", "recovery", "weight", "performance"])) {
		return <TrajectoryScene />;
	}

	if (includesAny(slug, ["aesthetic", "cosmetic", "tanning", "skin", "sexual"])) {
		return <AuraScene />;
	}

	return <FormulaScene />;
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

	if (includesAny(collection.slug, ["anti", "longevity"])) {
		return {
			src: "/longevity.webp",
			alt: "Longevity study vials with hourglass motif",
			objectPosition: "center center",
		};
	}

	if (includesAny(collection.slug, ["cognitive", "mood"])) {
		return {
			src: "/cognitive.webp",
			alt: "Cognitive research vial with neural network backdrop",
			objectPosition: "center center",
		};
	}

	if (includesAny(collection.slug, ["growth", "recovery"])) {
		return {
			src: "/growth.webp",
			alt: "Tissue repair study vial with structural growth visualization",
			objectPosition: "center center",
		};
	}

	if (includesAny(collection.slug, ["fertility", "hormonal", "endocrine"])) {
		return {
			src: "/fertility.webp",
			alt: "Fertility research vials with hormone chart display",
			objectPosition: "center center",
		};
	}

	if (includesAny(collection.slug, ["immune"])) {
		return {
			src: "/immune.webp",
			alt: "Immune support vial with protective shield visualization",
			objectPosition: "center center",
		};
	}

	if (includesAny(collection.slug, ["aesthetic", "cosmetic"])) {
		return {
			src: "/Aesthetics.webp",
			alt: "Infinity BioLabs aesthetics research vial",
			objectPosition: "center center",
		};
	}

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
}: {
	collection: CollectionNode;
	description?: string;
}) {
	const meta = getGoalMeta(collection.slug);
	const hoverMedia = resolveHoverMedia(collection);

	return (
		<LinkWithChannel
			href={`/collections/${collection.slug}`}
			className="hover:border-emerald-500/22 group relative flex min-h-[368px] flex-col overflow-hidden rounded-[1.9rem] border border-neutral-800/90 bg-neutral-950/95 shadow-[0_22px_60px_-34px_rgba(0,0,0,0.95)] transition-[transform,border-color,box-shadow,background-color] duration-500 hover:-translate-y-1.5 hover:shadow-[0_34px_90px_-42px_rgba(16,185,129,0.38)]"
		>
			<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.035] via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
			<div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent opacity-0 blur-xl transition-opacity duration-500 [animation:ib-goal-sheen_5.5s_ease-in-out_infinite] group-hover:opacity-100" />
			<div className="pointer-events-none absolute -right-10 top-10 h-36 w-36 rounded-full bg-emerald-500/[0.06] blur-3xl [animation:ib-goal-pulse_8s_ease-in-out_infinite]" />

			<div className="relative z-10 flex h-full flex-col p-6 sm:p-7 lg:p-8">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 max-w-[18rem] pr-2">
						<p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
							{meta.eyebrow}
						</p>
						<h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-[1.35rem]">
							{collection.name}
						</h3>
					</div>
					<span className="border-white/6 inline-flex rounded-full border bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-500 transition-colors duration-500 group-hover:border-emerald-500/20 group-hover:text-emerald-300/85">
						{meta.tag}
					</span>
				</div>

				{description ? (
					<p className="mt-4 min-h-[72px] max-w-[34ch] text-sm leading-6 text-neutral-500 transition-colors duration-500 group-hover:text-neutral-400">
						{description}
					</p>
				) : null}

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

				<div className="mt-auto flex items-center justify-between border-t border-white/[0.05] pt-5">
					<span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600 transition-colors duration-300 group-hover:text-emerald-400">
						Explore collection
					</span>
					<div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] transition-all duration-300 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10">
						<svg
							className="h-3.5 w-3.5 text-neutral-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-emerald-400"
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
