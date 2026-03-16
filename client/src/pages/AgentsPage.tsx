import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  training_doc_count?: number;
}

interface TrainingDoc {
  id: string;
  title: string;
  content: string;
  doc_type: string;
}

const MODELS = [
  { value: "claude-sonnet-4-5-20250929", label: "Sonnet 4.5" },
  { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
];

const emptyAgent = {
  name: "",
  description: "",
  system_prompt: "",
  model: "claude-sonnet-4-5-20250929",
  temperature: 0.7,
  max_tokens: 4096,
};

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyAgent);
  const [showModal, setShowModal] = useState(false);
  const [trainingDocs, setTrainingDocs] = useState<TrainingDoc[]>([]);
  const [newDoc, setNewDoc] = useState({ title: "", content: "", doc_type: "guide" });

  const fetchAgents = () => {
    api<Agent[]>("/agents")
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAgents(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyAgent);
    setTrainingDocs([]);
    setShowModal(true);
  };

  const openEdit = async (agent: Agent) => {
    setEditing(agent);
    setForm({
      name: agent.name,
      description: agent.description,
      system_prompt: agent.system_prompt,
      model: agent.model,
      temperature: agent.temperature,
      max_tokens: agent.max_tokens,
    });
    try {
      const data = await api<{ training_docs: TrainingDoc[] }>(`/agents/${agent.id}`);
      setTrainingDocs(data.training_docs || []);
    } catch { setTrainingDocs([]); }
    setShowModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api(`/agents/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/agents", { method: "POST", body: JSON.stringify(form) });
      }
      setShowModal(false);
      fetchAgents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this agent?")) return;
    await api(`/agents/${id}`, { method: "DELETE" });
    fetchAgents();
  };

  const addTrainingDoc = async () => {
    if (!editing) return;
    await api(`/agents/${editing.id}/training`, { method: "POST", body: JSON.stringify(newDoc) });
    setNewDoc({ title: "", content: "", doc_type: "guide" });
    const data = await api<{ training_docs: TrainingDoc[] }>(`/agents/${editing.id}`);
    setTrainingDocs(data.training_docs || []);
  };

  const removeTrainingDoc = async (docId: string) => {
    if (!editing) return;
    await api(`/agents/${editing.id}/training/${docId}`, { method: "DELETE" });
    setTrainingDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  if (loading) return <div className="text-muted">Loading agents...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">AI Agents</h2>
        <button onClick={openCreate} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors">
          Create Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-surface border border-border rounded-md p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => openEdit(agent)} className="text-xs text-accent hover:underline">Edit</button>
                <button onClick={() => remove(agent.id)} className="text-xs text-destructive hover:underline ml-2">Delete</button>
              </div>
            </div>
            <p className="text-sm text-muted mb-3">{agent.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-dim">
              <span className="px-2 py-0.5 rounded bg-surface-2">{MODELS.find((m) => m.value === agent.model)?.label || agent.model}</span>
              <span className="px-2 py-0.5 rounded bg-surface-2">Temp: {agent.temperature}</span>
              {agent.training_doc_count ? (
                <span className="px-2 py-0.5 rounded bg-surface-2">{agent.training_doc_count} docs</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {editing ? "Edit Agent" : "Create Agent"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">System Prompt</label>
                <textarea value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} rows={6}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Model</label>
                  <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
                    {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Temperature</label>
                  <input type="number" step="0.1" min="0" max="1" value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Max Tokens</label>
                  <input type="number" value={form.max_tokens}
                    onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>

              {/* Training docs (edit mode only) */}
              {editing && (
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Training Documents</h4>
                  {trainingDocs.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {trainingDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between bg-surface-2 rounded p-2 text-sm">
                          <div>
                            <span className="font-medium text-foreground">{doc.title}</span>
                            <span className="text-dim ml-2 text-xs">({doc.doc_type})</span>
                          </div>
                          <button onClick={() => removeTrainingDoc(doc.id)} className="text-xs text-destructive hover:underline">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <input placeholder="Title" value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      className="px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                    <select value={newDoc.doc_type} onChange={(e) => setNewDoc({ ...newDoc, doc_type: e.target.value })}
                      className="px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
                      <option value="guide">Guide</option>
                      <option value="reference">Reference</option>
                      <option value="example">Example</option>
                    </select>
                    <button onClick={addTrainingDoc} className="px-3 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">Add</button>
                  </div>
                  {newDoc.title && (
                    <textarea placeholder="Content" value={newDoc.content} onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })} rows={3}
                      className="w-full mt-2 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono" />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
                {editing ? "Save Changes" : "Create Agent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
