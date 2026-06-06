"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Plus,
  Sparkles,
  Calendar,
  Tag,
  Clock,
  Trash2,
  Edit2,
  CheckCircle,
  Play,
  Pause,
  ArrowRight,
  Filter,
  X,
  Mail,
  Zap,
  RefreshCw,
} from "lucide-react";
import { TaskDTO, TaskStatus, Priority } from "@taskmail/types";

const STATUS_COLUMNS: { key: TaskStatus; label: string; bg: string; border: string; accent: string }[] = [
  { key: "OPEN", label: "To Do", bg: "rgba(79, 142, 247, 0.03)", border: "rgba(79, 142, 247, 0.15)", accent: "var(--accent-blue)" },
  { key: "IN_PROGRESS", label: "In Progress", bg: "rgba(139, 92, 246, 0.03)", border: "rgba(139, 92, 246, 0.15)", accent: "var(--accent-violet)" },
  { key: "WAITING", label: "Waiting", bg: "rgba(234, 179, 8, 0.03)", border: "rgba(234, 179, 8, 0.15)", accent: "var(--accent-cyan)" },
  { key: "COMPLETED", label: "Completed", bg: "rgba(16, 185, 129, 0.03)", border: "rgba(16, 185, 129, 0.15)", accent: "var(--accent-green)" },
];

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

export default function TasksPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("OPEN");
  const [deadline, setDeadline] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTasks();
    }
  }, [session]);

  const openCreateDialog = () => {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setStatus("OPEN");
    setDeadline("");
    setAiInput("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (task: TaskDTO) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setStatus(task.status);
    setDeadline(task.deadline ? new Date(task.deadline).toISOString().substring(0, 16) : "");
    setAiInput("");
    setIsDialogOpen(true);
  };

  const handleSuggest = async () => {
    if (!aiInput.trim()) return;
    setSuggesting(true);
    try {
      const res = await fetch("/api/tasks/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiInput }),
      });
      if (res.ok) {
        const suggestion = await res.json();
        setTitle(suggestion.title || "");
        setDescription(suggestion.description || "");
        setPriority(suggestion.priority || "MEDIUM");
        if (suggestion.deadline) {
          setDeadline(new Date(suggestion.deadline).toISOString().substring(0, 16));
        }
      }
    } catch (error) {
      console.error("AI suggestion failed:", error);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title,
      description,
      priority,
      status,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    };

    try {
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        if (res.ok) {
          fetchTasks();
          setIsDialogOpen(false);
        }
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        if (res.ok) {
          fetchTasks();
          setIsDialogOpen(false);
        }
      }
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Optimistic update
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // Filter logic
  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (sourceFilter && t.source !== sourceFilter) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div style={{ padding: "40px", height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: "var(--fg-primary)", margin: 0 }}>
              Task Board
            </h1>
            <p style={{ fontSize: 14, color: "var(--fg-secondary)", marginTop: 6, marginBottom: 0 }}>
              Manage auto-extracted Gmail actions alongside your manual tasks.
            </p>
          </div>
          <button
            onClick={openCreateDialog}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, var(--accent-blue), var(--accent-violet))",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 0 20px rgba(139, 92, 246, 0.2)",
            }}
          >
            <Plus size={16} /> New Task
          </button>
        </header>

        {/* Filters Bar */}
        <div
          className="glass"
          style={{
            padding: "16px 20px",
            borderRadius: 14,
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg-secondary)" }}>
            <Filter size={14} /> Filter:
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              background: "var(--bg-surface)",
              color: "var(--fg-primary)",
              border: "1px solid var(--border)",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFORMATIONAL">Informational</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              background: "var(--bg-surface)",
              color: "var(--fg-primary)",
              border: "1px solid var(--border)",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <option value="">All Sources</option>
            <option value="manual">Manual Tasks</option>
            <option value="email">Auto-Generated (Gmail)</option>
          </select>

          {(priorityFilter || sourceFilter) && (
            <button
              onClick={() => {
                setPriorityFilter("");
                setSourceFilter("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#ef4444",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Kanban Board Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, flex: 1, overflow: "hidden" }}>
          {STATUS_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key);

            return (
              <div
                key={col.key}
                style={{
                  background: col.bg,
                  border: `1px solid ${col.border}`,
                  borderRadius: 16,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                {/* Column Title */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.accent }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-primary)" }}>{col.label}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--fg-secondary)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "2px 8px",
                      borderRadius: 99,
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                  {loading ? (
                    [1, 2].map((i) => (
                      <div key={i} className="glass" style={{ height: 100, borderRadius: 12, animation: "pulse 1.5s infinite" }} />
                    ))
                  ) : colTasks.length === 0 ? (
                    <div
                      style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        fontSize: 12,
                        color: "var(--fg-secondary)",
                        border: "1px dashed var(--border)",
                        borderRadius: 12,
                        opacity: 0.5,
                      }}
                    >
                      Empty
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const priorityColor = getPriorityColor(task.priority);
                      return (
                        <div
                          key={task.id}
                          className="glass"
                          style={{
                            padding: "14px",
                            borderRadius: 12,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            position: "relative",
                            transition: "transform 0.15s ease",
                          }}
                        >
                          {/* Card Header Info */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: priorityColor.bg,
                                  border: `1px solid ${priorityColor.border}`,
                                  color: priorityColor.text,
                                }}
                              >
                                {task.priority}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 500,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid var(--border)",
                                  color: "var(--fg-secondary)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 3,
                                }}
                              >
                                {task.source === "email" ? (
                                  <>
                                    <Mail size={8} /> Gmail
                                  </>
                                ) : (
                                  "Manual"
                                )}
                              </span>
                            </div>

                            {/* Actions Drawer */}
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                onClick={() => openEditDialog(task)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--fg-secondary)",
                                  cursor: "pointer",
                                  padding: 4,
                                  borderRadius: 4,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-primary)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-secondary)")}
                                title="Edit"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(task.id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--fg-secondary)",
                                  cursor: "pointer",
                                  padding: 4,
                                  borderRadius: 4,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-secondary)")}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <h5 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-primary)", margin: 0, lineHeight: 1.4 }}>
                            {task.title}
                          </h5>

                          {task.description && (
                            <p
                              style={{
                                fontSize: 12,
                                color: "var(--fg-secondary)",
                                margin: 0,
                                lineHeight: 1.4,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {task.description}
                            </p>
                          )}

                          {task.deadline && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--fg-secondary)" }}>
                              <Clock size={10} />
                              <span>{new Date(task.deadline).toLocaleDateString()}</span>
                            </div>
                          )}

                          {/* Quick Status Swappers */}
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              marginTop: 6,
                              paddingTop: 8,
                              borderTop: "1px solid var(--border)",
                            }}
                          >
                            {STATUS_COLUMNS.filter((sc) => sc.key !== col.key).map((sc) => (
                              <button
                                key={sc.key}
                                onClick={() => handleUpdateStatus(task.id, sc.key)}
                                style={{
                                  flex: 1,
                                  padding: "4px 0",
                                  background: "rgba(255,255,255,0.02)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 6,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  color: "var(--fg-secondary)",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "var(--fg-primary)";
                                  e.currentTarget.style.background = sc.accent + "22";
                                  e.currentTarget.style.borderColor = sc.accent;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "var(--fg-secondary)";
                                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                                  e.currentTarget.style.borderColor = "var(--border)";
                                }}
                              >
                                {sc.label.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Create / Edit Dialog Overlay */}
        {isDialogOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
          >
            <div
              className="glass"
              style={{
                width: "100%",
                maxWidth: 600,
                borderRadius: 20,
                padding: "28px",
                maxHeight: "90vh",
                overflowY: "auto",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Dialog Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-primary)", margin: 0 }}>
                  {editingTask ? "Edit Task" : "Create Actionable Task"}
                </h3>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  style={{ background: "transparent", border: "none", color: "var(--fg-secondary)", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* AI Suggestion Box */}
              {!editingTask && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(79, 142, 247, 0.05), rgba(139, 92, 246, 0.05))",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                    borderRadius: 14,
                    padding: "16px",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--accent-violet)", marginBottom: 8 }}>
                    <Sparkles size={14} /> AI Assistant Suggester
                  </div>
                  <p style={{ fontSize: 11, color: "var(--fg-secondary)", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                    Type your rough ideas, meeting summaries or requested task in plain language. Let Gemini suggest the title, priority, and parsed deadline.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <textarea
                      placeholder="e.g. need to write the slides for client proposal meeting. we need to send it by next friday afternoon and it is very important"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      style={{
                        flex: 1,
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 12,
                        color: "var(--fg-primary)",
                        minHeight: 56,
                        resize: "vertical",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSuggest}
                      disabled={suggesting}
                      style={{
                        padding: "0 16px",
                        background: "var(--accent-violet)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      {suggesting ? (
                        <>
                          <RefreshCw size={12} className="spin" /> Parsing...
                        </>
                      ) : (
                        <>
                          <Zap size={12} /> Suggest
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", marginBottom: 6 }}>
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Task summary"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 13,
                      color: "var(--fg-primary)",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", marginBottom: 6 }}>
                    Description
                  </label>
                  <textarea
                    placeholder="Provide details or bullets..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 13,
                      color: "var(--fg-primary)",
                      minHeight: 80,
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", marginBottom: 6 }}>
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      style={{
                        width: "100%",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 13,
                        color: "var(--fg-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                      <option value="INFORMATIONAL">Informational</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", marginBottom: 6 }}>
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TaskStatus)}
                      style={{
                        width: "100%",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 13,
                        color: "var(--fg-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <option value="OPEN">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING">Waiting</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--fg-secondary)", marginBottom: 6 }}>
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    style={{
                      width: "100%",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 13,
                      color: "var(--fg-primary)",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setIsDialogOpen(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--fg-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2,
                      padding: "12px",
                      background: "linear-gradient(135deg, var(--accent-blue), var(--accent-violet))",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {editingTask ? "Save Changes" : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
