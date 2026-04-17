import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Access Restricted — Research Use Only",
	robots: { index: false, follow: false },
};

export default function AccessRestrictedPage() {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-6 py-24 text-center">
			<div className="max-w-md">
				<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Access Restricted</h1>
				<p className="mt-5 text-base leading-relaxed text-muted-foreground">
					Infinity BioLabs supplies reference compounds exclusively for{" "}
					<strong className="text-foreground">in-vitro laboratory research</strong>. Because you did not
					affirm the research-use terms, you cannot access the catalog.
				</p>
				<p className="mt-4 text-sm text-muted-foreground">
					If you believe you reached this page by mistake, please close this tab and return when you can
					confirm the products will be used solely for laboratory research — not for human or animal
					administration.
				</p>
			</div>
		</main>
	);
}
