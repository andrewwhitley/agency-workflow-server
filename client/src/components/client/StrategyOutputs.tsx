import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sparkles, RefreshCw, ChevronDown, ChevronRight, Layers, Map, Calendar, Rocket,
  Target, FileText, Video, Mail, Globe, MessageSquare, ArrowRight,
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

  const reload = useCallback(() => {
    api<StrategyData | null>(`/cm/clients/${clientId}/strategy`)
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const generate = async (component: string) => {
    setGenerating(component);
    try {
      await api(`/cm/clients/${clientId}/strategy/generate`, {
        method: "POST", body: JSON.stringify({ component }),
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

        return (
          <div key={comp.key} className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div
              className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors", hasData && "bg-surface")}
              onClick={() => hasData && toggle(comp.key)}
            >
              <Icon className={cn("h-4 w-4 shrink-0", hasData ? "text-accent" : "text-dim")} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{comp.label}</span>
                  {hasData && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">Generated</span>}
                </div>
                {!hasData && <p className="text-xs text-dim mt-0.5">{comp.desc}</p>}
              </div>
              {hasData ? (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); generate(comp.key); }} disabled={!!generating}>
                    <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                  </Button>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
                </div>
              ) : (
                <Button size="sm" onClick={() => generate(comp.key)} disabled={!!generating}>
                  {isGenerating ? (
                    <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="h-3 w-3 mr-1.5" /> Generate</>
                  )}
                </Button>
              )}
            </div>

            {/* Expanded Content */}
            {hasData && isExpanded && (
              <div className="px-4 pb-4 border-t border-border">
                {comp.key === "pillars" && <PillarsView data={(data as any)[comp.dbKey]} />}
                {comp.key === "journey" && <JourneyView data={(data as any)[comp.dbKey]} />}
                {comp.key === "plan" && <ContentPlanView data={(data as any)[comp.dbKey]} />}
                {comp.key === "sprint" && <SprintView data={(data as any)[comp.dbKey]} />}
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
