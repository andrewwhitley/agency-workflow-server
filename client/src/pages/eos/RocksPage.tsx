import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Rock {
  id: string;
  title: string;
  owner: string;
  quarter: string;
  status: string;
  notes: string;
}

const STATUS_OPTIONS = ["on_track", "off_track", "done"];

export function RocksPage() {
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [loading, setLoading] = useState(true);
  const [quarter, setQuarter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Rock | null>(null);
  const [form, setForm] = useState({ title: "", owner: "", quarter: "Q1 2026", notes: "" });

  const fetchRocks = () => {
    const params = quarter ? `?quarter=${quarter}` : "";
    api<Rock[]>(`/eos/rocks${params}`)
      .then(setRocks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRocks(); }, [quarter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", owner: "", quarter: "Q1 2026", notes: "" });
    setShowModal(true);
  };

  const openEdit = (rock: Rock) => {
    setEditing(rock);
    setForm({ title: rock.title, owner: rock.owner, quarter: rock.quarter, notes: rock.notes });
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api(`/eos/rocks/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/eos/rocks", { method: "POST", body: JSON.stringify(form) });
      }
      setShowModal(false);
      fetchRocks();
    } catch (err) { alert(err instanceof Error ? err.message : "Save failed"); }
  };

  const updateStatus = async (rock: Rock, status: string) => {
    await api(`/eos/rocks/${rock.id}`, { method: "PUT", body: JSON.stringify({ ...rock, status }) });
    fetchRocks();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rock?")) return;
    await api(`/eos/rocks/${id}`, { method: "DELETE" });
    fetchRocks();
  };

  if (loading) return <div className="text-muted">Loading rocks...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Rocks</h2>
        <div className="flex gap-2">
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)}
            className="px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
            <option value="">All Quarters</option>
            <option value="Q1 2026">Q1 2026</option>
            <option value="Q2 2026">Q2 2026</option>
            <option value="Q3 2026">Q3 2026</option>
            <option value="Q4 2026">Q4 2026</option>
          </select>
          <button onClick={openCreate} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
            Add Rock
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-3 font-medium text-dim">Title</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Owner</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Quarter</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Status</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Notes</th>
              <th className="text-right px-4 py-3 font-medium text-dim">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rocks.map((rock) => (
              <tr key={rock.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3 text-foreground font-medium">{rock.title}</td>
                <td className="px-4 py-3 text-muted">{rock.owner}</td>
                <td className="px-4 py-3 text-muted">{rock.quarter}</td>
                <td className="px-4 py-3">
                  <select value={rock.status} onChange={(e) => updateStatus(rock, e.target.value)}
                    className={cn("text-xs px-2 py-1 rounded font-medium border-0",
                      rock.status === "on_track" && "bg-success/10 text-success",
                      rock.status === "off_track" && "bg-destructive/10 text-destructive",
                      rock.status === "done" && "bg-accent/10 text-accent"
                    )}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-muted text-xs max-w-[200px] truncate">{rock.notes}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(rock)} className="text-xs text-accent hover:underline mr-2">Edit</button>
                  <button onClick={() => remove(rock.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rocks.length === 0 && <div className="p-8 text-center text-muted">No rocks yet. Add your quarterly priorities.</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{editing ? "Edit Rock" : "Add Rock"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Owner</label>
                  <input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Quarter</label>
                  <input value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
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
