// Shared data for the reconstitution calculator page
// Extracted so both server components (JSON-LD) and client components (FAQ accordion) can use it

export const CALCULATOR_FAQ_ITEMS = [
	{
		question: "What is the difference between mg and mcg?",
		answer:
			"A milligram (mg) is 1,000 micrograms (mcg). So 0.25 mg = 250 mcg. Most peptide vials are labeled in mg (e.g., 5 mg), while doses are often discussed in mcg (e.g., 250 mcg). The calculator handles conversions automatically — just make sure you select the correct unit for each field.",
	},
	{
		question: "Why do syringe units change when I switch syringe size?",
		answer:
			"They don't — the unit markings on all U-100 insulin syringes mean the same thing: 1 unit = 0.01 mL. What changes is the total capacity. A 0.3 mL syringe holds up to 30 units, a 0.5 mL up to 50 units, and a 1 mL up to 100 units. If your draw volume exceeds the syringe capacity, the calculator will warn you to choose a larger syringe or increase your concentration.",
	},
	{
		question: "How are doses per vial calculated?",
		answer:
			"Doses per vial = total peptide in the vial divided by your dose amount. For example, a 5 mg vial at 250 mcg (0.25 mg) per dose gives 5 / 0.25 = 20 doses. The calculator floors this number because partial doses at the end of a vial are not reliable to measure.",
	},
	{
		question: "What makes a setup impractical?",
		answer:
			"A setup is impractical when the draw volume is either too large for the syringe (e.g., needing 0.6 mL on a 0.3 mL syringe) or too small to measure accurately (e.g., under 2 units). The fix is usually to adjust the water volume: less water = higher concentration = smaller draw volumes, and vice versa.",
	},
	{
		question: "Why does the calculator recommend bacteriostatic water (BAC water)?",
		answer:
			"Bacteriostatic water contains 0.9% benzyl alcohol, which inhibits microbial growth. This is important because a reconstituted vial is punctured multiple times over days or weeks. Sterile water is preservative-free and intended for single-use preparations only.",
	},
	{
		question: "Can I use a different type of syringe?",
		answer:
			"This calculator is designed for U-100 insulin syringes, which are the most common format for subcutaneous peptide injection in research settings. U-100 means 100 units per mL. If you use a non-insulin syringe that reads in mL directly, use the draw volume in mL from the results.",
	},
	{
		question: "What if my peptide vial is a different size than the presets?",
		answer:
			"All fields accept custom values. Click on a preset to quick-fill, or type any number directly into the input field. The calculator works with any positive peptide amount.",
	},
	{
		question: "Does the number of vials affect the dose calculation?",
		answer:
			"No — concentration and draw volume are calculated per vial. The vial count is used only to check whether your total available peptide across all vials is sufficient for the requested dose. For most users, 1 vial is the correct setting.",
	},
];

export const RECONSTITUTION_STEPS = [
	{
		name: "Gather supplies",
		text: "Obtain your peptide vial, bacteriostatic water, alcohol swabs, and a U-100 insulin syringe (0.3 mL, 0.5 mL, or 1 mL).",
	},
	{
		name: "Sanitize",
		text: "Wash hands or wear nitrile gloves. Wipe down your work surface and swab both vial stoppers with isopropyl alcohol.",
	},
	{
		name: "Calculate concentration",
		text: "Divide the peptide amount (mg) by the bacteriostatic water volume (mL) to get the concentration in mg/mL.",
	},
	{
		name: "Add bacteriostatic water",
		text: "Draw the desired volume of BAC water into the syringe. Insert the needle into the peptide vial at an angle and dispense slowly down the inside wall. Do not spray directly onto the powder.",
	},
	{
		name: "Dissolve by gentle swirling",
		text: "Swirl the vial gently between your fingers until the powder is fully dissolved. Never shake or vortex — this denatures the peptide.",
	},
	{
		name: "Calculate and draw your dose",
		text: "Divide your desired dose (converted to mg) by the concentration to get the draw volume in mL. Multiply by 100 to convert to syringe units on a U-100 syringe. Draw to that mark.",
	},
	{
		name: "Store properly",
		text: "Refrigerate the reconstituted vial at 2-8 C. Label with peptide name, concentration, and date. Most reconstituted peptides remain stable for 14-28 days.",
	},
];
