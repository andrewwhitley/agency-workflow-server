import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/FormDialog";
import { FormField } from "@/components/FormField";
import { Plus, Search, FileText, Folder } from "lucide-react";

interface Guide {
  id: number; title: string; category_id: number | null; content: string;
  description: string | null; tags: string | null; status: string;
  category_name: string | null; category_icon: string | null;
  created_at: string; updated_at: string;
}

interface Category {
  id: number; name: string; description: string | null; icon: string | null;
}

export function MarketingGuidesPage() {
  const navigate = useNavigate();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("published");

  // Create guide dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", categoryId: "", description: "", status: "draft" });
  const [createPending, setCreatePending] = useState(false);

  // Create category dialog
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", icon: "", description: "" });
  const [catPending, setCatPending] = useState(false);

  const reload = () => {
    const params = new URLSearchParams();
    if (selectedStatus) params.set("status", selectedStatus);
    if (selectedCategory) params.set("categoryId", String(selectedCategory));
    if (search) params.set("search", search);

    Promise.all([
      api<Guide[]>(`/guides?${params}`).catch(() => []),
      api<Category[]>("/guides/categories").catch(() => []),
    ]).then(([g, c]) => { setGuides(g); setCategories(c); }).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [selectedStatus, selectedCategory, search]);

  const createGuide = async () => {
    setCreatePending(true);
    try {
      const guide = await api<Guide>("/guides", { method: "POST", body: JSON.stringify(createForm) });
      setCreateOpen(false);
      navigate(`/guides/${guide.id}`);
    } catch (e) { console.error(e); }
    setCreatePending(false);
  };

  const createCategory = async () => {
    setCatPending(true);
    try {
      await api("/guides/categories", { method: "POST", body: JSON.stringify(catForm) });
      setCatOpen(false);
      setCatForm({ name: "", icon: "", description: "" });
      reload();
    } catch (e) { console.error(e); }
    setCatPending(false);
  };

  if (loading) return <div className="text-muted">Loading guides...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Marketing Guides</h2>
          <p className="text-sm text-muted mt-1">Brand guidelines, templates, and marketing resources</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Guide</Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3">
          <div className="bg-surface border border-border rounded-md p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Folder className="h-4 w-4" /> Categories
                </h3>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCatOpen(true)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                <button onClick={() => setSelectedCategory(null)}
                  className={cn("w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
                    selectedCategory === null ? "bg-accent/10 text-accent font-medium" : "text-muted hover:bg-surface-2")}>
                  All Guides
                </button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                    className={cn("w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
                      selectedCategory === cat.id ? "bg-accent/10 text-accent font-medium" : "text-muted hover:bg-surface-2")}>
                    {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Status</h3>
              <div className="space-y-1">
                {[{ label: "Published", value: "published" }, { label: "Drafts", value: "draft" }, { label: "All", value: "" }].map((s) => (
                  <button key={s.value} onClick={() => setSelectedStatus(s.value)}
                    className={cn("w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
                      selectedStatus === s.value ? "bg-accent/10 text-accent font-medium" : "text-muted hover:bg-surface-2")}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="col-span-9">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides by title, content, or tags..." className="pl-9" />
          </div>

          {guides.length === 0 ? (
            <div className="bg-surface border border-border rounded-md p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-dim mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No guides found</h3>
              <p className="text-muted mb-4">
                {search ? "Try adjusting your search or filters" : "Get started by creating your first marketing guide"}
              </p>
              <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Guide</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guides.map((guide) => (
                <Link key={guide.id} to={`/guides/${guide.id}`}
                  className="bg-surface border border-border rounded-md p-5 hover:border-accent/50 transition-colors block">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {guide.category_icon && <span className="text-xl">{guide.category_icon}</span>}
                      <h3 className="text-sm font-semibold text-foreground">{guide.title}</h3>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium",
                      guide.status === "published" ? "bg-success/10 text-success" :
                      guide.status === "draft" ? "bg-surface-2 text-dim" : "bg-surface-2 text-dim"
                    )}>{guide.status}</span>
                  </div>
                  {guide.description && <p className="text-xs text-muted mb-2 line-clamp-2">{guide.description}</p>}
                  {guide.category_name && <div className="text-xs text-dim mb-2">{guide.category_name}</div>}
                  {guide.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {guide.tags.split(",").slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded border border-border text-dim">{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-dim mt-3 pt-3 border-t border-border">
                    Updated {new Date(guide.updated_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create guide dialog */}
      <FormDialog open={createOpen} onOpenChange={setCreateOpen} title="New Guide" onSubmit={createGuide} isPending={createPending} submitLabel="Create">
        <FormField label="Title" value={createForm.title} onChange={(v) => setCreateForm((p) => ({ ...p, title: v }))} required />
        <FormField label="Description" type="textarea" value={createForm.description} onChange={(v) => setCreateForm((p) => ({ ...p, description: v }))} rows={2} />
        <FormField label="Category" value={createForm.categoryId} onChange={(v) => setCreateForm((p) => ({ ...p, categoryId: v }))} placeholder="Category ID (optional)" />
        <FormField label="Status" value={createForm.status} onChange={(v) => setCreateForm((p) => ({ ...p, status: v }))} placeholder="draft or published" />
      </FormDialog>

      {/* Create category dialog */}
      <FormDialog open={catOpen} onOpenChange={setCatOpen} title="New Category" onSubmit={createCategory} isPending={catPending} submitLabel="Create">
        <FormField label="Name" value={catForm.name} onChange={(v) => setCatForm((p) => ({ ...p, name: v }))} required />
        <FormField label="Icon" value={catForm.icon} onChange={(v) => setCatForm((p) => ({ ...p, icon: v }))} placeholder="Emoji or icon name" />
        <FormField label="Description" type="textarea" value={catForm.description} onChange={(v) => setCatForm((p) => ({ ...p, description: v }))} />
      </FormDialog>
    </div>
  );
}
