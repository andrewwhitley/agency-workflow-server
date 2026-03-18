import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

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

const emptyForm = (): Partial<Client> => ({
  companyName: "", industry: "", companyWebsite: "", companyPhone: "",
  companyEmail: "", location: "", domain: "", status: "active",
});

export function ClientsListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Client>>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  const fetchClients = () => {
    api<Client[]>("/cm/clients")
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = search
    ? clients.filter((c) =>
        c.companyName.toLowerCase().includes(search.toLowerCase()) ||
        c.industry?.toLowerCase().includes(search.toLowerCase()) ||
        c.domain?.toLowerCase().includes(search.toLowerCase()))
    : clients;

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); };
  const openEdit = (c: Client, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setForm({ ...c });
    setEditingId(c.id);
    setDialogOpen(true);
  };
  const openDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
  };

  const submit = async () => {
    setPending(true);
    try {
      if (editingId) {
        await api(`/cm/clients/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/cm/clients", { method: "POST", body: JSON.stringify(form) });
      }
      setDialogOpen(false);
      fetchClients();
    } catch (err) { console.error(err); }
    setPending(false);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    setPending(true);
    try {
      await api(`/cm/clients/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      fetchClients();
    } catch (err) { console.error(err); }
    setPending(false);
  };

  const upd = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <div className="text-muted">Loading clients...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Clients</h2>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Client</Button>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..." className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <Link key={client.id} to={`/clients/${client.slug}`}
            className="bg-surface border border-border rounded-md p-5 hover:border-accent/50 transition-colors block group">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">{client.companyName}</h3>
              <div className="flex items-center gap-1">
                <span className={cn("text-xs px-2 py-0.5 rounded font-medium",
                  client.status === "active" ? "bg-success/10 text-success" :
                  client.status === "inactive" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                )}>{client.status}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => openEdit(client, e)}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  onClick={(e) => openDelete(client.id, e)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            {client.industry && <p className="text-xs text-muted mb-2">{client.industry}</p>}
            <div className="flex flex-wrap gap-2 text-xs text-dim">
              {client.location && <span className="px-2 py-0.5 rounded bg-surface-2">{client.location}</span>}
              {client.domain && <span className="px-2 py-0.5 rounded bg-surface-2">{client.domain}</span>}
              {client.companyPhone && <span className="px-2 py-0.5 rounded bg-surface-2">{client.companyPhone}</span>}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          {search ? "No clients match your search." : "No clients yet. Add your first client to get started."}
        </div>
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen}
        title={editingId ? "Edit Client" : "Add Client"} onSubmit={submit} isPending={pending} wide>
        <FormField label="Company Name" value={form.companyName || ""} onChange={(v) => upd("companyName", v)} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Industry" value={form.industry || ""} onChange={(v) => upd("industry", v)} placeholder="e.g. Healthcare, Legal" />
          <FormField label="Location" value={form.location || ""} onChange={(v) => upd("location", v)} placeholder="e.g. Austin, TX" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Website" value={form.companyWebsite || ""} onChange={(v) => upd("companyWebsite", v)} />
          <FormField label="Domain" value={form.domain || ""} onChange={(v) => upd("domain", v)} placeholder="example.com" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone" value={form.companyPhone || ""} onChange={(v) => upd("companyPhone", v)} />
          <FormField label="Email" value={form.companyEmail || ""} onChange={(v) => upd("companyEmail", v)} />
        </div>
        <FormField label="Status" value={form.status || "active"} onChange={(v) => upd("status", v)} placeholder="active, inactive, pending" />
      </FormDialog>

      <ConfirmDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}
        title="Delete Client" description="This will permanently delete this client and ALL associated data (contacts, services, campaigns, etc.). This cannot be undone."
        onConfirm={doDelete} isPending={pending} />
    </div>
  );
}
