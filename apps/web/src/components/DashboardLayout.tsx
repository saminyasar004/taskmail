"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/");
		}
	}, [status, router]);

	if (status === "loading" || status === "unauthenticated") {
		return (
			<div
				style={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "var(--bg-base)",
					color: "var(--fg-secondary)",
					fontSize: 14,
					fontWeight: 500,
				}}
			>
				<div className="flex flex-col items-center gap-4">
					<div
						style={{
							width: 32,
							height: 32,
							border: "3px solid var(--border)",
							borderTopColor: "var(--accent-blue)",
							borderRadius: "50%",
						}}
						className="spin"
					/>
					<span>Verifying secure session...</span>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				background: "var(--bg-base)",
				minHeight: "100vh",
			}}
		>
			<Sidebar />
			<main
				style={{
					flex: 1,
					overflowY: "auto",
					height: "100vh",
					position: "relative",
				}}
			>
				{children}
			</main>
		</div>
	);
}
