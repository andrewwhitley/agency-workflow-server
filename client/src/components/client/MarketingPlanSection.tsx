import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface MarketingPlanItem {
  id: number; category: string; item: string; isIncluded: boolean;
  quantity: number | null; notes: string | null; completionTarget: string | null;
}

const emptyItem = (): Partial<MarketingPlanItem> => ({
  category: "", item: "", isIncluded: false, quantity: null, notes: "", completionTarget: "",
});

export function MarketingPlanSection({ clientId }: { clientId: number }) {
  const [items, setItems] = useState<MarketingPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<MarketingPlanItem>>(emptyItem());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

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

  const upd = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <div className="text-sm text-muted">Loading marketing plan...</div>;

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Marketing Plan</h3>
        <Button size="sm" variant="outline" onClick={openAdd}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
      </div>

      {items.length === 0 && <div className="text-muted text-sm">No marketing plan items yet.</div>}

      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        const included = catItems.filter((i) => i.isIncluded).length;
        return (
          <div key={cat}>
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <h4 className="text-sm font-semibold text-foreground">{cat === "PPC" ? "Ads Management" : cat}</h4>
              <span className="text-xs text-dim">{included}/{catItems.length} included</span>
            </div>
            <div className="space-y-2">
              {catItems.map((item) => (
                <div key={item.id} className={cn("flex items-center justify-between rounded-md px-3 py-2",
                  item.isIncluded ? "bg-success/5" : "bg-surface-2 opacity-60")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn("w-5 h-5 rounded border flex items-center justify-center text-xs shrink-0",
                      item.isIncluded ? "bg-success/20 border-success text-success font-bold" : "border-dim"
                    )}>{item.isIncluded ? "✓" : ""}</span>
                    <span className={cn("text-sm", item.isIncluded ? "text-foreground" : "text-dim")}>{item.item}</span>
                    {item.quantity != null && <span className="text-xs text-muted shrink-0">×{item.quantity}</span>}
                    {!item.isIncluded && <span className="text-xs px-1.5 py-0.5 rounded bg-surface-3 text-dim shrink-0">Not Included</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.completionTarget && <span className="text-xs text-dim">{item.completionTarget.split("T")[0]}</span>}
                    {item.notes && <span className="text-xs text-dim max-w-[150px] truncate" title={item.notes}>{item.notes}</span>}
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
        title={editingId ? "Edit Marketing Plan Item" : "Add Marketing Plan Item"}
        onSubmit={submit} isPending={pending}>
        <FormField label="Category" value={form.category || ""} onChange={(v) => upd("category", v)} required placeholder="e.g. SEO, Content, Ads Management" />
        <FormField label="Item" value={form.item || ""} onChange={(v) => upd("item", v)} required placeholder="e.g. Monthly Blog Posts" />
        <FormField label="Included in Plan" type="checkbox" checked={!!form.isIncluded} onChange={(v) => upd("isIncluded", v)} />
        <FormField label="Quantity" type="number" value={form.quantity?.toString() || ""} onChange={(v) => upd("quantity", v ? parseInt(v) : null)} />
        <FormField label="Completion Target" value={form.completionTarget || ""} onChange={(v) => upd("completionTarget", v)} placeholder="YYYY-MM-DD" />
        <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
      </FormDialog>

      <ConfirmDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}
        title="Delete Item" description="This will permanently delete this marketing plan item."
        onConfirm={doDelete} isPending={pending} />
    </div>
  );
}
