"use client";

import { BookOpen, HelpCircle, Truck, AlertTriangle } from "lucide-react";
import {
	Accordion,
	AccordionItemWithContext,
	AccordionTrigger,
	AccordionContent,
} from "@/ui/components/ui/accordion";

interface FaqItem {
	question: string;
	answer: string;
}

interface ProductAttributesProps {
	descriptionHtml?: string[] | null;
	careInstructions?: string | null;
	faqItems?: FaqItem[] | null;
	references?: string[] | null;
}

/**
 * Secondary product information accordion.
 *
 * The high-signal specs now live in the always-visible
 * <ProductSpecsDatasheet />; this component keeps the longer-form content
 * (description, care, FAQ, references, shipping) plus the RUO disclaimer.
 */
export function ProductAttributes({
	descriptionHtml,
	careInstructions,
	faqItems,
	references,
}: ProductAttributesProps) {
	return (
		<div className="flex flex-col gap-6">
			{/* Research Use Only disclaimer */}
			<div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
				<p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
					<span className="font-semibold">For Research Use Only.</span> Not for human consumption. All
					products are sold strictly for in-vitro research and laboratory use.
				</p>
			</div>

			<Accordion type="multiple" defaultValue={["description"]} className="w-full">
				{descriptionHtml && descriptionHtml.length > 0 && (
					<AccordionItemWithContext value="description" className="border-border">
						<h2>
							<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
								Description
							</AccordionTrigger>
						</h2>
						<AccordionContent>
							<div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-foreground prose-strong:text-foreground">
								{descriptionHtml.map((html, i) => (
									<div key={i} dangerouslySetInnerHTML={{ __html: html }} />
								))}
							</div>
						</AccordionContent>
					</AccordionItemWithContext>
				)}

				{careInstructions && (
					<AccordionItemWithContext value="care" className="border-border">
						<h2>
							<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
								Care Instructions
							</AccordionTrigger>
						</h2>
						<AccordionContent className="leading-relaxed text-muted-foreground">
							{careInstructions}
						</AccordionContent>
					</AccordionItemWithContext>
				)}

				{faqItems && faqItems.length > 0 && (
					<AccordionItemWithContext value="faq" className="border-border">
						<h2>
							<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
								<span className="flex items-center gap-2">
									<HelpCircle className="h-4 w-4" />
									Frequently Asked Questions
								</span>
							</AccordionTrigger>
						</h2>
						<AccordionContent>
							<dl className="grid gap-4">
								{faqItems.map((faq, i) => (
									<div key={i}>
										<dt className="mb-1 text-sm font-medium text-foreground">{faq.question}</dt>
										<dd className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
									</div>
								))}
							</dl>
						</AccordionContent>
					</AccordionItemWithContext>
				)}

				{references && references.length > 0 && (
					<AccordionItemWithContext value="references" className="border-border">
						<h2>
							<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
								<span className="flex items-center gap-2">
									<BookOpen className="h-4 w-4" />
									Research References
								</span>
							</AccordionTrigger>
						</h2>
						<AccordionContent>
							<ol className="grid gap-2 pl-4">
								{references.map((ref, i) => (
									<li key={i} className="list-decimal text-xs leading-relaxed text-muted-foreground">
										{ref}
									</li>
								))}
							</ol>
						</AccordionContent>
					</AccordionItemWithContext>
				)}

				<AccordionItemWithContext value="shipping" className="border-border">
					<h2>
						<AccordionTrigger className="py-4 text-sm font-medium hover:no-underline">
							<span className="flex items-center gap-2">
								<Truck className="h-4 w-4" />
								Shipping & Returns
							</span>
						</AccordionTrigger>
					</h2>
					<AccordionContent className="leading-relaxed text-muted-foreground">
						<div className="grid gap-2 text-sm">
							<p>Free shipping on orders over $150. Standard delivery 3-7 business days.</p>
							<p>All products are shipped in temperature-controlled packaging to maintain stability.</p>
							<p>
								Returns accepted within 14 days of delivery for unopened, sealed items only. Contact support
								for return authorization.
							</p>
						</div>
					</AccordionContent>
				</AccordionItemWithContext>
			</Accordion>
		</div>
	);
}
