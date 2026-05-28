import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brandConfig } from "@/config/brand";

export const runtime = "nodejs";
export const alt = `${brandConfig.siteName} — ${brandConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
	const heroPath = join(process.cwd(), "public", "hero-2.png");
	const heroData = readFileSync(heroPath);
	const heroBase64 = `data:image/png;base64,${heroData.toString("base64")}`;

	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					position: "relative",
					backgroundColor: "#0a0a0a",
				}}
			>
				{/* Background hero image */}
				<img
					src={heroBase64}
					alt=""
					style={{
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
				/>

				{/* Left-side gradient overlay for text legibility */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						background:
							"linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 45%, rgba(0,0,0,0.1) 100%)",
						display: "flex",
					}}
				/>

				{/* Content */}
				<div
					style={{
						position: "relative",
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						padding: "80px",
						width: "65%",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							marginBottom: "32px",
						}}
					>
						<div
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "9999px",
								backgroundColor: "#10b981",
							}}
						/>
						<span
							style={{
								color: "#10b981",
								fontSize: "20px",
								fontWeight: 500,
								letterSpacing: "0.1em",
								textTransform: "uppercase",
							}}
						>
							Research Peptides
						</span>
					</div>

					<div
						style={{
							color: "white",
							fontSize: "84px",
							fontWeight: 700,
							lineHeight: 1.05,
							letterSpacing: "-0.03em",
							marginBottom: "28px",
						}}
					>
						{brandConfig.siteName}
					</div>

					<div
						style={{
							color: "rgba(255,255,255,0.75)",
							fontSize: "28px",
							lineHeight: 1.35,
							maxWidth: "640px",
						}}
					>
						{brandConfig.tagline}
					</div>
				</div>
			</div>
		),
		size,
	);
}
