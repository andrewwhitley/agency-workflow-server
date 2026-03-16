import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Metric {
  id: string;
  metric_name: string;
  owner: string;
  goal: string;
  unit: string;
  entries?: { week_of: string; value: string; on_track: boolean }[];
}

export function ScorecardPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState<Metric | null>(null);
  const [form, setForm] = useState({ metric_name: "", owner: "", goal: "", unit: "" });
  const [entryForm, setEntryForm] = useState({ week_of: "", value: "", on_track: true });

  const fetchMetrics = () => {
    api<Metric[]>("/eos/scorecard")
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMetrics(); }, []);

  const saveMetric = async () => {
    try {
      await api("/eos/scorecard/metrics", { method: "POST", body: JSON.stringify(form) });
      setShowModal(false);
      setForm({ metric_name: "", owner: "", goal: "", unit: "" });
      fetchMetrics();
    } catch (err) { alert(err instanceof Error ? err.message : "Save failed"); }
  };

  const addEntry = async () => {
    if (!showEntryModal) return;
    try {
      await api("/eos/scorecard/entries", {
        method: "POST",
        body: JSON.stringify({ metric_id: showEntryModal.id, ...entryForm }),
      });
      setShowEntryModal(null);
      setEntryForm({ week_of: "", value: "", on_track: true });
      fetchMetrics();
    } catch (err) { alert(err instanceof Error ? err.message : "Save failed"); }
  };

  const removeMetric = async (id: string) => {
    if (!confirm("Delete this metric?")) return;
    await api(`/eos/scorecard/metrics/${id}`, { method: "DELETE" });
    fetchMetrics();
  };

  if (loading) return <div className="text-muted">Loading scorecard...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Scorecard</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
          Add Metric
        </button>
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-3 font-medium text-dim">Metric</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Owner</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Goal</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Latest</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Trend (4wk)</th>
              <th className="text-right px-4 py-3 font-medium text-dim">Actions</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const latest = m.entries?.[0];
              const trend = (m.entries || []).slice(0, 4);
              return (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3 text-foreground font-medium">{m.metric_name}</td>
                  <td className="px-4 py-3 text-muted">{m.owner}</td>
                  <td className="px-4 py-3 text-muted">{m.goal}{m.unit ? ` ${m.unit}` : ""}</td>
                  <td className="px-4 py-3">
                    {latest ? (
                      <span className={cn("text-sm font-medium", latest.on_track ? "text-success" : "text-destructive")}>
                        {latest.value}{m.unit ? ` ${m.unit}` : ""}
                      </span>
                    ) : <span className="text-dim">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {trend.reverse().map((e, i) => (
                        <span key={i} className={cn("w-3 h-3 rounded-full", e.on_track ? "bg-success" : "bg-destructive")} title={`${e.week_of}: ${e.value}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setShowEntryModal(m); setEntryForm({ week_of: new Date().toISOString().split("T")[0], value: "", on_track: true }); }}
                      className="text-xs text-accent hover:underline mr-2">+ Entry</button>
                    <button onClick={() => removeMetric(m.id)} className="text-xs text-destructive hover:underline">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {metrics.length === 0 && <div className="p-8 text-center text-muted">No metrics yet. Add your weekly KPIs.</div>}
      </div>

      {/* Add Metric Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Metric</h3>
            <div className="space-y-4">
              <input placeholder="Metric Name" value={form.metric_name} onChange={(e) => setForm({ ...form, metric_name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <input placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                <input placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={saveMetric} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowEntryModal(null)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Entry: {showEntryModal.metric_name}</h3>
            <div className="space-y-4">
              <input type="date" value={entryForm.week_of} onChange={(e) => setEntryForm({ ...entryForm, week_of: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <input placeholder="Value" value={entryForm.value} onChange={(e) => setEntryForm({ ...entryForm, value: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={entryForm.on_track} onChange={(e) => setEntryForm({ ...entryForm, on_track: e.target.checked })} />
                On Track
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowEntryModal(null)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={addEntry} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
