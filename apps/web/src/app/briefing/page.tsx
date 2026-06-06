"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Sparkles,
  Zap,
  RefreshCw,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Mail,
  ListTodo,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { BriefingDTO, TaskDTO } from "@taskmail/types";

export default function BriefingPage() {
  const { data: session } = useSession();
  const [briefing, setBriefing] = useState<BriefingDTO | null>(null);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    try {
      const [briefingRes, tasksRes] = await Promise.all([
        fetch("/api/briefing/today"),
        fetch("/api/tasks"),
      ]);

      if (briefingRes.ok) {
        const data = await briefingRes.json();
        if (data && data.id) {
          setBriefing(data);
        } else {
          setBriefing(null);
        }
      }
      if (tasksRes.ok) {
        setTasks(await tasksRes.json());
      }
    } catch (error) {
      console.error("Failed to load briefing page data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/briefing/trigger", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
        // Also refresh tasks
        const tasksRes = await fetch("/api/tasks");
        if (tasksRes.ok) {
          setTasks(await tasksRes.json());
        }
      }
    } catch (error) {
      console.error("Failed to generate briefing:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTask = async (task: TaskDTO) => {
    const newStatus = task.status === "COMPLETED" ? "OPEN" : "COMPLETED";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Update local state
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
        );
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  // Filter tasks due today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const tasksDueToday = tasks.filter((t) => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    return deadlineDate >= todayStart && deadlineDate <= todayEnd;
  });

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <DashboardLayout>
      <div style={{ padding: "40px", maxWidth: 900, margin: "0 auto" }}>
        {/* Date / Greeting */}
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--accent-violet)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            <Calendar size={14} /> {formattedDate}
          </div>
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, color: "var(--fg-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Daily Executive Briefing
          </h1>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="glass" style={{ height: 160, borderRadius: 16, animation: "pulse 1.5s infinite" }} />
            <div className="glass" style={{ height: 280, borderRadius: 16, animation: "pulse 1.5s infinite" }} />
          </div>
        ) : briefing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Header Quote Block */}
            <div
              style={{
                position: "relative",
                padding: "24px 32px",
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(79, 142, 247, 0.05), rgba(139, 92, 246, 0.05))",
                border: "1px solid rgba(139, 92, 246, 0.15)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: "linear-gradient(to bottom, var(--accent-blue), var(--accent-violet))",
                  borderRadius: "4px 0 0 4px",
                }}
              />
              <p style={{ fontSize: 16, color: "var(--fg-primary)", lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>
                &ldquo;{briefing.content.greeting || "Welcome Samin, your personalized daily overview is ready."}&rdquo;
              </p>
              {briefing.content.criticalAlertsCount !== undefined && briefing.content.criticalAlertsCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
                  <AlertTriangle size={14} />
                  {briefing.content.criticalAlertsCount} critical action items require your attention today.
                </div>
              )}
            </div>

            {/* Main Content Layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
              {/* AI Recommendations */}
              {briefing.content.aiRecommendations && briefing.content.aiRecommendations.length > 0 && (
                <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Sparkles size={18} color="var(--accent-violet)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-primary)", margin: 0 }}>
                      Recommended Action Plan
                    </h3>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--fg-secondary)", lineHeight: 1.7 }}>
                    {briefing.content.aiRecommendations.map((rec, i) => (
                      <li key={i} style={{ marginBottom: 10 }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Important Emails Summary */}
              {briefing.content.importantEmailsSummary && briefing.content.importantEmailsSummary.length > 0 && (
                <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <Mail size={18} color="var(--accent-blue)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-primary)", margin: 0 }}>
                      Inbox intelligence Digest
                    </h3>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--fg-secondary)", lineHeight: 1.7 }}>
                    {briefing.content.importantEmailsSummary.map((sum, i) => (
                      <li key={i} style={{ marginBottom: 10 }}>{sum}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tasks Checklist */}
              <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <ListTodo size={18} color="var(--accent-green)" />
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-primary)", margin: 0 }}>
                    Today&apos;s Checklist
                  </h3>
                </div>
                {tasksDueToday.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--fg-secondary)", margin: 0, padding: "12px 0" }}>
                    No tasks are scheduled for deadline today. You can view all outstanding items on the Task Board.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tasksDueToday.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.01)",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--fg-secondary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      >
                        {task.status === "COMPLETED" ? (
                          <CheckCircle2 size={18} color="var(--accent-green)" />
                        ) : (
                          <Circle size={18} color="var(--fg-secondary)" />
                        )}
                        <span
                          style={{
                            fontSize: 13,
                            color: task.status === "COMPLETED" ? "var(--fg-secondary)" : "var(--fg-primary)",
                            textDecoration: task.status === "COMPLETED" ? "line-through" : "none",
                            fontWeight: 500,
                          }}
                        >
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Regenerate Section */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  padding: "12px 28px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--fg-primary)",
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-violet)";
                  e.currentTarget.style.boxShadow = "0 0 15px rgba(139, 92, 246, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {generating ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Updating briefing...
                  </>
                ) : (
                  <>
                    <Zap size={16} color="var(--accent-violet)" /> Compile New Briefing
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="glass" style={{ padding: "64px 32px", textAlign: "center", borderRadius: 20 }}>
            <Sparkles size={40} color="var(--accent-violet)" style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-primary)", marginBottom: 10 }}>
              Your Daily Briefing
            </h2>
            <p style={{ fontSize: 14, color: "var(--fg-secondary)", maxWidth: 460, margin: "0 auto 24px auto", lineHeight: 1.6 }}>
              Compile daily briefings summarizing key actions and recommendations from emails using Gemini 1.5 Flash.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: "12px 32px",
                background: "linear-gradient(135deg, var(--accent-blue), var(--accent-violet))",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 0 20px rgba(139, 92, 246, 0.2)",
              }}
            >
              {generating ? (
                <>
                  <RefreshCw size={16} className="spin" /> Compiling morning intel...
                </>
              ) : (
                <>
                  <Zap size={16} /> Compile Today&apos;s Briefing
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
