import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X } from "lucide-react";

interface MarketingPlanItem {
  id: number;
  category: string;
  item: string;
  isIncluded: boolean;
  deliverables: string | null;
  notes: string | null;
}

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

const CATEGORIES = [...new Set(TEMPLATE_ITEMS.map((t) => t.category))];

const CATEGORY_COLORS: Record<string, string> = {
  "Website": "bg-blue-500",
  "Social Media": "bg-pink-500",
  "SEO": "bg-green-500",
  "Web Content": "bg-amber-500",
  "Ad Management": "bg-purple-500",
  "Reputation Management": "bg-red-500",
  "Business AutoMatrix": "bg-cyan-500",
};

export function MarketingPlanSection({ clientId }: { clientId: number }) {
  const [items, setItems] = useState<MarketingPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const reload = useCallback(() => {
    api<MarketingPlanItem[]>(`/cm/clients/${clientId}/marketing-plan`)
      .then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  // Auto-seed missing template items (runs after load, adds any template items not yet in DB)
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (loading || seeded) return;
    const existing = new Set(items.map((i) => `${i.category}::${i.item}`));
    const missing = TEMPLATE_ITEMS.filter((t) => !existing.has(`${t.category}::${t.item}`));
    if (missing.length === 0) { setSeeded(true); return; }
    setSeeded(true);
    (async () => {
      for (const t of missing) {
        await api(`/cm/clients/${clientId}/marketing-plan`, {
          method: "POST",
          body: JSON.stringify({ category: t.category, item: t.item, isIncluded: false }),
        });
      }
      reload();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items]);

  const toggleIncluded = async (item: MarketingPlanItem) => {
    try {
      await api(`/cm/marketing-plan/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ isIncluded: !item.isIncluded }),
      });
      reload();
    } catch (e) { console.error(e); }
  };

  const saveNotes = async (item: MarketingPlanItem) => {
    try {
      await api(`/cm/marketing-plan/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ notes: notesValue }),
      });
      setEditingNotes(null);
      reload();
    } catch (e) { console.error(e); }
  };

  const addItem = async (category: string) => {
    if (!newItemName.trim()) return;
    try {
      await api(`/cm/clients/${clientId}/marketing-plan`, {
        method: "POST",
        body: JSON.stringify({ category, item: newItemName.trim(), isIncluded: true }),
      });
      setAddingTo(null);
      setNewItemName("");
      reload();
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (id: number) => {
    try {
      await api(`/cm/marketing-plan/${id}`, { method: "DELETE" });
      reload();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="text-sm text-muted">Loading deliverables...</div>;

  // Group items by category, keeping template order and deduplicating
  const itemsByCategory: Record<string, MarketingPlanItem[]> = {};
  for (const cat of CATEGORIES) {
    itemsByCategory[cat] = [];
  }
  const seenItemKeys = new Set<string>();
  for (const item of items) {
    if (!item.item || item.item.trim() === "" || item.item.trim().toLowerCase() === item.category.trim().toLowerCase()) continue;
    // Deduplicate by category+item
    const key = `${item.category.trim()}::${item.item.trim()}`.toLowerCase();
    if (seenItemKeys.has(key)) continue;
    seenItemKeys.add(key);
    // Map to known category if possible
    const cat = CATEGORIES.find((c) => c.toLowerCase() === item.category.trim().toLowerCase()) || item.category.trim();
    if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
    itemsByCategory[cat].push(item);
  }

  const includedCount = items.filter((i) => i.isIncluded).length;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Client Deliverables</h3>
          <span className="text-xs text-dim">{includedCount} included</span>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_1fr_1fr_40px] bg-surface-2 px-3 py-2 border-b border-border text-xs font-semibold text-dim uppercase tracking-wide">
          <div></div>
          <div>Deliverable</div>
          <div>Notes</div>
          <div></div>
        </div>

        {Object.entries(itemsByCategory).map(([cat, catItems]) => {
          if (catItems.length === 0 && !CATEGORIES.includes(cat)) return null;
          const color = CATEGORY_COLORS[cat] || "bg-gray-500";

          return (
            <div key={cat}>
              {/* Category Header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-border">
                <div className={cn("w-2 h-2 rounded-full", color)} />
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">{cat}</span>
                <span className="text-[10px] text-dim">({catItems.filter((i) => i.isIncluded).length}/{catItems.length})</span>
              </div>

              {/* Items */}
              {catItems.map((item) => {
                const isTemplate = TEMPLATE_ITEMS.some((t) => t.category === item.category && t.item === item.item);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "grid grid-cols-[40px_1fr_1fr_40px] items-center px-3 py-1.5 border-b border-border/50 transition-colors",
                      item.isIncluded ? "bg-success/5" : "opacity-50"
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleIncluded(item)}
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        item.isIncluded
                          ? "bg-success/20 border-success text-success"
                          : "border-dim hover:border-foreground"
                      )}
                    >
                      {item.isIncluded && <Check className="h-3 w-3" />}
                    </button>

                    {/* Item name */}
                    <span className={cn("text-sm", item.isIncluded ? "text-foreground" : "text-dim")}>
                      {item.item}
                    </span>

                    {/* Notes */}
                    {editingNotes === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={notesValue}
                          onChange={(e) => setNotesValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveNotes(item); if (e.key === "Escape") setEditingNotes(null); }}
                          className="flex-1 text-sm bg-surface-2 text-foreground border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                          autoFocus
                          placeholder="Add notes..."
                        />
                        <button onClick={() => saveNotes(item)} className="text-success hover:text-success/80"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setEditingNotes(null)} className="text-dim hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNotes(item.id); setNotesValue(item.notes || ""); }}
                        className="text-left text-sm text-dim hover:text-foreground transition-colors truncate"
                        title={item.notes || "Click to add notes"}
                      >
                        {item.notes || <span className="italic text-dim/50">—</span>}
                      </button>
                    )}

                    {/* Delete (only for non-template items) */}
                    <div>
                      {!isTemplate && (
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-dim hover:text-destructive transition-colors"
                          title="Delete custom item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add custom item */}
              {addingTo === cat ? (
                <div className="grid grid-cols-[40px_1fr_1fr_40px] items-center px-3 py-1.5 border-b border-border/50 bg-accent/5">
                  <div />
                  <input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addItem(cat); if (e.key === "Escape") setAddingTo(null); }}
                    className="text-sm bg-surface-2 text-foreground border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    autoFocus
                    placeholder="New deliverable name..."
                  />
                  <div className="flex items-center gap-1">
                    <Button size="sm" onClick={() => addItem(cat)} disabled={!newItemName.trim()}>Add</Button>
                    <button onClick={() => setAddingTo(null)} className="text-dim hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <div />
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTo(cat); setNewItemName(""); }}
                  className="w-full grid grid-cols-[40px_1fr_1fr_40px] items-center px-3 py-1.5 border-b border-border/50 text-dim/40 hover:text-dim hover:bg-surface-2 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span className="text-xs">Add deliverable...</span>
                  <div />
                  <div />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
