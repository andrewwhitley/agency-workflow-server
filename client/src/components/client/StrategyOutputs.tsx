import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sparkles, RefreshCw, ChevronDown, ChevronRight, Layers, Map, Calendar, Rocket,
  Target, FileText, Video, Mail, Globe, MessageSquare, ArrowRight, Pencil, Save, X,
  Plus, Trash2, MessageCircle,
} from "lucide-react";

interface StrategyData {
  contentPillars: any;
  customerJourney: any;
  contentPlan12mo: any;
  sprintPlan90day: any;
  generatedAt: string | null;
}

const COMPONENTS = [
  { key: "pillars", label: "Content Pillars", icon: Layers, dbKey: "contentPillars", desc: "4-5 core content themes with 8-12 topic clusters each, mapped to keywords and search intent" },
  { key: "journey", label: "Customer Journey", icon: Map, dbKey: "customerJourney", desc: "Full journey map from awareness to advocacy with touchpoints, gaps, and opportunities at each stage" },
  { key: "plan", label: "12-Month Content Plan", icon: Calendar, dbKey: "contentPlan12mo", desc: "Quarter-by-quarter content calendar with monthly themes, content pieces, and campaign ideas" },
  { key: "sprint", label: "90-Day Sprint Plan", icon: Rocket, dbKey: "sprintPlan90day", desc: "Week-by-week implementation plan for the first 3 months with specific deliverables" },
] as const;

const typeIcons: Record<string, typeof FileText> = {
  blog: FileText, video: Video, social: Globe, social_series: Globe,
  email: Mail, email_sequence: Mail, guide: FileText, landing_page: Globe, gbp_post: Globe,
};

export function StrategyOutputs({ clientId }: { clientId: number }) {
  const [data, setData] = useState<StrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [guidance, setGuidance] = useState<Record<string, string>>({});
  const [showGuidance, setShowGuidance] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    api<StrategyData | null>(`/cm/clients/${clientId}/strategy`)
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const saveEdit = async (component: string) => {
    setSaving(true);
    try {
      const dbKey = COMPONENTS.find((c) => c.key === component)?.dbKey;
      await api(`/cm/clients/${clientId}/strategy/${component}`, {
        method: "PUT", body: JSON.stringify({ data: editData }),
      });
      setData((prev) => prev ? { ...prev, [dbKey!]: editData } : prev);
      setEditing(null);
      setEditData(null);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const generate = async (component: string) => {
    setGenerating(component);
    try {
      await api(`/cm/clients/${clientId}/strategy/generate`, {
        method: "POST", body: JSON.stringify({ component, guidance: guidance[component] || undefined }),
      });
      // Poll for completion (generation runs in background)
      const dbKey = COMPONENTS.find((c) => c.key === component)?.dbKey;
      for (let i = 0; i < 24; i++) { // Poll for up to 2 minutes
        await new Promise((r) => setTimeout(r, 5000));
        const fresh = await api<StrategyData | null>(`/cm/clients/${clientId}/strategy`).catch(() => null);
        if (fresh && (fresh as any)[dbKey!]) {
          setData(fresh);
          setGenerating(null);
          return;
        }
      }
      reload();
    } catch (e) { console.error(e); }
    setGenerating(null);
  };

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (loading) return <div className="text-sm text-dim">Loading strategy...</div>;

  return (
    <div className="space-y-4">
      {COMPONENTS.map((comp) => {
        const hasData = data && (data as any)[comp.dbKey];
        const isExpanded = expanded.has(comp.key);
        const isGenerating = generating === comp.key;
        const Icon = comp.icon;

        const isEditing = editing === comp.key;

        return (
          <div key={comp.key} className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div
              className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors", hasData && "bg-surface")}
              onClick={() => hasData && !isEditing && toggle(comp.key)}
            >
              <Icon className={cn("h-4 w-4 shrink-0", hasData ? "text-accent" : "text-dim")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{comp.label}</span>
                  {hasData && !isEditing && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">Generated</span>}
                  {isEditing && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Editing</span>}
                </div>
                {!hasData && !isGenerating && <p className="text-xs text-dim mt-0.5">{comp.desc}</p>}
              </div>
              {hasData ? (
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); saveEdit(comp.key); }} disabled={saving}>
                        <Save className={cn("h-3 w-3 text-success", saving && "animate-pulse")} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(null); setEditData(null); }}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" title="Edit" onClick={(e) => { e.stopPropagation(); setEditing(comp.key); setEditData(structuredClone((data as any)[comp.dbKey])); setExpanded((p) => new Set(p).add(comp.key)); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Guidance" onClick={(e) => { e.stopPropagation(); setShowGuidance(showGuidance === comp.key ? null : comp.key); }}>
                        <MessageCircle className={cn("h-3 w-3", guidance[comp.key] && "text-accent")} />
                      </Button>
                      <Button size="sm" variant="ghost" title="Regenerate" onClick={(e) => { e.stopPropagation(); generate(comp.key); }} disabled={!!generating}>
                        <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                      </Button>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" title="Add guidance" onClick={(e) => { e.stopPropagation(); setShowGuidance(showGuidance === comp.key ? null : comp.key); }}>
                    <MessageCircle className={cn("h-3 w-3", guidance[comp.key] && "text-accent")} />
                  </Button>
                  <Button size="sm" onClick={() => generate(comp.key)} disabled={!!generating}>
                    {isGenerating ? (
                      <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="h-3 w-3 mr-1.5" /> Generate</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Guidance Field */}
            {showGuidance === comp.key && (
              <div className="px-4 py-3 border-t border-border bg-surface-2">
                <label className="text-xs font-medium text-dim block mb-1.5">Guidance for AI generation</label>
                <textarea
                  value={guidance[comp.key] || ""}
                  onChange={(e) => setGuidance((prev) => ({ ...prev, [comp.key]: e.target.value }))}
                  placeholder="E.g., Focus on hormone health and weight loss. Target women 35-55. Emphasize functional medicine approach..."
                  className="w-full min-h-[60px] text-sm bg-surface text-foreground border border-border rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-dim/50"
                />
                <p className="text-[10px] text-dim mt-1">This guidance will be included when generating or regenerating this section.</p>
              </div>
            )}

            {/* Expanded Content */}
            {hasData && isExpanded && (
              <div className="px-4 pb-4 border-t border-border">
                {isEditing ? (
                  <>
                    {comp.key === "pillars" && <PillarsEditor data={editData} onChange={setEditData} />}
                    {comp.key === "journey" && <JourneyEditor data={editData} onChange={setEditData} />}
                    {comp.key === "plan" && <ContentPlanEditor data={editData} onChange={setEditData} />}
                    {comp.key === "sprint" && <SprintEditor data={editData} onChange={setEditData} />}
                  </>
                ) : (
                  <>
                    {comp.key === "pillars" && <PillarsView data={(data as any)[comp.dbKey]} />}
                    {comp.key === "journey" && <JourneyView data={(data as any)[comp.dbKey]} />}
                    {comp.key === "plan" && <ContentPlanView data={(data as any)[comp.dbKey]} />}
                    {comp.key === "sprint" && <SprintView data={(data as any)[comp.dbKey]} />}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Generate All */}
      {data && !COMPONENTS.every((c) => (data as any)[c.dbKey]) && (
        <div className="text-center pt-2">
          <Button variant="outline" onClick={async () => {
            for (const c of COMPONENTS) {
              if (!(data as any)[c.dbKey]) await generate(c.key);
            }
          }} disabled={!!generating}>
            <Sparkles className="h-3 w-3 mr-1.5" /> Generate All Missing
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Content Pillars View ─────────────────────────────────

function PillarsView({ data }: { data: any }) {
  const [openPillar, setOpenPillar] = useState<number | null>(null);
  const pillars = data?.pillars || [];

  return (
    <div className="space-y-3 mt-3">
      {pillars.map((p: any, i: number) => (
        <div key={i} className="border border-border rounded-md">
          <button onClick={() => setOpenPillar(openPillar === i ? null : i)}
            className="w-full text-left px-3 py-2.5 hover:bg-surface-2 transition-colors flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">{p.name}</div>
              <div className="text-xs text-dim">{p.description?.substring(0, 100)}</div>
              <div className="flex items-center gap-2 mt-1">
                {p.targetPersona && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{p.targetPersona}</span>}
                <span className="text-[10px] text-dim">{p.topics?.length || 0} topics</span>
              </div>
            </div>
            {openPillar === i ? <ChevronDown className="h-3.5 w-3.5 text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-dim" />}
          </button>
          {openPillar === i && p.topics && (
            <div className="border-t border-border px-3 py-2 space-y-1.5">
              {p.topics.map((t: any, j: number) => {
                const TIcon = typeIcons[t.type] || FileText;
                return (
                  <div key={j} className="flex items-start gap-2 py-1">
                    <TIcon className="h-3.5 w-3.5 text-dim mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground">{t.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.targetKeyword && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{t.targetKeyword}</span>}
                        {t.searchIntent && <span className="text-[10px] text-dim">{t.searchIntent}</span>}
                        {t.priority && <span className={cn("text-[10px] px-1 rounded",
                          t.priority === "high" ? "bg-red-500/10 text-red-400" :
                          t.priority === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-surface-2 text-dim"
                        )}>{t.priority}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Customer Journey View ────────────────────────────────

function JourneyView({ data }: { data: any }) {
  const stages = data?.stages || [];
  const stageColors: Record<string, string> = {
    Awareness: "border-l-blue-500", Consideration: "border-l-amber-500",
    Decision: "border-l-green-500", Onboarding: "border-l-purple-500",
    Retention: "border-l-cyan-500", Advocacy: "border-l-pink-500",
  };

  return (
    <div className="space-y-3 mt-3">
      {stages.map((s: any, i: number) => (
        <div key={i} className={cn("border border-border rounded-md border-l-4", stageColors[s.name] || "border-l-dim")}>
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{s.name}</span>
              {i < stages.length - 1 && <ArrowRight className="h-3 w-3 text-dim" />}
            </div>
            {s.customerMindset && <p className="text-xs text-dim italic mb-2">"{s.customerMindset}"</p>}
            {s.questions?.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-dim uppercase">Questions</span>
                <ul className="text-xs text-muted mt-0.5 space-y-0.5">
                  {s.questions.map((q: string, j: number) => <li key={j}>• {q}</li>)}
                </ul>
              </div>
            )}
            {s.touchpoints?.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] font-semibold text-dim uppercase">Touchpoints</span>
                <div className="space-y-1 mt-1">
                  {s.touchpoints.map((t: any, j: number) => (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded bg-surface-2 text-dim shrink-0">{t.channel}</span>
                      <span className="text-foreground">{t.action}</span>
                      {t.gap && <span className="text-red-400 ml-auto shrink-0">Gap: {t.gap}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {s.opportunities?.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold text-dim uppercase">Opportunities</span>
                <ul className="text-xs text-accent mt-0.5 space-y-0.5">
                  {s.opportunities.map((o: string, j: number) => <li key={j}>→ {o}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 12-Month Content Plan View ───────────────────────────

function ContentPlanView({ data }: { data: any }) {
  const [openQuarter, setOpenQuarter] = useState<number | null>(0);
  const quarters = data?.quarters || [];

  return (
    <div className="space-y-3 mt-3">
      {/* Annual KPIs */}
      {data?.annualKPIs && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          {Object.entries(data.annualKPIs).map(([k, v]) => (
            <div key={k} className="bg-surface-2 rounded-md p-2 text-center">
              <div className="text-[10px] text-dim uppercase">{k.replace(/([A-Z])/g, " $1").trim()}</div>
              <div className="text-sm font-bold text-foreground">{String(v)}</div>
            </div>
          ))}
        </div>
      )}

      {quarters.map((q: any, qi: number) => (
        <div key={qi} className="border border-border rounded-md">
          <button onClick={() => setOpenQuarter(openQuarter === qi ? null : qi)}
            className="w-full text-left px-3 py-2.5 hover:bg-surface-2 transition-colors flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-foreground">{q.quarter}: {q.theme}</span>
              {q.goals && <div className="text-xs text-dim mt-0.5">{q.goals.join(" · ")}</div>}
            </div>
            {openQuarter === qi ? <ChevronDown className="h-3.5 w-3.5 text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-dim" />}
          </button>
          {openQuarter === qi && q.months && (
            <div className="border-t border-border">
              {q.months.map((m: any, mi: number) => (
                <div key={mi} className="px-3 py-2.5 border-b border-border/50 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-accent">{m.month}</span>
                    <span className="text-xs text-dim">— {m.focus}</span>
                  </div>
                  <div className="space-y-1">
                    {m.content?.map((c: any, ci: number) => {
                      const CIcon = typeIcons[c.type] || FileText;
                      return (
                        <div key={ci} className="flex items-start gap-2 text-xs">
                          <CIcon className="h-3 w-3 text-dim mt-0.5 shrink-0" />
                          <span className="text-foreground flex-1">{c.title}</span>
                          <span className="text-dim shrink-0">{c.channel}</span>
                        </div>
                      );
                    })}
                  </div>
                  {m.campaigns?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      {m.campaigns.map((camp: any, ci: number) => (
                        <div key={ci} className="flex items-center gap-2 text-xs">
                          <Target className="h-3 w-3 text-amber-400" />
                          <span className="text-foreground font-medium">{camp.name}</span>
                          <span className="text-dim">{camp.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 90-Day Sprint View ───────────────────────────────────

function SprintView({ data }: { data: any }) {
  const weeks = data?.weeks || [];
  const milestones = data?.milestones || [];
  const phaseColors: Record<string, string> = {
    Foundation: "bg-blue-500", Launch: "bg-green-500", Optimization: "bg-amber-500", Growth: "bg-purple-500",
  };
  const catColors: Record<string, string> = {
    seo: "text-green-400", content: "text-blue-400", social: "text-pink-400",
    ads: "text-amber-400", website: "text-purple-400", reputation: "text-cyan-400", strategy: "text-foreground",
  };

  return (
    <div className="mt-3">
      {/* Milestones strip */}
      {milestones.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {milestones.map((m: any, i: number) => (
            <div key={i} className="text-[10px] px-2 py-1 rounded bg-accent/10 text-accent border border-accent/20">
              Week {m.week}: {m.milestone}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {weeks.map((w: any) => (
          <div key={w.week} className="flex gap-3 py-2 border-b border-border/30">
            <div className="w-14 shrink-0 text-center">
              <div className="text-xs font-bold text-foreground">Wk {w.week}</div>
              <div className={cn("text-[8px] px-1 py-0.5 rounded mt-0.5 text-white", phaseColors[w.phase] || "bg-dim")}>{w.phase}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground mb-1">{w.theme}</div>
              <div className="space-y-0.5">
                {w.tasks?.map((t: any, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs">
                    <span className={cn("shrink-0", catColors[t.category] || "text-dim")}>•</span>
                    <span className="text-foreground">{t.task}</span>
                    <span className="text-dim ml-auto shrink-0">{t.owner}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Editor Helpers ─────────────────────────────────

function EditInput({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className={cn("bg-surface text-foreground border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent", className)} />;
}

function EditTextarea({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    className={cn("bg-surface text-foreground border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent min-h-[40px]", className)} />;
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-destructive/60 hover:text-destructive shrink-0"><Trash2 className="h-3 w-3" /></button>;
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 mt-2"><Plus className="h-3 w-3" />{label}</button>;
}

// ── Content Pillars Editor ────────────────────────────────

function PillarsEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const pillars = data?.pillars || [];
  const update = (idx: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.pillars[idx][field] = value;
    onChange(next);
  };
  const updateTopic = (pi: number, ti: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.pillars[pi].topics[ti][field] = value;
    onChange(next);
  };
  const removePillar = (idx: number) => {
    const next = structuredClone(data);
    next.pillars.splice(idx, 1);
    onChange(next);
  };
  const removeTopic = (pi: number, ti: number) => {
    const next = structuredClone(data);
    next.pillars[pi].topics.splice(ti, 1);
    onChange(next);
  };
  const addPillar = () => {
    const next = structuredClone(data);
    next.pillars.push({ name: "", description: "", targetPersona: "", topics: [] });
    onChange(next);
  };
  const addTopic = (pi: number) => {
    const next = structuredClone(data);
    next.pillars[pi].topics.push({ title: "", type: "blog", targetKeyword: "", searchIntent: "informational", priority: "medium", brief: "" });
    onChange(next);
  };

  return (
    <div className="space-y-4 mt-3">
      {pillars.map((p: any, i: number) => (
        <div key={i} className="border border-border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            <EditInput value={p.name} onChange={(v) => update(i, "name", v)} className="flex-1 font-semibold" placeholder="Pillar name" />
            <EditInput value={p.targetPersona} onChange={(v) => update(i, "targetPersona", v)} className="w-40" placeholder="Target persona" />
            <RemoveBtn onClick={() => removePillar(i)} />
          </div>
          <EditTextarea value={p.description} onChange={(v) => update(i, "description", v)} className="w-full" placeholder="Why this pillar matters" />
          <div className="space-y-1.5 pl-2">
            {(p.topics || []).map((t: any, j: number) => (
              <div key={j} className="flex items-start gap-2 py-1 border-b border-border/20">
                <div className="flex-1 space-y-1">
                  <EditInput value={t.title} onChange={(v) => updateTopic(i, j, "title", v)} className="w-full" placeholder="Topic title" />
                  <div className="flex items-center gap-2">
                    <select value={t.type || "blog"} onChange={(e) => updateTopic(i, j, "type", e.target.value)}
                      className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs text-foreground">
                      {["blog", "video", "social", "email", "guide", "landing_page", "gbp_post"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <EditInput value={t.targetKeyword} onChange={(v) => updateTopic(i, j, "targetKeyword", v)} className="flex-1 text-xs" placeholder="Target keyword" />
                    <select value={t.searchIntent || "informational"} onChange={(e) => updateTopic(i, j, "searchIntent", e.target.value)}
                      className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs text-foreground">
                      {["informational", "commercial", "transactional"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={t.priority || "medium"} onChange={(e) => updateTopic(i, j, "priority", e.target.value)}
                      className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs text-foreground">
                      {["high", "medium", "low"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <RemoveBtn onClick={() => removeTopic(i, j)} />
              </div>
            ))}
            <AddBtn onClick={() => addTopic(i)} label="Add topic" />
          </div>
        </div>
      ))}
      <AddBtn onClick={addPillar} label="Add pillar" />
    </div>
  );
}

// ── Customer Journey Editor ───────────────────────────────

function JourneyEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const stages = data?.stages || [];
  const update = (idx: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.stages[idx][field] = value;
    onChange(next);
  };
  const updateTouchpoint = (si: number, ti: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.stages[si].touchpoints[ti][field] = value;
    onChange(next);
  };
  const updateListItem = (si: number, field: string, idx: number, value: string) => {
    const next = structuredClone(data);
    next.stages[si][field][idx] = value;
    onChange(next);
  };
  const removeListItem = (si: number, field: string, idx: number) => {
    const next = structuredClone(data);
    next.stages[si][field].splice(idx, 1);
    onChange(next);
  };
  const addListItem = (si: number, field: string) => {
    const next = structuredClone(data);
    if (!next.stages[si][field]) next.stages[si][field] = [];
    next.stages[si][field].push("");
    onChange(next);
  };
  const removeTouchpoint = (si: number, ti: number) => {
    const next = structuredClone(data);
    next.stages[si].touchpoints.splice(ti, 1);
    onChange(next);
  };
  const addTouchpoint = (si: number) => {
    const next = structuredClone(data);
    if (!next.stages[si].touchpoints) next.stages[si].touchpoints = [];
    next.stages[si].touchpoints.push({ channel: "", action: "", content: "", gap: null });
    onChange(next);
  };
  const addStage = () => {
    const next = structuredClone(data);
    next.stages.push({ name: "", customerMindset: "", questions: [], touchpoints: [], kpis: [], opportunities: [] });
    onChange(next);
  };
  const removeStage = (idx: number) => {
    const next = structuredClone(data);
    next.stages.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="space-y-4 mt-3">
      {stages.map((s: any, i: number) => (
        <div key={i} className="border border-border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            <EditInput value={s.name} onChange={(v) => update(i, "name", v)} className="flex-1 font-semibold" placeholder="Stage name" />
            <RemoveBtn onClick={() => removeStage(i)} />
          </div>
          <EditInput value={s.customerMindset} onChange={(v) => update(i, "customerMindset", v)} className="w-full italic" placeholder="Customer mindset" />

          {/* Questions */}
          <div>
            <span className="text-[10px] font-semibold text-dim uppercase">Questions</span>
            {(s.questions || []).map((q: string, j: number) => (
              <div key={j} className="flex items-center gap-1 mt-1">
                <EditInput value={q} onChange={(v) => updateListItem(i, "questions", j, v)} className="flex-1 text-xs" />
                <RemoveBtn onClick={() => removeListItem(i, "questions", j)} />
              </div>
            ))}
            <AddBtn onClick={() => addListItem(i, "questions")} label="Add question" />
          </div>

          {/* Touchpoints */}
          <div>
            <span className="text-[10px] font-semibold text-dim uppercase">Touchpoints</span>
            {(s.touchpoints || []).map((t: any, j: number) => (
              <div key={j} className="flex items-start gap-2 mt-1 border-b border-border/20 pb-1">
                <div className="flex-1 space-y-1">
                  <div className="flex gap-2">
                    <EditInput value={t.channel} onChange={(v) => updateTouchpoint(i, j, "channel", v)} className="w-32 text-xs" placeholder="Channel" />
                    <EditInput value={t.action} onChange={(v) => updateTouchpoint(i, j, "action", v)} className="flex-1 text-xs" placeholder="Action" />
                  </div>
                  <EditInput value={t.gap || ""} onChange={(v) => updateTouchpoint(i, j, "gap", v || null)} className="w-full text-xs" placeholder="Gap (optional)" />
                </div>
                <RemoveBtn onClick={() => removeTouchpoint(i, j)} />
              </div>
            ))}
            <AddBtn onClick={() => addTouchpoint(i)} label="Add touchpoint" />
          </div>

          {/* Opportunities */}
          <div>
            <span className="text-[10px] font-semibold text-dim uppercase">Opportunities</span>
            {(s.opportunities || []).map((o: string, j: number) => (
              <div key={j} className="flex items-center gap-1 mt-1">
                <EditInput value={o} onChange={(v) => updateListItem(i, "opportunities", j, v)} className="flex-1 text-xs" />
                <RemoveBtn onClick={() => removeListItem(i, "opportunities", j)} />
              </div>
            ))}
            <AddBtn onClick={() => addListItem(i, "opportunities")} label="Add opportunity" />
          </div>
        </div>
      ))}
      <AddBtn onClick={addStage} label="Add stage" />
    </div>
  );
}

// ── 12-Month Content Plan Editor ──────────────────────────

function ContentPlanEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const quarters = data?.quarters || [];
  const updateMonth = (qi: number, mi: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.quarters[qi].months[mi][field] = value;
    onChange(next);
  };
  const updateContent = (qi: number, mi: number, ci: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.quarters[qi].months[mi].content[ci][field] = value;
    onChange(next);
  };
  const removeContent = (qi: number, mi: number, ci: number) => {
    const next = structuredClone(data);
    next.quarters[qi].months[mi].content.splice(ci, 1);
    onChange(next);
  };
  const addContent = (qi: number, mi: number) => {
    const next = structuredClone(data);
    next.quarters[qi].months[mi].content.push({ title: "", type: "blog", channel: "Website", pillar: "", brief: "", cta: "" });
    onChange(next);
  };
  const updateQuarter = (qi: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.quarters[qi][field] = value;
    onChange(next);
  };

  return (
    <div className="space-y-4 mt-3">
      {quarters.map((q: any, qi: number) => (
        <div key={qi} className="border border-border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-accent">{q.quarter}</span>
            <EditInput value={q.theme} onChange={(v) => updateQuarter(qi, "theme", v)} className="flex-1" placeholder="Quarterly theme" />
          </div>
          {(q.months || []).map((m: any, mi: number) => (
            <div key={mi} className="pl-2 border-l-2 border-border ml-2 space-y-1.5 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent">{m.month}</span>
                <EditInput value={m.focus} onChange={(v) => updateMonth(qi, mi, "focus", v)} className="flex-1 text-xs" placeholder="Monthly focus" />
              </div>
              {(m.content || []).map((c: any, ci: number) => (
                <div key={ci} className="flex items-start gap-2 py-0.5">
                  <div className="flex-1 space-y-1">
                    <EditInput value={c.title} onChange={(v) => updateContent(qi, mi, ci, "title", v)} className="w-full text-xs" placeholder="Content title" />
                    <div className="flex gap-2">
                      <select value={c.type || "blog"} onChange={(e) => updateContent(qi, mi, ci, "type", e.target.value)}
                        className="bg-surface border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground">
                        {["blog", "social_series", "email_sequence", "video", "guide", "landing_page", "gbp_post"].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <EditInput value={c.channel} onChange={(v) => updateContent(qi, mi, ci, "channel", v)} className="w-24 text-[10px]" placeholder="Channel" />
                      <EditInput value={c.pillar} onChange={(v) => updateContent(qi, mi, ci, "pillar", v)} className="flex-1 text-[10px]" placeholder="Pillar" />
                    </div>
                  </div>
                  <RemoveBtn onClick={() => removeContent(qi, mi, ci)} />
                </div>
              ))}
              <AddBtn onClick={() => addContent(qi, mi)} label="Add content" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── 90-Day Sprint Editor ──────────────────────────────────

function SprintEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const weeks = data?.weeks || [];
  const updateWeek = (wi: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.weeks[wi][field] = value;
    onChange(next);
  };
  const updateTask = (wi: number, ti: number, field: string, value: any) => {
    const next = structuredClone(data);
    next.weeks[wi].tasks[ti][field] = value;
    onChange(next);
  };
  const removeTask = (wi: number, ti: number) => {
    const next = structuredClone(data);
    next.weeks[wi].tasks.splice(ti, 1);
    onChange(next);
  };
  const addTask = (wi: number) => {
    const next = structuredClone(data);
    next.weeks[wi].tasks.push({ task: "", owner: "agency", category: "strategy", priority: "medium", deliverable: "" });
    onChange(next);
  };
  const addWeek = () => {
    const next = structuredClone(data);
    const nextNum = weeks.length > 0 ? Math.max(...weeks.map((w: any) => w.week)) + 1 : 1;
    next.weeks.push({ week: nextNum, phase: "Growth", theme: "", tasks: [] });
    onChange(next);
  };
  const removeWeek = (wi: number) => {
    const next = structuredClone(data);
    next.weeks.splice(wi, 1);
    onChange(next);
  };

  return (
    <div className="space-y-2 mt-3">
      {weeks.map((w: any, wi: number) => (
        <div key={wi} className="flex gap-3 py-2 border-b border-border/30">
          <div className="w-14 shrink-0 text-center space-y-1">
            <div className="text-xs font-bold text-foreground">Wk {w.week}</div>
            <select value={w.phase || "Foundation"} onChange={(e) => updateWeek(wi, "phase", e.target.value)}
              className="bg-surface border border-border rounded text-[8px] px-0.5 py-0.5 w-full text-foreground">
              {["Foundation", "Launch", "Optimization", "Growth"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={() => removeWeek(wi)} className="text-destructive/60 hover:text-destructive"><Trash2 className="h-2.5 w-2.5 mx-auto" /></button>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <EditInput value={w.theme} onChange={(v) => updateWeek(wi, "theme", v)} className="w-full text-xs font-semibold" placeholder="Week theme" />
            {(w.tasks || []).map((t: any, ti: number) => (
              <div key={ti} className="flex items-start gap-2 text-xs">
                <div className="flex-1 space-y-0.5">
                  <EditInput value={t.task} onChange={(v) => updateTask(wi, ti, "task", v)} className="w-full text-xs" placeholder="Task" />
                  <div className="flex gap-2">
                    <select value={t.owner || "agency"} onChange={(e) => updateTask(wi, ti, "owner", e.target.value)}
                      className="bg-surface border border-border rounded px-1 py-0.5 text-[10px] text-foreground">
                      {["agency", "client", "both"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select value={t.category || "strategy"} onChange={(e) => updateTask(wi, ti, "category", e.target.value)}
                      className="bg-surface border border-border rounded px-1 py-0.5 text-[10px] text-foreground">
                      {["seo", "content", "social", "ads", "website", "reputation", "strategy"].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={t.priority || "medium"} onChange={(e) => updateTask(wi, ti, "priority", e.target.value)}
                      className="bg-surface border border-border rounded px-1 py-0.5 text-[10px] text-foreground">
                      {["critical", "high", "medium"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <RemoveBtn onClick={() => removeTask(wi, ti)} />
              </div>
            ))}
            <AddBtn onClick={() => addTask(wi)} label="Add task" />
          </div>
        </div>
      ))}
      <AddBtn onClick={addWeek} label="Add week" />
    </div>
  );
}
