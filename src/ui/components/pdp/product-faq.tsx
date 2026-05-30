export interface FaqEntry {
	question: string;
	answer: string;
}

/**
 * FAQ section content — rendered as an open two-column Q&A (no dropdowns), so
 * answers are scannable rather than hidden behind the buy box.
 */
export function ProductFaq({ items }: { items: FaqEntry[] }) {
	if (items.length === 0) return null;

	return (
		<dl className="grid gap-x-12 gap-y-8 md:grid-cols-2">
			{items.map((item, i) => (
				<div key={i}>
					<dt className="text-base font-semibold text-foreground">{item.question}</dt>
					<dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
				</div>
			))}
		</dl>
	);
}
