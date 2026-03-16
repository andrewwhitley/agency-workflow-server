import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  tags: string[];
  created_at: string;
}

const STATUSES = ["open", "in_progress", "completed", "blocked"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const emptyTask = {
  title: "",
  description: "",
  status: "open",
  priority: "medium",
  due_date: "",
  assigned_to: "",
  tags: "",
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyTask);

  const fetchTasks = () => {
    const params = filter ? `?status=${filter}` : "";
    api<Task[]>(`/tasks${params}`)
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, [filter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyTask);
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || "",
      assigned_to: task.assigned_to || "",
      tags: (task.tags || []).join(", "),
    });
    setShowModal(true);
  };

  const save = async () => {
    const body = {
      ...form,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
    };
    try {
      if (editing) {
        await api(`/tasks/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/tasks", { method: "POST", body: JSON.stringify(body) });
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    await api(`/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  };

  if (loading) return <div className="text-muted">Loading tasks...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Tasks</h2>
        <button onClick={openCreate} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors">
          Create Task
        </button>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter(null)}
          className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", !filter ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
          All
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize", filter === s ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Task grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-surface border border-border rounded-md p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
              <div className="flex gap-1">
                <button onClick={() => openEdit(task)} className="text-xs text-accent hover:underline">Edit</button>
                <button onClick={() => remove(task.id)} className="text-xs text-destructive hover:underline ml-2">Delete</button>
              </div>
            </div>
            {task.description && <p className="text-sm text-muted mb-3">{task.description}</p>}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={cn("px-2 py-0.5 rounded font-medium capitalize",
                task.status === "completed" && "bg-success/10 text-success",
                task.status === "blocked" && "bg-destructive/10 text-destructive",
                task.status === "in_progress" && "bg-warning/10 text-warning",
                task.status === "open" && "bg-accent/10 text-accent"
              )}>
                {task.status.replace("_", " ")}
              </span>
              <span className={cn("px-2 py-0.5 rounded font-medium capitalize",
                task.priority === "urgent" && "bg-destructive/10 text-destructive",
                task.priority === "high" && "bg-warning/10 text-warning",
                (task.priority === "medium" || task.priority === "low") && "bg-surface-2 text-dim"
              )}>
                {task.priority}
              </span>
              {task.assigned_to && <span className="px-2 py-0.5 rounded bg-surface-2 text-dim">{task.assigned_to}</span>}
              {task.due_date && <span className="px-2 py-0.5 rounded bg-surface-2 text-dim">{new Date(task.due_date).toLocaleDateString()}</span>}
            </div>
            {task.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{editing ? "Edit Task" : "Create Task"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Assigned To</label>
                  <input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Tags (comma-separated)</label>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
                {editing ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
