import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Client {
  id: number;
  slug: string;
  companyName: string;
  industry: string | null;
  location: string | null;
  companyWebsite: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  domain: string | null;
  status: string;
}

const INDUSTRIES = [
  "Healthcare / Integrative Medicine", "Digital Marketing", "Technology", "Legal",
  "Home Services", "Construction / Fabrication", "Real Estate", "Hospitality",
  "Wellness / Aesthetics", "Chiropractic", "Inspection Services", "IT / Consulting", "Other",
];

const emptyForm = { companyName: "", industry: "", companyWebsite: "", companyPhone: "", companyEmail: "", location: "", domain: "" };

export function ClientsListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const fetchClients = () => {
    api<Client[]>("/cm/clients")
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = search
    ? clients.filter((c) => c.companyName.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase()))
    : clients;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    setCreating(true);
    try {
      await api("/cm/clients", { method: "POST", body: JSON.stringify(form) });
      setShowCreate(false);
      setForm(emptyForm);
      fetchClients();
    } catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
    setCreating(false);
  };

  if (loading) return <div className="text-muted">Loading clients...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Clients</h2>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..."
          className="w-full max-w-md px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm focus:outline-none focus:border-accent" />
      </div>

      {/* Client grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <Link key={client.id} to={`/clients/${client.slug}`}
            className="bg-surface border border-border rounded-md p-5 hover:border-accent/50 transition-colors block">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">{client.companyName}</h3>
              <span className={cn("text-xs px-2 py-0.5 rounded font-medium",
                client.status === "active" ? "bg-success/10 text-success" :
                client.status === "inactive" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
              )}>{client.status}</span>
            </div>
            {client.industry && <p className="text-xs text-muted mb-2">{client.industry}</p>}
            <div className="flex flex-wrap gap-2 text-xs text-dim">
              {client.location && <span className="px-2 py-0.5 rounded bg-surface-2">{client.location}</span>}
              {client.domain && <span className="px-2 py-0.5 rounded bg-surface-2">{client.domain}</span>}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          {search ? "No clients match your search." : "No clients yet. Add your first client to get started."}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={create} className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Client</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Company Name *</label>
                <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Industry</label>
                  <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
                    <option value="">Select...</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Website</label>
                  <input value={form.companyWebsite} onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Domain</label>
                  <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com"
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Phone</label>
                  <input value={form.companyPhone} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Email</label>
                  <input value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
                {creating ? "Creating..." : "Add Client"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
