"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  CheckSquare,
  AlertTriangle,
  Mail,
  Zap,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Clock,
  ChevronRight,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import { EmailDTO, TaskDTO, BriefingDTO, Priority, Category } from "@taskmail/types";

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case "CRITICAL":
      return { bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.25)", text: "#ef4444" };
    case "HIGH":
      return { bg: "rgba(249, 115, 22, 0.12)", border: "rgba(249, 115, 22, 0.25)", text: "#f97316" };
    case "MEDIUM":
      return { bg: "rgba(234, 179, 8, 0.12)", border: "rgba(234, 179, 8, 0.25)", text: "#eab308" };
    case "LOW":
      return { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.25)", text: "#3b82f6" };
    default:
      return { bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.25)", text: "#94a3b8" };
  }
}

function formatCategory(category: Category) {
  return category.replace("_", " ");
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<EmailDTO[]>([]);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [briefing, setBriefing] = useState<BriefingDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailDTO | null>(null);

  const fetchData = async () => {
    try {
      const [emailsRes, tasksRes, briefingRes] = await Promise.all([
        fetch("/api/emails"),
        fetch("/api/tasks"),
        fetch("/api/briefing/today"),
      ]);

      if (emailsRes.ok) setEmails(await emailsRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (briefingRes.ok) {
        const data = await briefingRes.json();
        // Hono returns 500/404 if missing, so let's handle if it actually succeeded
        if (data && data.id) {
          setBriefing(data);
        } else {
          setBriefing(null);
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const handleGenerateBriefing = async () => {
    setGeneratingBriefing(true);
    try {
      const res = await fetch("/api/briefing/trigger", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
        // Refresh tasks and emails since briefing generation might trigger status sync
        fetchData();
      }
    } catch (error) {
      console.error("Failed to compile briefing:", error);
    } finally {
      setGeneratingBriefing(false);
    }
  };

  const openTasksCount = tasks.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const criticalEmailsCount = emails.filter((e) => e.priority === "CRITICAL" || e.priority === "HIGH").length;

  return (
    <DashboardLayout>
      <div style={{ padding: "40px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--fg-primary)", margin: 0 }}>
              Morning Intelligence
            </h1>
            <p style={{ fontSize: 14, color: "var(--fg-secondary)", marginTop: 6, marginBottom: 0 }}>
              Here is your summarized inbox & action items for today.
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--fg-secondary)",
              padding: "10px 16px",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--fg-primary)";
              e.currentTarget.style.borderColor = "var(--fg-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--fg-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </header>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginTop: 40 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass" style={{ height: 120, borderRadius: 16, animation: "pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Section */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
                marginBottom: 32,
              }}
            >
              {/* Card 1 */}
              <div className="glass" style={{ padding: "20px", borderRadius: 16, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Open Tasks
                    </span>
                    <h3 style={{ fontSize: 32, fontWeight: 700, color: "var(--fg-primary)", margin: "8px 0 0 0" }}>
                      {openTasksCount}
                    </h3>
                  </div>
                  <div
                    style={{
                      background: "rgba(139, 92, 246, 0.12)",
                      color: "var(--accent-violet)",
                      padding: 10,
                      borderRadius: 12,
                    }}
                  >
                    <CheckSquare size={20} />
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--fg-secondary)" }}>
                  <Link href="/tasks" style={{ color: "var(--accent-violet)", textDecoration: "none", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    View task board <ArrowRight size={12} />
                  </Link>
                </div>
              </div>

              {/* Card 2 */}
              <div className="glass" style={{ padding: "20px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Urgent Actions
                    </span>
                    <h3 style={{ fontSize: 32, fontWeight: 700, color: "var(--fg-primary)", margin: "8px 0 0 0" }}>
                      {criticalEmailsCount}
                    </h3>
                  </div>
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.12)",
                      color: "#ef4444",
                      padding: 10,
                      borderRadius: 12,
                    }}
                  >
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--fg-secondary)" }}>
                  Critical/High priority emails needing attention.
                </div>
              </div>

              {/* Card 3 */}
              <div className="glass" style={{ padding: "20px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Processed Emails
                    </span>
                    <h3 style={{ fontSize: 32, fontWeight: 700, color: "var(--fg-primary)", margin: "8px 0 0 0" }}>
                      {emails.length}
                    </h3>
                  </div>
                  <div
                    style={{
                      background: "rgba(79, 142, 247, 0.12)",
                      color: "var(--accent-blue)",
                      padding: 10,
                      borderRadius: 12,
                    }}
                  >
                    <Mail size={20} />
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--fg-secondary)" }}>
                  Total processed emails since activation.
                </div>
              </div>
            </section>

            {/* Briefing Section */}
            <section style={{ marginBottom: 32 }}>
              <div
                className="glass"
                style={{
                  padding: "24px",
                  borderRadius: 20,
                  background: "linear-gradient(135deg, rgba(15, 17, 23, 0.7), rgba(25, 28, 41, 0.7))",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 150,
                    height: 150,
                    background: "rgba(139, 92, 246, 0.08)",
                    filter: "blur(40px)",
                    borderRadius: "50%",
                  }}
                />
                {briefing ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Sparkles size={18} color="var(--accent-violet)" />
                        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--fg-primary)" }}>Daily Briefing</span>
                      </div>
                      <Link
                        href="/briefing"
                        style={{
                          fontSize: 13,
                          color: "var(--accent-blue)",
                          textDecoration: "none",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Read Full Briefing <ChevronRight size={14} />
                      </Link>
                    </div>

                    <p style={{ fontSize: 15, color: "var(--fg-primary)", lineHeight: 1.6, marginBottom: 16 }}>
                      {briefing.content.greeting || "Good morning! Here is your compiled briefing for today."}
                    </p>

                    {briefing.content.aiRecommendations && briefing.content.aiRecommendations.length > 0 && (
                      <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "16px", borderRadius: 12, border: "1px solid var(--border)" }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-primary)", margin: "0 0 10px 0" }}>
                          AI Recommendations
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.6 }}>
                          {briefing.content.aiRecommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} style={{ marginBottom: 6 }}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <Sparkles size={32} color="var(--accent-violet)" style={{ marginBottom: 12 }} />
                    <h4 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-primary)", margin: "0 0 6px 0" }}>
                      No Briefing Compiled Today
                    </h4>
                    <p style={{ fontSize: 13, color: "var(--fg-secondary)", maxWidth: 440, margin: "0 auto 16px auto", lineHeight: 1.5 }}>
                      Compile today&apos;s summary from your emails and action items using Gemini 1.5 Flash.
                    </p>
                    <button
                      onClick={handleGenerateBriefing}
                      disabled={generatingBriefing}
                      style={{
                        padding: "10px 24px",
                        background: "linear-gradient(135deg, var(--accent-blue), var(--accent-violet))",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {generatingBriefing ? (
                        <>
                          <RefreshCw size={14} className="spin" /> Compiling briefing...
                        </>
                      ) : (
                        <>
                          <Zap size={14} /> Generate Today&apos;s Briefing
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Content Feed Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24 }}>
              {/* Emails Feed */}
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-primary)", marginBottom: 16 }}>
                  Recent Emails
                </h2>
                {emails.length === 0 ? (
                  <div className="glass" style={{ padding: "40px", textAlign: "center", borderRadius: 16 }}>
                    <Mail size={32} color="var(--fg-secondary)" style={{ marginBottom: 12, opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: 13, color: "var(--fg-secondary)" }}>
                      No emails processed yet. Trigger a sync or enable auto-sync.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {emails.slice(0, 5).map((email) => {
                      const colors = getPriorityColor(email.priority);
                      return (
                        <div
                          key={email.id}
                          className="glass"
                          onClick={() => setSelectedEmail(email)}
                          style={{
                            padding: "16px 20px",
                            borderRadius: 14,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            border: selectedEmail?.id === email.id ? "1px solid var(--accent-blue)" : "1px solid var(--border)",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedEmail?.id !== email.id) {
                              e.currentTarget.style.borderColor = "var(--fg-secondary)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedEmail?.id !== email.id) {
                              e.currentTarget.style.borderColor = "var(--border)";
                            }
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  background: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                              >
                                {email.priority}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 500,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid var(--border)",
                                  color: "var(--fg-secondary)",
                                }}
                              >
                                {formatCategory(email.category)}
                              </span>
                            </div>
                            <span style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                              {new Date(email.processedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)", margin: "0 0 6px 0" }}>
                            {email.subject}
                          </h4>
                          <div style={{ fontSize: 12, color: "var(--fg-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            From: {email.from}
                          </div>
                          <p style={{ fontSize: 13, color: "var(--fg-secondary)", margin: "8px 0 0 0", lineHeight: 1.5 }}>
                            {email.summary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Sidebar helper/Task teaser */}
              <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-primary)", marginBottom: 16 }}>
                  Email Context Detail
                </h2>
                {selectedEmail ? (
                  <div className="glass" style={{ padding: "24px", borderRadius: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                        Subject
                      </div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-primary)", margin: 0 }}>
                        {selectedEmail.subject}
                      </h4>
                      <p style={{ fontSize: 12, color: "var(--fg-secondary)", margin: "4px 0 0 0" }}>
                        From: {selectedEmail.from}
                      </p>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                        AI Intelligence Summary
                      </div>
                      <p style={{ fontSize: 13, color: "var(--fg-primary)", lineHeight: 1.5, margin: 0 }}>
                        {selectedEmail.summary}
                      </p>
                    </div>

                    {selectedEmail.deadline && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                          Suggested Deadline
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#f97316" }}>
                          <Clock size={14} />
                          {new Date(selectedEmail.deadline).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {selectedEmail.hasAction ? (
                      <div
                        style={{
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          padding: 12,
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--accent-green)", fontWeight: 600 }}>
                          <Sparkles size={14} />
                          Action Required
                        </div>
                        <p style={{ fontSize: 12, color: "var(--fg-secondary)", margin: "4px 0 0 0", lineHeight: 1.4 }}>
                          Gemini automatically generated an actionable task from this email. You can find it on your Task board.
                        </p>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid var(--border)",
                          padding: 12,
                          borderRadius: 10,
                          fontSize: 12,
                          color: "var(--fg-secondary)",
                          lineHeight: 1.4,
                        }}
                      >
                        No immediate action item detected in this email.
                      </div>
                    )}

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                        Snippet
                      </div>
                      <div
                        style={{
                          background: "rgba(0, 0, 0, 0.2)",
                          padding: 12,
                          borderRadius: 10,
                          fontSize: 12,
                          fontFamily: "monospace",
                          color: "var(--fg-secondary)",
                          maxHeight: 120,
                          overflowY: "auto",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {selectedEmail.rawSnippet}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="glass"
                    style={{
                      padding: "48px 24px",
                      textAlign: "center",
                      borderRadius: 16,
                      color: "var(--fg-secondary)",
                      fontSize: 13,
                    }}
                  >
                    Select any email card from the list to view its full AI analysis detail and extracted insights.
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
