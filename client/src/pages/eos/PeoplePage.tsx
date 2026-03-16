import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Person {
  id: string;
  name: string;
  role: string;
  gwo_get_it: boolean | null;
  gwo_want_it: boolean | null;
  gwo_capacity: boolean | null;
  core_values: Record<string, boolean>;
  notes: string;
  created_at: string;
}

export function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", notes: "" });

  const fetchPeople = () => {
    api<Person[]>("/eos/people")
      .then(setPeople)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPeople(); }, []);

  const save = async () => {
    try {
      await api("/eos/people", { method: "POST", body: JSON.stringify(form) });
      setShowModal(false);
      setForm({ name: "", role: "", notes: "" });
      fetchPeople();
    } catch (err) { alert(err instanceof Error ? err.message : "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this person?")) return;
    await api(`/eos/people/${id}`, { method: "DELETE" });
    fetchPeople();
  };

  if (loading) return <div className="text-muted">Loading people...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">People Analyzer</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
          Add Person
        </button>
      </div>

      {people.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No people added yet. Use the People Analyzer to assess GWC and core values alignment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {people.map((p) => (
            <div key={p.id} className="bg-surface border border-border rounded-md p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted">{p.role}</p>
                </div>
                <button onClick={() => remove(p.id)} className="text-xs text-destructive hover:underline">Remove</button>
              </div>
              <div className="flex gap-2 mt-3 text-xs">
                <span className={`px-2 py-0.5 rounded ${p.gwo_get_it ? "bg-success/10 text-success" : "bg-surface-2 text-dim"}`}>Get It</span>
                <span className={`px-2 py-0.5 rounded ${p.gwo_want_it ? "bg-success/10 text-success" : "bg-surface-2 text-dim"}`}>Want It</span>
                <span className={`px-2 py-0.5 rounded ${p.gwo_capacity ? "bg-success/10 text-success" : "bg-surface-2 text-dim"}`}>Capacity</span>
              </div>
              {p.notes && <p className="text-xs text-muted mt-2">{p.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Person</h3>
            <div className="space-y-4">
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <input placeholder="Role / Seat" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
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
