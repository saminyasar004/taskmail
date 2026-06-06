"use client";

import { Mail, Zap, CheckCircle, Bell } from "lucide-react";

const features = [
	{
		icon: <Zap size={18} />,
		title: "Immediate Email Analysis",
		desc: "Each email is analyzed with Gemini 1.5 Flash upon arrival in your inbox.",
	},
	{
		icon: <CheckCircle size={18} />,
		title: "Automatic Task Generation",
		desc: "E-mails requiring actions turn into tasks automatically — priority and deadline specified.",
	},
	{
		icon: <Bell size={18} />,
		title: "Daily AI Briefing",
		desc: "A tailored summary for each day, starting your day right.",
	},
];

export default function LandingPage() {
	return (
		<main
			style={{
				minHeight: "100dvh",
				background: "var(--bg-base)",
				position: "relative",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "40px 24px",
			}}
		>
			{/* Glow blobs */}
			<div className="blob blob-1" />
			<div className="blob blob-2" />
			<div className="blob blob-3" />

			{/* Logo / Nav */}
			<header
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					padding: "24px 40px",
					display: "flex",
					alignItems: "center",
					gap: 10,
					borderBottom: "1px solid var(--border)",
					backdropFilter: "blur(12px)",
					zIndex: 10,
				}}
			>
				<Mail size={22} color="#4f8ef7" />
				<span
					className="font-display"
					style={{
						fontSize: 20,
						fontWeight: 700,
						color: "var(--fg-primary)",
					}}
				>
					Taskmail
				</span>
			</header>

			{/* Hero */}
			<section
				style={{
					maxWidth: 680,
					textAlign: "center",
					position: "relative",
					zIndex: 5,
				}}
			>
				{/* Badge */}
				<div
					className="fade-up"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 8,
						background: "rgba(79,142,247,0.1)",
						border: "1px solid rgba(79,142,247,0.25)",
						borderRadius: 99,
						padding: "5px 14px",
						marginBottom: 32,
						fontSize: 13,
						color: "#4f8ef7",
						fontWeight: 500,
					}}
				>
					<Zap size={13} />
					Powered by Gemini 1.5 Flash
				</div>

				<h1
					className="font-display fade-up fade-up-1"
					style={{
						fontSize: "clamp(36px, 6vw, 64px)",
						fontWeight: 800,
						lineHeight: 1.1,
						letterSpacing: "-0.03em",
						marginBottom: 20,
						color: "var(--fg-primary)",
					}}
				>
					Quit staring at 50 emails. Begin striking tasks off your
					list.
				</h1>

				<p
					className="fade-up fade-up-2"
					style={{
						fontSize: 18,
						color: "var(--fg-secondary)",
						lineHeight: 1.7,
						marginBottom: 40,
						maxWidth: 560,
						margin: "0 auto 40px",
					}}
				>
					Taskmail links up to your Gmail and applies artificial
					intelligence to read all your emails, spot what requires
					action, identify deadlines, and automatically generate
					tasks,
					<br />
					you will no longer overlook anything important.
				</p>

				{/* <button
          id="google-signin-btn"
          className="fade-up fade-up-3"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "linear-gradient(135deg, #4f8ef7, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "15px 32px",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "-0.01em",
            boxShadow: "0 0 40px rgba(79,142,247,0.3)",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 60px rgba(79,142,247,0.45)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 40px rgba(79,142,247,0.3)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Connect Gmail — it&apos;s free
          <ArrowRight size={16} />
        </button> */}
			</section>

			{/* Feature cards */}
			<section
				className="fade-up fade-up-4"
				style={{
					display: "flex",
					gap: 16,
					marginTop: 64,
					flexWrap: "wrap",
					justifyContent: "center",
					maxWidth: 860,
					position: "relative",
					zIndex: 5,
				}}
			>
				{features.map((f, i) => (
					<div
						key={i}
						className="glass"
						style={{
							borderRadius: 16,
							padding: "20px 24px",
							width: 240,
							transition:
								"transform 0.18s ease, border-color 0.18s ease",
						}}
						onMouseEnter={(e) => {
							(
								e.currentTarget as HTMLDivElement
							).style.transform = "translateY(-4px)";
							(
								e.currentTarget as HTMLDivElement
							).style.borderColor = "rgba(79,142,247,0.3)";
						}}
						onMouseLeave={(e) => {
							(
								e.currentTarget as HTMLDivElement
							).style.transform = "translateY(0)";
							(
								e.currentTarget as HTMLDivElement
							).style.borderColor = "var(--glass-border)";
						}}
					>
						<div
							style={{
								width: 36,
								height: 36,
								borderRadius: 10,
								background: "rgba(79,142,247,0.12)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "#4f8ef7",
								marginBottom: 12,
							}}
						>
							{f.icon}
						</div>
						<p
							style={{
								fontWeight: 600,
								fontSize: 14,
								marginBottom: 6,
								color: "var(--fg-primary)",
							}}
						>
							{f.title}
						</p>
						<p
							style={{
								fontSize: 13,
								color: "var(--fg-secondary)",
								lineHeight: 1.6,
							}}
						>
							{f.desc}
						</p>
					</div>
				))}
			</section>
		</main>
	);
}
