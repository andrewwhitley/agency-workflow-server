import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { FormField } from "@/components/FormField";
import { Pencil, MessageSquare, Zap, Palette, Users, BookOpen, Star, Megaphone, Calendar, FileText } from "lucide-react";

interface ContentGuidelines {
  [key: string]: unknown;
}

interface SectionDef {
  key: string;
  title: string;
  icon: React.ElementType;
  color: string;
  priority: string;
  fields: { key: string; label: string; type?: "textarea" | "checkbox"; }[];
}

const SECTIONS: SectionDef[] = [
  {
    key: "voice", title: "Brand Voice & Messaging", icon: MessageSquare, color: "border-l-blue-500", priority: "Essential",
    fields: [
      { key: "brandVoice", label: "Brand Voice", type: "textarea" },
      { key: "tone", label: "Tone" },
      { key: "writingStyle", label: "Writing Style" },
      { key: "dosAndDonts", label: "Do's & Don'ts", type: "textarea" },
      { key: "approvedTerminology", label: "Approved Terminology", type: "textarea" },
      { key: "restrictions", label: "Restrictions", type: "textarea" },
    ],
  },
  {
    key: "usps", title: "Unique Selling Propositions", icon: Zap, color: "border-l-green-500", priority: "Essential",
    fields: [
      { key: "uniqueSellingPoints", label: "Unique Selling Points", type: "textarea" },
      { key: "guarantees", label: "Guarantees", type: "textarea" },
      { key: "competitiveAdvantages", label: "Competitive Advantages", type: "textarea" },
    ],
  },
  {
    key: "brand", title: "Brand Identity", icon: Palette, color: "border-l-purple-500", priority: "Important",
    fields: [
      { key: "brandColors", label: "Brand Colors" },
      { key: "fonts", label: "Fonts" },
      { key: "logoGuidelines", label: "Logo Guidelines", type: "textarea" },
      { key: "designInspiration", label: "Design Inspiration", type: "textarea" },
      { key: "useStockPhotography", label: "Use Stock Photography", type: "checkbox" },
      { key: "imageSourceNotes", label: "Image Source Notes", type: "textarea" },
    ],
  },
  {
    key: "audience", title: "Target Audience & Personas", icon: Users, color: "border-l-orange-500", priority: "Essential",
    fields: [
      { key: "targetAudienceSummary", label: "Audience Summary", type: "textarea" },
      { key: "demographics", label: "Demographics", type: "textarea" },
      { key: "psychographics", label: "Psychographics", type: "textarea" },
    ],
  },
  {
    key: "content", title: "Content Topics & Keywords", icon: BookOpen, color: "border-l-yellow-500", priority: "Important",
    fields: [
      { key: "focusTopics", label: "Focus Topics", type: "textarea" },
      { key: "seoKeywords", label: "SEO Keywords", type: "textarea" },
      { key: "contentThemes", label: "Content Themes", type: "textarea" },
      { key: "messagingPriorities", label: "Messaging Priorities", type: "textarea" },
      { key: "contentPurpose", label: "Content Purpose" },
      { key: "userActionStrategy", label: "User Action Strategy", type: "textarea" },
    ],
  },
  {
    key: "proof", title: "Testimonials & Social Proof", icon: Star, color: "border-l-pink-500", priority: "Helpful",
    fields: [
      { key: "featuredTestimonials", label: "Featured Testimonials", type: "textarea" },
      { key: "successStories", label: "Success Stories", type: "textarea" },
      { key: "socialProofNotes", label: "Social Proof Notes", type: "textarea" },
    ],
  },
  {
    key: "ads", title: "Ad Copy Guidelines", icon: Megaphone, color: "border-l-red-500", priority: "Important",
    fields: [
      { key: "adCopyGuidelines", label: "Ad Copy Guidelines", type: "textarea" },
      { key: "preferredCtas", label: "Preferred CTAs", type: "textarea" },
      { key: "targetingPreferences", label: "Targeting Preferences", type: "textarea" },
      { key: "promotions", label: "Promotions", type: "textarea" },
    ],
  },
  {
    key: "calendar", title: "Holiday Calendar", icon: Calendar, color: "border-l-gray-500", priority: "Optional",
    fields: [
      { key: "observedHolidays", label: "Observed Holidays", type: "textarea" },
      { key: "holidayContentNotes", label: "Holiday Content Notes", type: "textarea" },
    ],
  },
  {
    key: "resources", title: "Resources & Guides", icon: FileText, color: "border-l-slate-500", priority: "Helpful",
    fields: [
      { key: "brandStory", label: "Brand Story", type: "textarea" },
      { key: "existingCollateral", label: "Existing Collateral", type: "textarea" },
      { key: "marketingGuide", label: "Marketing Guide", type: "textarea" },
      { key: "writingStyleGuide", label: "Writing Style Guide", type: "textarea" },
    ],
  },
];

const priorityColor = (p: string) =>
  p === "Essential" ? "bg-blue-100 text-blue-700" :
  p === "Important" ? "bg-amber-100 text-amber-700" :
  p === "Helpful" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";

export function ContentGuideSection({ clientId }: { clientId: number }) {
  const [guide, setGuide] = useState<ContentGuidelines | null>(null);
  const [loading, setLoading] = useState(true);
  const [editSection, setEditSection] = useState<SectionDef | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState(false);

  const reload = useCallback(() => {
    api<ContentGuidelines>(`/cm/clients/${clientId}/content-guidelines`)
      .then(setGuide).catch(() => setGuide(null)).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const openEdit = (section: SectionDef) => {
    const data: Record<string, unknown> = {};
    section.fields.forEach((f) => {
      data[f.key] = guide?.[f.key] ?? (f.type === "checkbox" ? false : "");
    });
    setForm(data);
    setEditSection(section);
  };

  const submit = async () => {
    setPending(true);
    try {
      await api(`/cm/clients/${clientId}/content-guidelines`, {
        method: "PUT", body: JSON.stringify(form),
      });
      reload();
      setEditSection(null);
    } catch (e) { console.error(e); }
    setPending(false);
  };

  const upd = (key: string, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

  if (loading) return <div className="text-sm text-muted">Loading content guidelines...</div>;

  // Calculate completeness
  const totalFields = SECTIONS.reduce((sum, s) => sum + s.fields.length, 0);
  const filledFields = guide ? SECTIONS.reduce((sum, s) =>
    sum + s.fields.filter((f) => {
      const v = guide[f.key];
      return v != null && v !== "" && v !== false;
    }).length, 0) : 0;
  const completionPct = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-surface border border-border rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Content Guidelines Completion</span>
          <span className="text-sm text-muted">{filledFields}/{totalFields} fields ({completionPct}%)</span>
        </div>
        <div className="w-full bg-surface-2 rounded-full h-2">
          <div className="bg-accent rounded-full h-2 transition-all" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const filled = guide ? section.fields.filter((f) => {
          const v = guide[f.key];
          return v != null && v !== "" && v !== false;
        }).length : 0;
        const total = section.fields.length;
        const status = filled === total ? "complete" : filled > 0 ? "partial" : "empty";

        return (
          <div key={section.key} className={`border border-border rounded-md border-l-4 ${section.color}`}>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{section.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColor(section.priority)}`}>{section.priority}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${status === "complete" ? "bg-success" : status === "partial" ? "bg-warning" : "bg-dim"}`} />
                    <span className="text-xs text-dim">{filled}/{total} fields</span>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openEdit(section)}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            </div>

            {/* Show filled fields */}
            {guide && filled > 0 && (
              <div className="px-4 pb-4 pt-0 space-y-2">
                {section.fields.filter((f) => {
                  const v = guide[f.key];
                  return v != null && v !== "" && v !== false;
                }).map((f) => (
                  <div key={f.key}>
                    <div className="text-xs text-dim">{f.label}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {f.type === "checkbox" ? (guide[f.key] ? "Yes" : "No") : String(guide[f.key])}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit dialog */}
      {editSection && (
        <FormDialog open={true} onOpenChange={() => setEditSection(null)}
          title={`Edit ${editSection.title}`} onSubmit={submit} isPending={pending} wide>
          {editSection.fields.map((f) =>
            f.type === "checkbox" ? (
              <FormField key={f.key} label={f.label} type="checkbox" checked={!!form[f.key]} onChange={(v) => upd(f.key, v)} />
            ) : f.type === "textarea" ? (
              <FormField key={f.key} label={f.label} type="textarea" value={String(form[f.key] ?? "")} onChange={(v) => upd(f.key, v)} rows={4} />
            ) : (
              <FormField key={f.key} label={f.label} value={String(form[f.key] ?? "")} onChange={(v) => upd(f.key, v)} />
            )
          )}
        </FormDialog>
      )}
    </div>
  );
}
