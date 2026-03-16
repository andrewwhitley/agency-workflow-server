import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_type: string;
  attendees: string[];
  headlines: string[];
  notes: string;
  created_at: string;
}

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [form, setForm] = useState({
    meeting_date: new Date().toISOString().split("T")[0],
    meeting_type: "L10",
    attendees: "",
    headlines: "",
    notes: "",
  });

  const fetchMeetings = () => {
    api<Meeting[]>("/eos/meetings")
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMeetings(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ meeting_date: new Date().toISOString().split("T")[0], meeting_type: "L10", attendees: "", headlines: "", notes: "" });
    setShowModal(true);
  };

  const openEdit = (m: Meeting) => {
    setEditing(m);
    setForm({
      meeting_date: m.meeting_date?.split("T")[0] || "",
      meeting_type: m.meeting_type,
      attendees: (m.attendees || []).join(", "),
      headlines: (m.headlines || []).join("\n"),
      notes: m.notes || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    const body = {
      ...form,
      attendees: form.attendees.split(",").map((a) => a.trim()).filter(Boolean),
      headlines: form.headlines.split("\n").map((h) => h.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await api(`/eos/meetings/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/eos/meetings", { method: "POST", body: JSON.stringify(body) });
      }
      setShowModal(false);
      fetchMeetings();
    } catch (err) { alert(err instanceof Error ? err.message : "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this meeting?")) return;
    await api(`/eos/meetings/${id}`, { method: "DELETE" });
    fetchMeetings();
  };

  if (loading) return <div className="text-muted">Loading meetings...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">L10 Meetings</h2>
        <button onClick={openCreate} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
          New Meeting
        </button>
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-3 font-medium text-dim">Date</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Type</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Attendees</th>
              <th className="text-left px-4 py-3 font-medium text-dim">Headlines</th>
              <th className="text-right px-4 py-3 font-medium text-dim">Actions</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3 text-foreground">{new Date(m.meeting_date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-muted">{m.meeting_type}</td>
                <td className="px-4 py-3 text-muted">{(m.attendees || []).join(", ")}</td>
                <td className="px-4 py-3 text-muted text-xs">{(m.headlines || []).length} headlines</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(m)} className="text-xs text-accent hover:underline mr-2">Edit</button>
                  <button onClick={() => remove(m.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meetings.length === 0 && <div className="p-8 text-center text-muted">No meetings recorded yet.</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{editing ? "Edit Meeting" : "New Meeting"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Date</label>
                  <input type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Type</label>
                  <input value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Attendees (comma-separated)</label>
                <input value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Headlines (one per line)</label>
                <textarea value={form.headlines} onChange={(e) => setForm({ ...form, headlines: e.target.value })} rows={4}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
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
