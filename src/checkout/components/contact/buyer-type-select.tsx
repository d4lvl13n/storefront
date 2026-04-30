"use client";

import { type FC } from "react";
import { Building2 } from "lucide-react";
import { Label } from "@/ui/components/ui/label";

export const BUYER_TYPE_OPTIONS = [
	{ value: "", label: "Select an option (optional)" },
	{ value: "university", label: "University" },
	{ value: "research_lab", label: "Research Lab" },
	{ value: "independent_researcher", label: "Independent Researcher" },
	{ value: "healthcare_professional", label: "Healthcare Professional" },
	{ value: "biotech_company", label: "Biotech Company" },
	{ value: "other", label: "Other" },
] as const;

export type BuyerTypeValue = (typeof BUYER_TYPE_OPTIONS)[number]["value"];

export const BUYER_TYPE_METADATA_KEY = "buyer_type";

interface BuyerTypeSelectProps {
	value: BuyerTypeValue;
	onChange: (value: BuyerTypeValue) => void;
}

export const BuyerTypeSelect: FC<BuyerTypeSelectProps> = ({ value, onChange }) => {
	return (
		<div className="space-y-1.5">
			<Label htmlFor="buyer-type" className="text-sm font-medium">
				Who&rsquo;s buying? <span className="text-xs font-normal text-muted-foreground">(optional)</span>
			</Label>
			<div className="relative">
				<Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<select
					id="buyer-type"
					name="buyer-type"
					value={value}
					onChange={(e) => onChange(e.target.value as BuyerTypeValue)}
					className="flex h-12 w-full appearance-none rounded-md border border-input bg-background pl-10 pr-10 text-sm text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				>
					{BUYER_TYPE_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				{/* Chevron */}
				<svg
					className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.5}
					aria-hidden="true"
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
				</svg>
			</div>
			<p className="text-xs text-muted-foreground">
				Helps us tailor research support and pricing to your context.
			</p>
		</div>
	);
};
