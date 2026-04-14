export function HandlingGuideView() {
	return (
		<div className="mx-auto max-w-2xl space-y-8">
			{/* Intro */}
			<div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
				<h2 className="mb-2 text-xl font-bold text-foreground">Reconstitution Handling Guide</h2>
				<p className="text-sm text-muted-foreground">
					Proper technique preserves peptide integrity and reduces contamination risk. Follow these steps
					every time you reconstitute.
				</p>
			</div>

			{/* Sterile Prep */}
			<GuideSection
				title="1. Sterile Preparation"
				items={[
					{ text: "Wash hands thoroughly or use nitrile gloves.", icon: "shield" },
					{ text: "Wipe down your work surface with isopropyl alcohol (70%).", icon: "sparkle" },
					{ text: "Swab the vial stopper with a fresh alcohol wipe and let it air dry.", icon: "droplet" },
					{ text: "Swab the BAC water vial stopper the same way.", icon: "droplet" },
					{ text: "Use a new, sealed syringe and needle for each reconstitution.", icon: "check" },
				]}
			/>

			{/* Adding Solvent */}
			<GuideSection
				title="2. Adding Bacteriostatic Water"
				items={[
					{ text: "Draw the desired amount of BAC water into the syringe.", icon: "syringe" },
					{
						text: "Insert the needle into the peptide vial at a slight angle toward the glass wall.",
						icon: "target",
					},
					{
						text: "Dispense the water slowly down the inside wall of the vial — never spray directly onto the powder.",
						icon: "alert",
					},
					{
						text: "Allow the water to run down and reach the peptide cake or powder at the bottom naturally.",
						icon: "droplet",
					},
				]}
			/>

			{/* Mixing */}
			<GuideSection
				title="3. Gentle Mixing"
				highlight
				items={[
					{ text: "Gently swirl the vial between your fingers. Roll, do not shake.", icon: "rotate" },
					{
						text: "Never shake, vortex, or vigorously agitate a reconstituted peptide. Shaking denatures the peptide and creates foam, reducing potency.",
						icon: "alert",
					},
					{
						text: "If powder remains, set the vial upright in the refrigerator. It will typically dissolve fully within 10-30 minutes.",
						icon: "clock",
					},
					{
						text: "The solution should be clear and colorless. Discard if cloudy or discolored.",
						icon: "check",
					},
				]}
			/>

			{/* Storage */}
			<GuideSection
				title="4. Storage and Labeling"
				items={[
					{
						text: "Refrigerate reconstituted peptide at 2-8 C (standard refrigerator). Do not freeze.",
						icon: "cold",
					},
					{
						text: "Label the vial with: peptide name, concentration (mg/mL), reconstitution date.",
						icon: "tag",
					},
					{
						text: "Most reconstituted peptides remain stable for 14-28 days when stored correctly. Check the manufacturer datasheet.",
						icon: "calendar",
					},
					{
						text: "Protect from direct light. Store upright to minimize stopper contact.",
						icon: "shield",
					},
				]}
			/>

			{/* Disclaimer */}
			<div className="rounded-xl border border-border bg-secondary px-5 py-4 text-xs leading-relaxed text-muted-foreground">
				This guide is provided for educational and research reference purposes only. It does not constitute
				medical advice. Always follow your institution&apos;s handling and safety protocols.
			</div>
		</div>
	);
}

function GuideSection({
	title,
	items,
	highlight,
}: {
	title: string;
	items: { text: string; icon: string }[];
	highlight?: boolean;
}) {
	return (
		<div
			className={`rounded-2xl border p-6 sm:p-8 ${
				highlight ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-border bg-card"
			}`}
		>
			<h3 className="mb-5 text-lg font-semibold text-foreground">{title}</h3>
			<ul className="space-y-4">
				{items.map((item, i) => (
					<li key={i} className="flex gap-3">
						<span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
							{item.icon === "alert" ? (
								<span className="text-amber-400">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
										<path d="M12 9v4" />
										<path d="M12 17h.01" />
									</svg>
								</span>
							) : (
								<span className="text-emerald-500">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
								</span>
							)}
						</span>
						<span className="text-sm leading-relaxed text-foreground">{item.text}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
