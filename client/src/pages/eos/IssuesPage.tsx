import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Issue {
  id: string;
  title: string;
  description: string;
  owner: string;
  priority: number;
  status: string;
}

const STATUSES = ["open", "solving", "solved", "tabled"];

export function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Issue | null>(null);
  const [form, setForm] = useState({ title: "", description: "", owner: "", priority: 2 });

  const fetchIssues = () => {
    const params = filter ? `?status=${filter}` : "";
    api<Issue[]>(`/eos/issues${params}`)
      .then(setIssues)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchIssues(); }, [filter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", owner: "", priority: 2 });
    setShowModal(true);
  };

  const openEdit = (issue: Issue) => {
    setEditing(issue);
    setForm({ title: issue.title, description: issue.description || "", owner: issue.owner, priority: issue.priority });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api(`/eos/issues/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/eos/issues", { method: "POST", body: JSON.stringify(form) });
      }
      setShowModal(false);
      fetchIssues();
    } catch (err) { alert(err instanceof Error ? err.message : "Save failed"); }
  };

  const updateStatus = async (issue: Issue, status: string) => {
    await api(`/eos/issues/${issue.id}`, { method: "PUT", body: JSON.stringify({ ...issue, status }) });
    fetchIssues();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this issue?")) return;
    await api(`/eos/issues/${id}`, { method: "DELETE" });
    fetchIssues();
  };

  if (loading) return <div className="text-muted">Loading issues...</div>;

  const priorityLabel = (p: number) => p === 1 ? "High" : p === 2 ? "Medium" : "Low";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Issues (IDS)</h2>
        <button onClick={openCreate} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
          Add Issue
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter(null)}
          className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", !filter ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
          All
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize", filter === s ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-3 font-medium text-dim w-12">P</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Issue</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Owner</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Status</th>
              <th className="text-right px-4 py-3 font-medium text-dim">Actions</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3">
                  <span className={cn("inline-block w-6 h-6 rounded-full text-center text-xs font-bold leading-6 text-white",
                    issue.priority === 1 && "bg-destructive",
                    issue.priority === 2 && "bg-warning",
                    issue.priority === 3 && "bg-dim"
                  )}>{issue.priority}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-foreground font-medium">{issue.title}</div>
                  {issue.description && <div className="text-xs text-muted mt-0.5">{issue.description}</div>}
                </td>
                <td className="px-4 py-3 text-muted">{issue.owner}</td>
                <td className="px-4 py-3">
                  <select value={issue.status} onChange={(e) => updateStatus(issue, e.target.value)}
                    className={cn("text-xs px-2 py-1 rounded font-medium border-0 capitalize",
                      issue.status === "open" && "bg-accent/10 text-accent",
                      issue.status === "solving" && "bg-warning/10 text-warning",
                      issue.status === "solved" && "bg-success/10 text-success",
                      issue.status === "tabled" && "bg-surface-2 text-dim"
                    )}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(issue)} className="text-xs text-accent hover:underline mr-2">Edit</button>
                  <button onClick={() => remove(issue.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {issues.length === 0 && <div className="p-8 text-center text-muted">No issues. Use IDS to identify, discuss, and solve.</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{editing ? "Edit Issue" : "Add Issue"}</h3>
            <div className="space-y-4">
              <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
                  <option value={1}>1 - High</option>
                  <option value={2}>2 - Medium</option>
                  <option value={3}>3 - Low</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
