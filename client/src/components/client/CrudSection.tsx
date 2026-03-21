import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface CrudSectionProps<T extends { id: number }> {
  title: string;
  clientId: number;
  entityPath: string;         // e.g. "contacts"
  emptyForm: () => Partial<T>;
  renderItem: (item: T, onEdit: () => void, onDelete: () => void) => React.ReactNode;
  renderForm: (form: Partial<T>, update: (field: string, val: unknown) => void) => React.ReactNode;
  wide?: boolean;
  deleteWarning?: string;
  singularTitle?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function CrudSection<T extends { id: number }>({
  title, clientId, entityPath, emptyForm, renderItem, renderForm, wide, deleteWarning, singularTitle,
  collapsible, defaultCollapsed,
}: CrudSectionProps<T>) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const singular = singularTitle || title.replace(/ies$/, "y").replace(/ses$/, "ss").replace(/s$/, "");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<T>>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api<T[]>(`/cm/clients/${clientId}/${entityPath}`).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [clientId, entityPath]);

  useEffect(() => { reload(); }, [reload]);

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); };
  const openEdit = (item: T) => { setForm({ ...item }); setEditingId(item.id); setDialogOpen(true); };
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      // Strip read-only/system fields before sending
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        if (["id", "clientId", "createdAt", "updatedAt", "source"].includes(k)) continue;
        if (v === undefined) continue;
        payload[k] = v;
      }
      if (editingId) {
        await api(`/cm/${entityPath}/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api(`/cm/clients/${clientId}/${entityPath}`, { method: "POST", body: JSON.stringify(payload) });
      }
      setDialogOpen(false);
      setError(null);
      reload();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setPending(false);
  };
  const doDelete = async () => {
    if (!deleteId) return;
    setPending(true);
    try {
      await api(`/cm/${entityPath}/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      reload();
    } catch (e) { console.error(e); }
    setPending(false);
  };

  const update = (field: string, val: unknown) => setForm((p) => ({ ...p, [field]: val }));

  if (loading) return <div className="text-sm text-muted">Loading {title.toLowerCase()}...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {collapsible ? (
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-1.5 text-sm font-semibold text-foreground pb-2 border-b border-border flex-1">
            {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-dim" /> : <ChevronDown className="h-3.5 w-3.5 text-dim" />}
            {title}
            {collapsed && items.length > 0 && <span className="text-xs text-dim font-normal ml-1">({items.length})</span>}
          </button>
        ) : (
          <h3 className="text-sm font-semibold text-foreground pb-2 border-b border-border flex-1">{title}</h3>
        )}
        <Button size="sm" variant="outline" onClick={openAdd} className="ml-3 shrink-0">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      {!collapsed && (items.length === 0 ? (
        <div className="text-muted text-sm">No {title.toLowerCase()} added yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => renderItem(
            item,
            () => openEdit(item),
            () => setDeleteId(item.id),
          ))}
        </div>
      ))}

      <FormDialog open={dialogOpen} onOpenChange={() => { setDialogOpen(false); setError(null); }}
        title={editingId ? `Edit ${singular}` : `Add ${singular}`}
        onSubmit={submit} isPending={pending} wide={wide}>
        {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>}
        {renderForm(form, update)}
      </FormDialog>

      <ConfirmDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}
        title={`Delete ${singular}`}
        description={deleteWarning || `This will permanently delete this ${singular.toLowerCase()}.`}
        onConfirm={doDelete} isPending={pending} />
    </div>
  );
}

// Helper: standard item row with edit/delete buttons
export function CrudItem({ children, onEdit, onDelete }: { children: React.ReactNode; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-start justify-between bg-surface-2 rounded-md p-3">
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex gap-1 shrink-0 ml-2">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}
