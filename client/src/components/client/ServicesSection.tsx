import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Service {
  id: number; category: string; serviceName: string; offered: boolean;
  price: number | null; duration: string | null; description: string | null;
  descriptionLong: string | null; idealPatientProfile: string | null;
  goodFitCriteria: string | null; notGoodFitCriteria: string | null;
  targetAgeRange: string | null; targetGender: string | null;
  targetConditions: string | null; targetInterests: string | null;
  serviceAreaCities: string | null; differentiators: string | null;
  expectedOutcomes: string | null; commonConcerns: string | null;
  parentServiceId: number | null; sortOrder: number; notes: string | null;
}

interface ServiceArea {
  id: number; targetCities: string | null; targetCounties: string | null; notes: string | null;
}

const emptyService = (): Partial<Service> => ({
  category: "", serviceName: "", offered: true, price: null, duration: "",
  description: "", descriptionLong: "", idealPatientProfile: "", goodFitCriteria: "",
  notGoodFitCriteria: "", targetAgeRange: "", targetGender: "", targetConditions: "",
  targetInterests: "", serviceAreaCities: "", differentiators: "", expectedOutcomes: "",
  commonConcerns: "", parentServiceId: null, sortOrder: 0, notes: "",
});

const emptyServiceArea = (): Partial<ServiceArea> => ({
  targetCities: "", targetCounties: "", notes: "",
});

export function ServicesSection({ clientId }: { clientId: number }) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);

  const [svcDialogOpen, setSvcDialogOpen] = useState(false);
  const [svcForm, setSvcForm] = useState<Partial<Service>>(emptyService());
  const [editingSvcId, setEditingSvcId] = useState<number | null>(null);
  const [deleteSvcId, setDeleteSvcId] = useState<number | null>(null);
  const [svcPending, setSvcPending] = useState(false);

  const [saDialogOpen, setSaDialogOpen] = useState(false);
  const [saForm, setSaForm] = useState<Partial<ServiceArea>>(emptyServiceArea());
  const [editingSaId, setEditingSaId] = useState<number | null>(null);
  const [deleteSaId, setDeleteSaId] = useState<number | null>(null);
  const [saPending, setSaPending] = useState(false);

  const reload = useCallback(() => {
    Promise.all([
      api<Service[]>(`/cm/clients/${clientId}/services`).catch(() => []),
      api<ServiceArea[]>(`/cm/clients/${clientId}/service-areas`).catch(() => []),
    ]).then(([svc, sa]) => { setServices(svc); setServiceAreas(sa); })
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  // Service CRUD
  const openAddService = (parentId?: number) => {
    setSvcForm({ ...emptyService(), parentServiceId: parentId || null });
    setEditingSvcId(null);
    setSvcDialogOpen(true);
  };
  const openEditService = (s: Service) => {
    setSvcForm({ ...s });
    setEditingSvcId(s.id);
    setSvcDialogOpen(true);
  };
  const submitService = async () => {
    setSvcPending(true);
    try {
      if (editingSvcId) {
        await api(`/cm/services/${editingSvcId}`, { method: "PUT", body: JSON.stringify(svcForm) });
      } else {
        await api(`/cm/clients/${clientId}/services`, { method: "POST", body: JSON.stringify(svcForm) });
      }
      setSvcDialogOpen(false);
      reload();
    } catch (e) { console.error(e); }
    setSvcPending(false);
  };
  const deleteService = async () => {
    if (!deleteSvcId) return;
    setSvcPending(true);
    try {
      await api(`/cm/services/${deleteSvcId}`, { method: "DELETE" });
      setDeleteSvcId(null);
      reload();
    } catch (e) { console.error(e); }
    setSvcPending(false);
  };

  // Service Area CRUD
  const openAddSA = () => { setSaForm(emptyServiceArea()); setEditingSaId(null); setSaDialogOpen(true); };
  const openEditSA = (sa: ServiceArea) => { setSaForm({ ...sa }); setEditingSaId(sa.id); setSaDialogOpen(true); };
  const submitSA = async () => {
    setSaPending(true);
    try {
      if (editingSaId) {
        await api(`/cm/service-areas/${editingSaId}`, { method: "PUT", body: JSON.stringify(saForm) });
      } else {
        await api(`/cm/clients/${clientId}/service-areas`, { method: "POST", body: JSON.stringify(saForm) });
      }
      setSaDialogOpen(false);
      reload();
    } catch (e) { console.error(e); }
    setSaPending(false);
  };
  const deleteSA = async () => {
    if (!deleteSaId) return;
    setSaPending(true);
    try {
      await api(`/cm/service-areas/${deleteSaId}`, { method: "DELETE" });
      setDeleteSaId(null);
      reload();
    } catch (e) { console.error(e); }
    setSaPending(false);
  };

  if (loading) return <div className="text-sm text-muted">Loading services...</div>;

  const parentServices = services.filter((s) => !s.parentServiceId).sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = [...new Set(parentServices.map((s) => s.category))];

  const upd = (field: string, val: unknown) => setSvcForm((p) => ({ ...p, [field]: val }));
  const updSA = (field: string, val: unknown) => setSaForm((p) => ({ ...p, [field]: val }));

  return (
    <div className="space-y-6">
      {/* Services */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Services</h3>
        <Button size="sm" variant="outline" onClick={() => openAddService()}>
          <Plus className="h-3 w-3 mr-1" /> Add Service
        </Button>
      </div>

      {categories.length === 0 && services.length === 0 && (
        <div className="text-muted text-sm">No services added yet.</div>
      )}

      {categories.map((cat) => (
        <div key={cat} className="mb-6">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{cat}</h4>
          <div className="space-y-4">
            {parentServices.filter((s) => s.category === cat).map((s) => {
              const subs = services.filter((sub) => sub.parentServiceId === s.id).sort((a, b) => a.sortOrder - b.sortOrder);
              return (
                <div key={s.id} className={cn("border border-border rounded-md p-4", !s.offered && "opacity-50")}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={cn("text-sm font-semibold", s.offered ? "text-foreground" : "text-dim line-through")}>{s.serviceName}</span>
                      {s.duration && <span className="text-xs text-muted ml-2">({s.duration})</span>}
                      {!s.offered && <span className="text-xs px-2 py-0.5 ml-2 rounded bg-surface-2 text-dim">Not offered</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {s.price && <span className="text-sm font-medium text-foreground mr-2">${s.price}</span>}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditService(s)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteSvcId(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {(s.descriptionLong || s.description) && <p className="text-sm text-muted mb-3">{s.descriptionLong || s.description}</p>}

                  <div className="space-y-3">
                    {s.idealPatientProfile && (
                      <div>
                        <div className="text-xs font-medium text-dim mb-0.5">Ideal Patient Profile</div>
                        <div className="text-sm text-foreground whitespace-pre-wrap">{s.idealPatientProfile}</div>
                      </div>
                    )}
                    {(s.goodFitCriteria || s.notGoodFitCriteria) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {s.goodFitCriteria && <div className="bg-success/5 rounded-md p-3"><div className="text-xs font-medium text-success mb-1">Good Fit</div><div className="text-sm text-foreground whitespace-pre-wrap">{s.goodFitCriteria}</div></div>}
                        {s.notGoodFitCriteria && <div className="bg-destructive/5 rounded-md p-3"><div className="text-xs font-medium text-destructive mb-1">Not a Good Fit</div><div className="text-sm text-foreground whitespace-pre-wrap">{s.notGoodFitCriteria}</div></div>}
                      </div>
                    )}
                    {(s.targetAgeRange || s.targetGender || s.targetConditions || s.targetInterests) && (
                      <div>
                        <div className="text-xs font-medium text-dim mb-1">Target Demographics</div>
                        <div className="flex flex-wrap gap-2">
                          {s.targetAgeRange && <span className="text-xs px-2 py-1 rounded bg-surface-2 text-muted">Age: {s.targetAgeRange}</span>}
                          {s.targetGender && <span className="text-xs px-2 py-1 rounded bg-surface-2 text-muted">{s.targetGender}</span>}
                          {s.targetConditions && <span className="text-xs px-2 py-1 rounded bg-surface-2 text-muted">Conditions: {s.targetConditions}</span>}
                          {s.targetInterests && <span className="text-xs px-2 py-1 rounded bg-surface-2 text-muted">Interests: {s.targetInterests}</span>}
                        </div>
                      </div>
                    )}
                    {s.differentiators && <div><div className="text-xs font-medium text-dim mb-0.5">Differentiators</div><div className="text-sm text-foreground whitespace-pre-wrap">{s.differentiators}</div></div>}
                    {s.expectedOutcomes && <div><div className="text-xs font-medium text-dim mb-0.5">Expected Outcomes</div><div className="text-sm text-foreground whitespace-pre-wrap">{s.expectedOutcomes}</div></div>}
                    {s.commonConcerns && <div><div className="text-xs font-medium text-dim mb-0.5">Common Concerns / FAQs</div><div className="text-sm text-foreground whitespace-pre-wrap">{s.commonConcerns}</div></div>}
                    {s.serviceAreaCities && <div><div className="text-xs font-medium text-dim mb-0.5">Service Areas</div><div className="text-sm text-muted">{s.serviceAreaCities}</div></div>}
                  </div>

                  {/* Sub-services */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-dim">Sub-Services</div>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => openAddService(s.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Sub-Service
                      </Button>
                    </div>
                    {subs.length > 0 ? (
                      <div className="space-y-3 pl-3 border-l-2 border-border">
                        {subs.map((sub) => (
                          <div key={sub.id} className="flex items-start justify-between">
                            <div>
                              <span className={cn("text-sm font-medium", sub.offered ? "text-foreground" : "text-dim line-through")}>{sub.serviceName}</span>
                              {sub.duration && <span className="text-xs text-muted ml-1">({sub.duration})</span>}
                              {sub.price != null && <span className="text-xs text-muted ml-1">${sub.price}</span>}
                              {(sub.descriptionLong || sub.description) && <p className="text-xs text-muted mt-0.5">{sub.descriptionLong || sub.description}</p>}
                              {sub.idealPatientProfile && <p className="text-xs text-dim mt-0.5">Ideal for: {sub.idealPatientProfile}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditService(sub)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteSvcId(sub.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-dim pl-3">No sub-services yet.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Service Areas */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Service Areas</h3>
          <Button size="sm" variant="outline" onClick={openAddSA}>
            <Plus className="h-3 w-3 mr-1" /> Add Service Area
          </Button>
        </div>
        {serviceAreas.length === 0 ? (
          <div className="text-muted text-sm">No service areas added yet.</div>
        ) : serviceAreas.map((sa) => (
          <div key={sa.id} className="flex items-start justify-between mb-3 bg-surface-2 rounded-md p-3">
            <div className="space-y-1">
              {sa.targetCities && <div><span className="text-xs text-dim">Cities:</span> <span className="text-sm text-foreground">{sa.targetCities}</span></div>}
              {sa.targetCounties && <div><span className="text-xs text-dim">Counties:</span> <span className="text-sm text-foreground">{sa.targetCounties}</span></div>}
              {sa.notes && <div className="text-xs text-dim">{sa.notes}</div>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditSA(sa)}><Pencil className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteSaId(sa.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Service Form Dialog */}
      <FormDialog open={svcDialogOpen} onOpenChange={setSvcDialogOpen}
        title={editingSvcId ? "Edit Service" : (svcForm.parentServiceId ? "Add Sub-Service" : "Add Service")}
        onSubmit={submitService} isPending={svcPending} wide>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Service Name" value={svcForm.serviceName || ""} onChange={(v) => upd("serviceName", v)} required />
          <FormField label="Category" value={svcForm.category || ""} onChange={(v) => upd("category", v)} required placeholder="e.g. Chiropractic, Massage" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Price" type="number" value={svcForm.price?.toString() || ""} onChange={(v) => upd("price", v ? parseFloat(v) : null)} />
          <FormField label="Duration" value={svcForm.duration || ""} onChange={(v) => upd("duration", v)} placeholder="e.g. 60 min" />
          <FormField label="Sort Order" type="number" value={svcForm.sortOrder?.toString() || "0"} onChange={(v) => upd("sortOrder", parseInt(v) || 0)} />
        </div>
        <FormField label="Offered" type="checkbox" checked={svcForm.offered ?? true} onChange={(v) => upd("offered", v)} />
        <FormField label="Short Description" value={svcForm.description || ""} onChange={(v) => upd("description", v)} />
        <FormField label="Full Description" type="textarea" value={svcForm.descriptionLong || ""} onChange={(v) => upd("descriptionLong", v)} rows={4} />
        <FormField label="Ideal Patient Profile" type="textarea" value={svcForm.idealPatientProfile || ""} onChange={(v) => upd("idealPatientProfile", v)} placeholder="Who is this service for?" rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Good Fit Criteria" type="textarea" value={svcForm.goodFitCriteria || ""} onChange={(v) => upd("goodFitCriteria", v)} placeholder="Best candidates for this service" rows={3} />
          <FormField label="Not a Good Fit" type="textarea" value={svcForm.notGoodFitCriteria || ""} onChange={(v) => upd("notGoodFitCriteria", v)} placeholder="Who should look elsewhere" rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Target Age Range" value={svcForm.targetAgeRange || ""} onChange={(v) => upd("targetAgeRange", v)} placeholder="e.g. 30-55" />
          <FormField label="Target Gender" value={svcForm.targetGender || ""} onChange={(v) => upd("targetGender", v)} placeholder="e.g. Female, All" />
        </div>
        <FormField label="Target Conditions" type="textarea" value={svcForm.targetConditions || ""} onChange={(v) => upd("targetConditions", v)} placeholder="e.g. chronic pain, TMJ, hormonal imbalance" rows={2} />
        <FormField label="Target Interests" value={svcForm.targetInterests || ""} onChange={(v) => upd("targetInterests", v)} placeholder="e.g. wellness, holistic health" />
        <FormField label="Service Area Cities" value={svcForm.serviceAreaCities || ""} onChange={(v) => upd("serviceAreaCities", v)} placeholder="Cities this service targets specifically" />
        <FormField label="Differentiators" type="textarea" value={svcForm.differentiators || ""} onChange={(v) => upd("differentiators", v)} placeholder="What makes this service different from competitors?" rows={3} />
        <FormField label="Expected Outcomes" type="textarea" value={svcForm.expectedOutcomes || ""} onChange={(v) => upd("expectedOutcomes", v)} placeholder="What patients can expect" rows={3} />
        <FormField label="Common Concerns / FAQs" type="textarea" value={svcForm.commonConcerns || ""} onChange={(v) => upd("commonConcerns", v)} placeholder="Frequently asked questions or objections" rows={3} />
        <FormField label="Notes" type="textarea" value={svcForm.notes || ""} onChange={(v) => upd("notes", v)} rows={2} />
      </FormDialog>

      {/* Service Area Form Dialog */}
      <FormDialog open={saDialogOpen} onOpenChange={setSaDialogOpen}
        title={editingSaId ? "Edit Service Area" : "Add Service Area"}
        onSubmit={submitSA} isPending={saPending}>
        <FormField label="Target Cities" type="textarea" value={saForm.targetCities || ""} onChange={(v) => updSA("targetCities", v)} placeholder="List target cities" rows={3} />
        <FormField label="Target Counties" type="textarea" value={saForm.targetCounties || ""} onChange={(v) => updSA("targetCounties", v)} placeholder="List target counties" rows={2} />
        <FormField label="Notes" type="textarea" value={saForm.notes || ""} onChange={(v) => updSA("notes", v)} rows={2} />
      </FormDialog>

      {/* Delete confirmations */}
      <ConfirmDialog open={deleteSvcId !== null} onOpenChange={() => setDeleteSvcId(null)}
        title="Delete Service" description="This will permanently delete this service and any sub-services."
        onConfirm={deleteService} isPending={svcPending} />
      <ConfirmDialog open={deleteSaId !== null} onOpenChange={() => setDeleteSaId(null)}
        title="Delete Service Area" description="This will permanently delete this service area."
        onConfirm={deleteSA} isPending={saPending} />
    </div>
  );
}
