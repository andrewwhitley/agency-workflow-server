import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Campaign {
  id: number; campaignName: string; campaignType: string | null; status: string;
  platforms: string | null; durationType: string | null; servicesPromoted: string | null;
  usps: string | null; demographicsGender: string | null; demographicsAge: string | null;
  demographicsLocation: string | null; demographicsInterests: string | null;
  demographicsLanguages: string | null; audienceTargeting: string | null;
  geoTargeting: string | null; adTypes: string | null; creativeStyle: string | null;
  ctas: string | null; budget: number | null; dailyBudget: number | null;
  totalBudget: number | null; startDate: string | null; endDate: string | null;
  expectedOutcomes: string | null; notes: string | null; adAccountsSetup: string | null;
  monthlyBudgetPerNetwork: string | null; optimizationGoals: string | null;
  leadCloseRate: number | null; ctaTypes: string | null; leadFormTypes: string | null;
  qualifyingQuestions: string | null; offers: string | null; uniqueDifferentiators: string | null;
}

interface Deliverable {
  id: number; campaignId: number; title: string; deliverableType: string;
  status: string; priority: string; description: string | null;
  assignedTo: string | null; dueDate: string | null; notes: string | null;
}

const emptyCampaign = (): Partial<Campaign> => ({
  campaignName: "", campaignType: "", status: "planning", platforms: "",
  durationType: "ongoing", budget: null, dailyBudget: null, totalBudget: null,
  servicesPromoted: "", usps: "", demographicsGender: "", demographicsAge: "",
  demographicsLocation: "", demographicsInterests: "", demographicsLanguages: "",
  audienceTargeting: "", geoTargeting: "", adTypes: "", creativeStyle: "",
  ctas: "", startDate: "", endDate: "", expectedOutcomes: "", notes: "",
  adAccountsSetup: "", monthlyBudgetPerNetwork: "", optimizationGoals: "",
  leadCloseRate: null, ctaTypes: "", leadFormTypes: "", qualifyingQuestions: "",
  offers: "", uniqueDifferentiators: "",
});

const emptyDeliverable = (): Partial<Deliverable> => ({
  title: "", deliverableType: "other", status: "not_started", priority: "medium",
  description: "", assignedTo: "", dueDate: "", notes: "",
});

const statusColor = (s: string) =>
  s === "active" ? "bg-success/10 text-success" :
  s === "paused" ? "bg-warning/10 text-warning" :
  s === "completed" ? "bg-accent/10 text-accent" : "bg-surface-2 text-dim";

const delStatusColor = (s: string) =>
  s === "completed" || s === "live" ? "bg-success" :
  s === "in_progress" || s === "in_review" ? "bg-accent" :
  s === "revision" ? "bg-warning" : "bg-dim";

export function CampaignsSection({ clientId }: { clientId: number }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  // Campaign CRUD
  const [camDialogOpen, setCamDialogOpen] = useState(false);
  const [camForm, setCamForm] = useState<Partial<Campaign>>(emptyCampaign());
  const [editingCamId, setEditingCamId] = useState<number | null>(null);
  const [deleteCamId, setDeleteCamId] = useState<number | null>(null);
  const [camPending, setCamPending] = useState(false);

  // Deliverable CRUD
  const [delDialogOpen, setDelDialogOpen] = useState(false);
  const [delForm, setDelForm] = useState<Partial<Deliverable> & { campaignId?: number }>(emptyDeliverable());
  const [editingDelId, setEditingDelId] = useState<number | null>(null);
  const [deleteDelId, setDeleteDelId] = useState<number | null>(null);
  const [delPending, setDelPending] = useState(false);

  const reload = useCallback(() => {
    Promise.all([
      api<Campaign[]>(`/cm/campaigns?clientId=${clientId}`).catch(() => []),
      api<Deliverable[]>(`/cm/clients/${clientId}/campaign-deliverables`).catch(() => []),
    ]).then(([c, d]) => { setCampaigns(c); setDeliverables(d); })
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const toggle = (id: number) => setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Campaign handlers
  const openAddCam = () => { setCamForm(emptyCampaign()); setEditingCamId(null); setCamDialogOpen(true); };
  const openEditCam = (c: Campaign) => { setCamForm({ ...c }); setEditingCamId(c.id); setCamDialogOpen(true); };
  const submitCam = async () => {
    setCamPending(true);
    try {
      const body = { ...camForm, clientId };
      if (editingCamId) {
        await api(`/cm/campaigns/${editingCamId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api(`/cm/campaigns`, { method: "POST", body: JSON.stringify(body) });
      }
      setCamDialogOpen(false);
      reload();
    } catch (e) { console.error(e); }
    setCamPending(false);
  };
  const deleteCam = async () => {
    if (!deleteCamId) return;
    setCamPending(true);
    try { await api(`/cm/campaigns/${deleteCamId}`, { method: "DELETE" }); setDeleteCamId(null); reload(); } catch (e) { console.error(e); }
    setCamPending(false);
  };

  // Deliverable handlers
  const openAddDel = (campaignId: number) => { setDelForm({ ...emptyDeliverable(), campaignId }); setEditingDelId(null); setDelDialogOpen(true); };
  const openEditDel = (d: Deliverable) => { setDelForm({ ...d }); setEditingDelId(d.id); setDelDialogOpen(true); };
  const submitDel = async () => {
    setDelPending(true);
    try {
      if (editingDelId) {
        await api(`/cm/campaign-deliverables/${editingDelId}`, { method: "PUT", body: JSON.stringify(delForm) });
      } else {
        await api(`/cm/clients/${clientId}/campaign-deliverables`, { method: "POST", body: JSON.stringify(delForm) });
      }
      setDelDialogOpen(false);
      reload();
    } catch (e) { console.error(e); }
    setDelPending(false);
  };
  const deleteDel = async () => {
    if (!deleteDelId) return;
    setDelPending(true);
    try { await api(`/cm/campaign-deliverables/${deleteDelId}`, { method: "DELETE" }); setDeleteDelId(null); reload(); } catch (e) { console.error(e); }
    setDelPending(false);
  };

  const updCam = (k: string, v: unknown) => setCamForm((p) => ({ ...p, [k]: v }));
  const updDel = (k: string, v: unknown) => setDelForm((p) => ({ ...p, [k]: v }));

  if (loading) return <div className="text-sm text-muted">Loading campaigns...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Campaigns</h3>
        <Button size="sm" variant="outline" onClick={openAddCam}><Plus className="h-3 w-3 mr-1" /> Add Campaign</Button>
      </div>

      {campaigns.length === 0 && <div className="text-muted text-sm">No campaigns yet.</div>}

      {campaigns.map((c) => {
        const isOpen = expanded.has(c.id);
        const camDels = deliverables.filter((d) => d.campaignId === c.id);
        return (
          <div key={c.id} className="bg-surface border border-border rounded-md">
            <div className="flex items-center justify-between p-4">
              <button onClick={() => toggle(c.id)} className="flex-1 text-left flex items-start gap-3">
                <span className="mt-0.5">{isOpen ? <ChevronUp className="h-4 w-4 text-dim" /> : <ChevronDown className="h-4 w-4 text-dim" />}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">{c.campaignName}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize", statusColor(c.status))}>{c.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-dim">
                    {c.campaignType && <span className="px-2 py-0.5 rounded bg-surface-2">{c.campaignType}</span>}
                    {c.platforms && <span className="px-2 py-0.5 rounded bg-surface-2">{c.platforms}</span>}
                    {c.budget != null && <span className="px-2 py-0.5 rounded bg-surface-2">${c.budget}</span>}
                    {camDels.length > 0 && <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">{camDels.length} deliverable{camDels.length !== 1 ? "s" : ""}</span>}
                  </div>
                </div>
              </button>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditCam(c)}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteCamId(c.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>

            {isOpen && (
              <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                {/* Campaign details grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                  {[
                    { l: "Type", v: c.campaignType }, { l: "Platforms", v: c.platforms },
                    { l: "Duration", v: c.durationType }, { l: "Budget", v: c.budget ? `$${c.budget}` : null },
                    { l: "Daily Budget", v: c.dailyBudget ? `$${c.dailyBudget}` : null },
                    { l: "Total Budget", v: c.totalBudget ? `$${c.totalBudget}` : null },
                    { l: "Start Date", v: c.startDate }, { l: "End Date", v: c.endDate },
                    { l: "Services Promoted", v: c.servicesPromoted }, { l: "USPs", v: c.usps },
                    { l: "Audience Targeting", v: c.audienceTargeting }, { l: "Geo Targeting", v: c.geoTargeting },
                    { l: "Gender", v: c.demographicsGender }, { l: "Age", v: c.demographicsAge },
                    { l: "Location", v: c.demographicsLocation }, { l: "Interests", v: c.demographicsInterests },
                    { l: "Ad Types", v: c.adTypes }, { l: "Creative Style", v: c.creativeStyle },
                    { l: "CTAs", v: c.ctas }, { l: "Expected Outcomes", v: c.expectedOutcomes },
                    { l: "Optimization Goals", v: c.optimizationGoals },
                    { l: "Ad Accounts Setup", v: c.adAccountsSetup },
                    { l: "Lead Close Rate", v: c.leadCloseRate ? `${c.leadCloseRate}%` : null },
                  ].filter((f) => f.v).map((f) => (
                    <div key={f.l}><div className="text-xs text-dim">{f.l}</div><div className="text-sm text-foreground whitespace-pre-wrap">{f.v}</div></div>
                  ))}
                </div>
                {c.notes && <div className="text-xs text-muted">{c.notes}</div>}

                {/* Deliverables */}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Deliverables</span>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => openAddDel(c.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {camDels.length === 0 ? (
                    <div className="text-xs text-dim">No deliverables yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {camDels.map((d) => (
                        <div key={d.id} className="flex items-center justify-between bg-surface-2 rounded-md px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", delStatusColor(d.status))} />
                            <span className="text-sm text-foreground truncate">{d.title}</span>
                            <span className="text-xs text-dim shrink-0">({d.deliverableType})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {d.assignedTo && <span className="text-xs text-muted">{d.assignedTo}</span>}
                            {d.dueDate && <span className="text-xs text-dim">{d.dueDate.split("T")[0]}</span>}
                            <span className={cn("text-xs px-2 py-0.5 rounded capitalize",
                              d.status === "completed" || d.status === "live" ? "bg-success/10 text-success" :
                              d.status === "in_progress" ? "bg-accent/10 text-accent" : "bg-surface text-dim"
                            )}>{d.status.replace(/_/g, " ")}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditDel(d)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteDelId(d.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Campaign form dialog */}
      <FormDialog open={camDialogOpen} onOpenChange={setCamDialogOpen}
        title={editingCamId ? "Edit Campaign" : "Add Campaign"} onSubmit={submitCam} isPending={camPending} wide>
        <FormField label="Campaign Name" value={camForm.campaignName || ""} onChange={(v) => updCam("campaignName", v)} required />
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Type" value={camForm.campaignType || ""} onChange={(v) => updCam("campaignType", v)} placeholder="e.g. PPC, Social, SEO" />
          <FormField label="Status" value={camForm.status || "planning"} onChange={(v) => updCam("status", v)} placeholder="planning, active, paused, completed" />
          <FormField label="Duration Type" value={camForm.durationType || "ongoing"} onChange={(v) => updCam("durationType", v)} placeholder="ongoing or short_term" />
        </div>
        <FormField label="Platforms" value={camForm.platforms || ""} onChange={(v) => updCam("platforms", v)} placeholder="e.g. Google Ads, Meta, LinkedIn" />
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Monthly Budget" type="number" value={camForm.budget?.toString() || ""} onChange={(v) => updCam("budget", v ? parseFloat(v) : null)} />
          <FormField label="Daily Budget" type="number" value={camForm.dailyBudget?.toString() || ""} onChange={(v) => updCam("dailyBudget", v ? parseFloat(v) : null)} />
          <FormField label="Total Budget" type="number" value={camForm.totalBudget?.toString() || ""} onChange={(v) => updCam("totalBudget", v ? parseFloat(v) : null)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date" value={camForm.startDate || ""} onChange={(v) => updCam("startDate", v)} placeholder="YYYY-MM-DD" />
          <FormField label="End Date" value={camForm.endDate || ""} onChange={(v) => updCam("endDate", v)} placeholder="YYYY-MM-DD" />
        </div>
        <FormField label="Services Promoted" type="textarea" value={camForm.servicesPromoted || ""} onChange={(v) => updCam("servicesPromoted", v)} rows={2} />
        <FormField label="USPs" type="textarea" value={camForm.usps || ""} onChange={(v) => updCam("usps", v)} rows={2} />
        <h4 className="text-sm font-semibold text-foreground pt-2 border-t border-input">Demographics & Targeting</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Gender" value={camForm.demographicsGender || ""} onChange={(v) => updCam("demographicsGender", v)} />
          <FormField label="Age Range" value={camForm.demographicsAge || ""} onChange={(v) => updCam("demographicsAge", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Location" value={camForm.demographicsLocation || ""} onChange={(v) => updCam("demographicsLocation", v)} />
          <FormField label="Interests" value={camForm.demographicsInterests || ""} onChange={(v) => updCam("demographicsInterests", v)} />
        </div>
        <FormField label="Languages" value={camForm.demographicsLanguages || ""} onChange={(v) => updCam("demographicsLanguages", v)} />
        <FormField label="Audience Targeting" type="textarea" value={camForm.audienceTargeting || ""} onChange={(v) => updCam("audienceTargeting", v)} rows={2} />
        <FormField label="Geo Targeting" type="textarea" value={camForm.geoTargeting || ""} onChange={(v) => updCam("geoTargeting", v)} rows={2} />
        <h4 className="text-sm font-semibold text-foreground pt-2 border-t border-input">Creative & Strategy</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Ad Types" value={camForm.adTypes || ""} onChange={(v) => updCam("adTypes", v)} />
          <FormField label="Creative Style" value={camForm.creativeStyle || ""} onChange={(v) => updCam("creativeStyle", v)} />
        </div>
        <FormField label="CTAs" type="textarea" value={camForm.ctas || ""} onChange={(v) => updCam("ctas", v)} rows={2} />
        <FormField label="CTA Types" value={camForm.ctaTypes || ""} onChange={(v) => updCam("ctaTypes", v)} />
        <FormField label="Lead Form Types" value={camForm.leadFormTypes || ""} onChange={(v) => updCam("leadFormTypes", v)} />
        <FormField label="Qualifying Questions" type="textarea" value={camForm.qualifyingQuestions || ""} onChange={(v) => updCam("qualifyingQuestions", v)} rows={2} />
        <FormField label="Offers & Pricing" type="textarea" value={camForm.offers || ""} onChange={(v) => updCam("offers", v)} rows={2} />
        <FormField label="Unique Differentiators" type="textarea" value={camForm.uniqueDifferentiators || ""} onChange={(v) => updCam("uniqueDifferentiators", v)} rows={2} />
        <h4 className="text-sm font-semibold text-foreground pt-2 border-t border-input">Performance</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Lead Close Rate (%)" type="number" value={camForm.leadCloseRate?.toString() || ""} onChange={(v) => updCam("leadCloseRate", v ? parseFloat(v) : null)} />
          <FormField label="Ad Accounts Setup" value={camForm.adAccountsSetup || ""} onChange={(v) => updCam("adAccountsSetup", v)} placeholder="yes, no, partial" />
        </div>
        <FormField label="Budget Breakdown by Network" type="textarea" value={camForm.monthlyBudgetPerNetwork || ""} onChange={(v) => updCam("monthlyBudgetPerNetwork", v)} rows={2} />
        <FormField label="Optimization Goals" type="textarea" value={camForm.optimizationGoals || ""} onChange={(v) => updCam("optimizationGoals", v)} rows={2} />
        <FormField label="Expected Outcomes" type="textarea" value={camForm.expectedOutcomes || ""} onChange={(v) => updCam("expectedOutcomes", v)} rows={2} />
        <FormField label="Notes" type="textarea" value={camForm.notes || ""} onChange={(v) => updCam("notes", v)} rows={2} />
      </FormDialog>

      {/* Deliverable form dialog */}
      <FormDialog open={delDialogOpen} onOpenChange={setDelDialogOpen}
        title={editingDelId ? "Edit Deliverable" : "Add Deliverable"} onSubmit={submitDel} isPending={delPending}>
        <FormField label="Title" value={delForm.title || ""} onChange={(v) => updDel("title", v)} required />
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Type" value={delForm.deliverableType || "other"} onChange={(v) => updDel("deliverableType", v)} placeholder="report, creative, copy, etc." />
          <FormField label="Status" value={delForm.status || "not_started"} onChange={(v) => updDel("status", v)} placeholder="not_started, in_progress, etc." />
          <FormField label="Priority" value={delForm.priority || "medium"} onChange={(v) => updDel("priority", v)} placeholder="low, medium, high" />
        </div>
        <FormField label="Assigned To" value={delForm.assignedTo || ""} onChange={(v) => updDel("assignedTo", v)} />
        <FormField label="Due Date" value={delForm.dueDate || ""} onChange={(v) => updDel("dueDate", v)} placeholder="YYYY-MM-DD" />
        <FormField label="Description" type="textarea" value={delForm.description || ""} onChange={(v) => updDel("description", v)} />
        <FormField label="Notes" type="textarea" value={delForm.notes || ""} onChange={(v) => updDel("notes", v)} />
      </FormDialog>

      {/* Delete confirmations */}
      <ConfirmDialog open={deleteCamId !== null} onOpenChange={() => setDeleteCamId(null)}
        title="Delete Campaign" description="This will permanently delete this campaign and all its deliverables."
        onConfirm={deleteCam} isPending={camPending} />
      <ConfirmDialog open={deleteDelId !== null} onOpenChange={() => setDeleteDelId(null)}
        title="Delete Deliverable" description="This will permanently delete this deliverable."
        onConfirm={deleteDel} isPending={delPending} />
    </div>
  );
}
