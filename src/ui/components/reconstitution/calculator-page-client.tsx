"use client";

import { useState, useCallback, useRef } from "react";
import { CalculatorView, type HistoryEntry } from "./calculator-view";
import { WorkedExampleView } from "./worked-example-view";
import { HandlingGuideView } from "./handling-guide-view";
import { FaqView } from "./faq-view";
import { HistoryView } from "./history-view";

const TABS = [
	{ id: "calculator", label: "Calculator" },
	{ id: "example", label: "Worked Example" },
	{ id: "guide", label: "Handling Guide" },
	{ id: "faq", label: "FAQ" },
	{ id: "history", label: "History" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CalculatorPageClient() {
	const [activeTab, setActiveTab] = useState<TabId>("calculator");
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const lastResultRef = useRef<string>("");

	const handleCalculation = useCallback((entry: HistoryEntry) => {
		// Deduplicate — only save if the draw volume actually changed
		const key = `${entry.result.drawVolumeMl.toFixed(4)}-${entry.result.syringeUnits.toFixed(1)}`;
		if (key === lastResultRef.current) return;
		lastResultRef.current = key;
		setHistory((prev) => [entry, ...prev].slice(0, 50));
	}, []);

	const handleClearHistory = useCallback(() => {
		setHistory([]);
		lastResultRef.current = "";
	}, []);

	return (
		<div>
			{/* Tab Navigation */}
			<div className="mb-8 overflow-x-auto">
				<nav className="flex min-w-max gap-1 rounded-xl border border-border bg-card p-1" role="tablist">
					{TABS.map((tab) => (
						<button
							key={tab.id}
							role="tab"
							aria-selected={activeTab === tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
								activeTab === tab.id
									? "bg-emerald-500/10 text-emerald-400"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{tab.label}
							{tab.id === "history" && history.length > 0 && (
								<span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500/20 px-1 text-[10px] font-semibold text-emerald-400">
									{history.length}
								</span>
							)}
						</button>
					))}
				</nav>
			</div>

			{/* Tab Content */}
			{activeTab === "calculator" && <CalculatorView onCalculation={handleCalculation} />}
			{activeTab === "example" && <WorkedExampleView />}
			{activeTab === "guide" && <HandlingGuideView />}
			{activeTab === "faq" && <FaqView />}
			{activeTab === "history" && <HistoryView entries={history} onClear={handleClearHistory} />}
		</div>
	);
}
