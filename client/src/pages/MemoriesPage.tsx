import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Memory {
  key: string;
  content: string;
  category: string | null;
  updated_at: string;
}

export function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [form, setForm] = useState({ key: "", content: "", category: "" });

  const fetchMemories = () => {
    const params = filter ? `?category=${filter}` : "";
    api<Memory[]>(`/memories${params}`)
      .then(setMemories)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMemories(); }, [filter]);

  const doSearch = async () => {
    if (!search.trim()) { fetchMemories(); return; }
    const results = await api<Memory[]>(`/memories/search?q=${encodeURIComponent(search)}`);
    setMemories(results);
  };

  const categories = [...new Set(memories.map((m) => m.category).filter(Boolean))] as string[];

  const openCreate = () => {
    setEditing(null);
    setForm({ key: "", content: "", category: "" });
    setShowModal(true);
  };

  const openEdit = (mem: Memory) => {
    setEditing(mem);
    setForm({ key: mem.key, content: mem.content, category: mem.category || "" });
    setShowModal(true);
  };

  const save = async () => {
    try {
      await api("/memories", {
        method: "PUT",
        body: JSON.stringify({
          key: form.key,
          content: form.content,
          category: form.category || null,
        }),
      });
      setShowModal(false);
      fetchMemories();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async (key: string) => {
    if (!confirm("Delete this memory?")) return;
    await api(`/memories/${encodeURIComponent(key)}`, { method: "DELETE" });
    fetchMemories();
  };

  if (loading) return <div className="text-muted">Loading memories...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Memories</h2>
        <button onClick={openCreate} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors">
          Save Memory
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="Search memories..."
          className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
        <button onClick={doSearch} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Search</button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter(null)}
          className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", !filter ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
          All
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", filter === cat ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
            {cat}
          </button>
        ))}
      </div>

      {/* Memory grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {memories.map((mem) => (
          <div key={mem.key} className="bg-surface border border-border rounded-md p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground font-mono">{mem.key}</h3>
              <div className="flex gap-1">
                <button onClick={() => openEdit(mem)} className="text-xs text-accent hover:underline">Edit</button>
                <button onClick={() => remove(mem.key)} className="text-xs text-destructive hover:underline ml-2">Delete</button>
              </div>
            </div>
            <p className="text-sm text-muted mb-2 whitespace-pre-wrap">{mem.content}</p>
            <div className="flex items-center gap-2 text-xs text-dim">
              {mem.category && <span className="px-2 py-0.5 rounded bg-surface-2">{mem.category}</span>}
              <span>{new Date(mem.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">{editing ? "Edit Memory" : "Save Memory"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Key</label>
                <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })}
                  disabled={!!editing}
                  className={cn("w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm font-mono focus:outline-none focus:border-accent", editing && "opacity-60")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Content</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Category</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
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
