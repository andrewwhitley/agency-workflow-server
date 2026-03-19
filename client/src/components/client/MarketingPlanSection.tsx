import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Plus, Pencil, Trash2, Download, ListPlus } from "lucide-react";

interface MarketingPlanItem {
  id: number; category: string; item: string; isIncluded: boolean;
  quantity: number | null; deliverables: string | null; notes: string | null; completionTarget: string | null;
}

const CATEGORIES = [
  "Website", "Social Media", "SEO", "Web Content",
  "Ad Management", "Reputation Management", "Business AutoMatrix",
];

// Standard deliverable items matching the fulfillment sheet structure
const TEMPLATE_ITEMS: { category: string; item: string }[] = [
  // Website
  { category: "Website", item: "New Build" },
  { category: "Website", item: "Hosting & Maintenance" },
  // Social Media
  { category: "Social Media", item: "Social Account Setup & Optimization" },
  { category: "Social Media", item: "Social Posts per Week" },
  { category: "Social Media", item: "Networks" },
  // SEO
  { category: "SEO", item: "# of Services / Towns Included in Plan" },
  { category: "SEO", item: "Business Listing Management" },
  // Web Content
  { category: "Web Content", item: "Standard Blog Posts (1000+ Words)" },
  { category: "Web Content", item: "Long-Form Blog Posts (2000+ Words)" },
  { category: "Web Content", item: "Media Releases for Long-Form Blog Posts" },
  // Ad Management
  { category: "Ad Management", item: "Google PPC" },
  { category: "Ad Management", item: "Google Retargeting" },
  { category: "Ad Management", item: "Google LSAs" },
  { category: "Ad Management", item: "Facebook Ads" },
  { category: "Ad Management", item: "Facebook Retargeting" },
  // Reputation Management
  { category: "Reputation Management", item: "Review Monitoring / Reporting" },
  { category: "Reputation Management", item: "Review Funnel / Landing Pages" },
  { category: "Reputation Management", item: "Email Signature Snippet" },
  { category: "Reputation Management", item: "Review Request Management" },
  { category: "Reputation Management", item: "Review Responses" },
  { category: "Reputation Management", item: "Negative Review Disputation" },
  // Business AutoMatrix
  { category: "Business AutoMatrix", item: "Full Access to System & Automations" },
  { category: "Business AutoMatrix", item: "AI Chat Bot" },
];

const emptyItem = (): Partial<MarketingPlanItem> => ({
  category: "", item: "", isIncluded: false, quantity: null, deliverables: "", notes: "", completionTarget: "",
});

export function MarketingPlanSection({ clientId }: { clientId: number }) {
  const [items, setItems] = useState<MarketingPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<MarketingPlanItem>>(emptyItem());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);
  const [sheetId, setSheetId] = useState("");
  const [importing, setImporting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const reload = useCallback(() => {
    api<MarketingPlanItem[]>(`/cm/clients/${clientId}/marketing-plan`)
      .then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const openAdd = () => { setForm(emptyItem()); setEditingId(null); setDialogOpen(true); };
  const openEdit = (item: MarketingPlanItem) => { setForm({ ...item }); setEditingId(item.id); setDialogOpen(true); };
  const submit = async () => {
    setPending(true);
    try {
      if (editingId) {
        await api(`/cm/marketing-plan/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api(`/cm/clients/${clientId}/marketing-plan`, { method: "POST", body: JSON.stringify(form) });
      }
      setDialogOpen(false);
      reload();
    } catch (e) { console.error(e); }
    setPending(false);
  };
  const doDelete = async () => {
    if (!deleteId) return;
    setPending(true);
    try { await api(`/cm/marketing-plan/${deleteId}`, { method: "DELETE" }); setDeleteId(null); reload(); } catch (e) { console.error(e); }
    setPending(false);
  };

  const importFromSheet = async () => {
    if (!sheetId.trim()) return;
    setImporting(true);
    try {
      const res = await api<{ imported: number }>(`/cm/clients/${clientId}/deliverables/import-sheet`, {
        method: "POST",
        body: JSON.stringify({ sheetId: sheetId.trim() }),
      });
      setImportOpen(false);
      setSheetId("");
      reload();
      alert(`Imported ${res.imported} deliverable items.`);
    } catch (e) { console.error(e); alert("Import failed — check the Sheet ID and ensure the service account has access."); }
    setImporting(false);
  };

  const seedTemplate = async () => {
    if (items.length > 0 && !confirm("This will add all standard deliverable items. Existing items will not be affected. Continue?")) return;
    setSeeding(true);
    try {
      const existing = new Set(items.map((i) => `${i.category}::${i.item}`));
      let added = 0;
      for (const t of TEMPLATE_ITEMS) {
        if (existing.has(`${t.category}::${t.item}`)) continue;
        await api(`/cm/clients/${clientId}/marketing-plan`, {
          method: "POST",
          body: JSON.stringify({ category: t.category, item: t.item, isIncluded: false }),
        });
        added++;
      }
      reload();
      if (added > 0) alert(`Added ${added} template items.`);
      else alert("All template items already exist.");
    } catch (e) { console.error(e); }
    setSeeding(false);
  };

  // Quick toggle included
  const toggleIncluded = async (item: MarketingPlanItem) => {
    try {
      await api(`/cm/marketing-plan/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ isIncluded: !item.isIncluded }),
      });
      reload();
    } catch (e) { console.error(e); }
  };

  const upd = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <div className="text-sm text-muted">Loading deliverables...</div>;

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Client Deliverables</h3>
        <div className="flex gap-2">
          {items.length === 0 && (
            <Button size="sm" variant="outline" onClick={seedTemplate} disabled={seeding}>
              <ListPlus className="h-3 w-3 mr-1" /> {seeding ? "Seeding..." : "Seed Template"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Download className="h-3 w-3 mr-1" /> Import from Sheet
          </Button>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      {items.length === 0 && <div className="text-muted text-sm">No deliverables yet. Use "Seed Template" for standard items or import from a Google Sheet.</div>}

      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        const included = catItems.filter((i) => i.isIncluded).length;
        return (
          <div key={cat}>
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <h4 className="text-sm font-semibold text-foreground">{cat}</h4>
              <span className="text-xs text-dim">{included}/{catItems.length} included</span>
            </div>
            <div className="space-y-1">
              {catItems.map((item) => (
                <div key={item.id} className={cn("flex items-start justify-between rounded-md px-3 py-2",
                  item.isIncluded ? "bg-success/5" : "bg-surface-2 opacity-60")}>
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button onClick={() => toggleIncluded(item)}
                      className={cn("w-5 h-5 rounded border flex items-center justify-center text-xs shrink-0 mt-0.5 transition-colors",
                        item.isIncluded ? "bg-success/20 border-success text-success font-bold hover:bg-success/30" : "border-dim hover:border-foreground"
                      )}>{item.isIncluded ? "✓" : ""}</button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm", item.isIncluded ? "text-foreground" : "text-dim")}>{item.item}</span>
                        {!item.isIncluded && <span className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-dim">Not Included</span>}
                      </div>
                      {item.deliverables && (
                        <div className="text-xs text-muted mt-0.5">{item.deliverables}</div>
                      )}
                      {item.notes && (
                        <div className="text-xs text-dim mt-0.5 italic">{item.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {item.completionTarget && <span className="text-xs text-dim mr-1">{item.completionTarget.split("T")[0]}</span>}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen}
        title={editingId ? "Edit Deliverable" : "Add Deliverable"}
        onSubmit={submit} isPending={pending}>
        <FormField label="Category" type="select" value={form.category || ""}
          onChange={(v) => upd("category", v)}
          options={[{ value: "", label: "— Select —" }, ...CATEGORIES.map((c) => ({ value: c, label: c })), { value: "Other", label: "Other" }]} />
        <FormField label="Item" value={form.item || ""} onChange={(v) => upd("item", v)} required placeholder="e.g. Standard Blog Posts (1000+ Words)" />
        <FormField label="Included" type="checkbox" checked={!!form.isIncluded} onChange={(v) => upd("isIncluded", v)} />
        <FormField label="Deliverables / Frequency" value={form.deliverables || ""} onChange={(v) => upd("deliverables", v)} placeholder="e.g. 8 per year, 2 per week, 3 campaigns" />
        <FormField label="Completion Target" value={form.completionTarget || ""} onChange={(v) => upd("completionTarget", v)} placeholder="e.g. 02/28/2025 or Ongoing" />
        <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
      </FormDialog>

      {/* Import Dialog */}
      <FormDialog open={importOpen} onOpenChange={setImportOpen}
        title="Import Deliverables from Google Sheet"
        onSubmit={importFromSheet} isPending={importing}>
        <div className="text-sm text-muted mb-2">
          Paste the Google Sheet ID or URL. The service account must have read access.
          This will replace all existing deliverables for this client.
        </div>
        <FormField label="Sheet ID or URL" value={sheetId} onChange={setSheetId} required
          placeholder="e.g. 1h5LkdtUo355CunbFKsEbWY3SLqNGbApD1YjHv9tmxOw" />
      </FormDialog>

      <ConfirmDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}
        title="Delete Deliverable" description="This will permanently delete this deliverable item."
        onConfirm={doDelete} isPending={pending} />
    </div>
  );
}
