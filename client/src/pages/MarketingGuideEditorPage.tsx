import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ArrowLeft, Save, Trash2, Eye, Pencil } from "lucide-react";

interface Guide {
  id: number; title: string; categoryId: number | null; content: string;
  description: string | null; tags: string | null; status: string;
  categoryName: string | null; categoryIcon: string | null;
  createdAt: string; updatedAt: string;
}

export function MarketingGuideEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [dirty, setDirty] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("draft");

  const reload = useCallback(() => {
    if (!id) return;
    api<Guide>(`/guides/${id}`)
      .then((g) => {
        setGuide(g);
        setTitle(g.title);
        setContent(g.content);
        setDescription(g.description || "");
        setTags(g.tags || "");
        setStatus(g.status);
        setDirty(false);
      })
      .catch(() => navigate("/guides"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!guide) return;
    setSaving(true);
    try {
      await api(`/guides/${guide.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content, description, tags, status }),
      });
      setDirty(false);
      reload();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const doDelete = async () => {
    if (!guide) return;
    setDeleting(true);
    try {
      await api(`/guides/${guide.id}`, { method: "DELETE" });
      navigate("/guides");
    } catch (e) { console.error(e); }
    setDeleting(false);
  };

  const markDirty = () => setDirty(true);

  if (loading) return <div className="text-muted">Loading guide...</div>;
  if (!guide) return <div className="text-destructive">Guide not found.</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/guides")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{guide.title}</h2>
            <div className="flex items-center gap-2 text-xs text-dim">
              {guide.categoryName && <span>{guide.categoryIcon} {guide.categoryName}</span>}
              <span className={cn("px-2 py-0.5 rounded font-medium",
                status === "published" ? "bg-success/10 text-success" : "bg-surface-2 text-dim"
              )}>{status}</span>
              {dirty && <span className="text-warning font-medium">Unsaved changes</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMode(mode === "edit" ? "preview" : "edit")}>
            {mode === "edit" ? <><Eye className="h-3 w-3 mr-1" /> Preview</> : <><Pencil className="h-3 w-3 mr-1" /> Edit</>}
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            <Save className="h-3 w-3 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {mode === "edit" ? (
        <div className="space-y-4">
          {/* Metadata */}
          <div className="bg-surface border border-border rounded-md p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Title</label>
                <Input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Input value={status} onChange={(e) => { setStatus(e.target.value); markDirty(); }} placeholder="draft, published, archived" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Input value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} placeholder="Brief description of this guide" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tags</label>
              <Input value={tags} onChange={(e) => { setTags(e.target.value); markDirty(); }} placeholder="Comma-separated tags" />
            </div>
          </div>

          {/* Content editor */}
          <div className="bg-surface border border-border rounded-md p-4">
            <label className="text-sm font-medium text-foreground mb-2 block">Content</label>
            <Textarea value={content} onChange={(e) => { setContent(e.target.value); markDirty(); }}
              className="min-h-[500px] font-mono text-sm" placeholder="Write your guide content here..." />
          </div>
        </div>
      ) : (
        /* Preview mode */
        <div className="bg-surface border border-border rounded-md p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          {description && <p className="text-muted mb-4">{description}</p>}
          {tags && (
            <div className="flex flex-wrap gap-1 mb-6">
              {tags.split(",").map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded border border-border text-dim">{tag.trim()}</span>
              ))}
            </div>
          )}
          <div className="border-t border-border pt-6">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{content}</div>
          </div>
        </div>
      )}

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen}
        title="Delete Guide" description="This will permanently delete this marketing guide."
        onConfirm={doDelete} isPending={deleting} />
    </div>
  );
}
