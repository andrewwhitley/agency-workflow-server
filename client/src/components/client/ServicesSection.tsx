import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Check, X, ArrowUp, ArrowDown, Sparkles } from "lucide-react";

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
  tier: string | null;
  providerIds: number[];
}

interface TeamMember {
  id: number; fullName: string; role: string | null;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  primary: { label: "Primary", color: "text-green-400", bg: "bg-green-500/10 text-green-400 border-green-500/20" },
  secondary: { label: "Secondary", color: "text-blue-400", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  complementary: { label: "Complementary", color: "text-dim", bg: "bg-surface-2 text-dim border-border" },
};

interface ServiceArea {
  id: number; targetCities: string | null; targetCounties: string | null; notes: string | null;
}

const emptyService = (): Partial<Service> => ({
  category: "", serviceName: "", offered: true, price: null, duration: "",
  description: "", descriptionLong: "", idealPatientProfile: "", goodFitCriteria: "",
  notGoodFitCriteria: "", targetAgeRange: "", targetGender: "", targetConditions: "",
  targetInterests: "", serviceAreaCities: "", differentiators: "", expectedOutcomes: "",
  commonConcerns: "", parentServiceId: null, sortOrder: 0, notes: "",
  tier: "primary", providerIds: [],
});

const emptyServiceArea = (): Partial<ServiceArea> => ({
  targetCities: "", targetCounties: "", notes: "",
});

export function ServicesSection({ clientId }: { clientId: number }) {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [savedCategoryOrder, setSavedCategoryOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<number | null>(null);

  // Category management state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryValue, setNewCategoryValue] = useState("");
  const [deleteCategoryName, setDeleteCategoryName] = useState<string | null>(null);
  const [categoryPending, setCategoryPending] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [svcDialogOpen, setSvcDialogOpen] = useState(false);
  const [svcForm, setSvcForm] = useState<Partial<Service>>(emptyService());
  const [editingSvcId, setEditingSvcId] = useState<number | null>(null);
  const [deleteSvcId, setDeleteSvcId] = useState<number | null>(null);
  const [svcPending, setSvcPending] = useState(false);
  const [populatePending, setPopulatePending] = useState(false);
  const [populateError, setPopulateError] = useState<string | null>(null);

  const [saDialogOpen, setSaDialogOpen] = useState(false);
  const [saForm, setSaForm] = useState<Partial<ServiceArea>>(emptyServiceArea());
  const [editingSaId, setEditingSaId] = useState<number | null>(null);
  const [deleteSaId, setDeleteSaId] = useState<number | null>(null);
  const [saPending, setSaPending] = useState(false);

  const reload = useCallback(() => {
    Promise.all([
      api<Service[]>(`/cm/clients/${clientId}/services`).catch(() => []),
      api<ServiceArea[]>(`/cm/clients/${clientId}/service-areas`).catch(() => []),
      api<TeamMember[]>(`/cm/clients/${clientId}/team-members`).catch(() => []),
      api<{ serviceCategoryOrder?: string[] }>(`/cm/clients/${clientId}`).catch(() => ({})),
    ]).then(([svc, sa, tm, clientData]) => {
      setServices(svc);
      setServiceAreas(sa);
      setTeamMembers(tm);
      setSavedCategoryOrder(clientData?.serviceCategoryOrder || []);
    }).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const openAddService = (parentId?: number, category?: string) => {
    setSvcForm({ ...emptyService(), parentServiceId: parentId || null, category: category || "" });
    setEditingSvcId(null);
    setSvcDialogOpen(true);
  };
  const openEditService = (s: Service) => {
    // Ensure all string fields default to "" and providerIds to [] to prevent render crashes
    const safe: Partial<Service> = { ...s };
    for (const key of Object.keys(safe) as (keyof Service)[]) {
      if (safe[key] === null || safe[key] === undefined) {
        if (key === "providerIds") {
          (safe as Record<string, unknown>)[key] = [];
        } else if (key !== "id" && key !== "parentServiceId" && key !== "sortOrder" && key !== "price" && key !== "offered") {
          (safe as Record<string, unknown>)[key] = "";
        }
      }
    }
    setSvcForm(safe);
    setEditingSvcId(s.id);
    setSvcDialogOpen(true);
  };
  const [svcError, setSvcError] = useState<string | null>(null);
  const submitService = async () => {
    setSvcPending(true);
    setSvcError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(svcForm)) {
        if (["id", "clientId", "createdAt", "updatedAt", "source"].includes(k)) continue;
        if (v === undefined) continue;
        if (k === "providerIds") { payload[k] = v; continue; }
        payload[k] = v;
      }
      if (editingSvcId) {
        await api(`/cm/services/${editingSvcId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api(`/cm/clients/${clientId}/services`, { method: "POST", body: JSON.stringify(payload) });
      }
      setSvcDialogOpen(false);
      reload();
    } catch (e) {
      console.error(e);
      setSvcError(e instanceof Error ? e.message : "Failed to save");
    }
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

  const populateFromBrandStory = async () => {
    if (!svcForm.serviceName?.trim()) {
      setPopulateError("Enter a service name first");
      return;
    }
    setPopulatePending(true);
    setPopulateError(null);
    try {
      const fields = await api<Record<string, string>>(`/cm/clients/${clientId}/services/populate-from-brand-story`, {
        method: "POST",
        body: JSON.stringify({ serviceName: svcForm.serviceName, category: svcForm.category }),
      });
      // Only fill empty fields — don't overwrite existing content
      setSvcForm((prev) => {
        const updated = { ...prev };
        for (const [key, val] of Object.entries(fields)) {
          if (val && !(prev as Record<string, unknown>)[key]) {
            (updated as Record<string, unknown>)[key] = val;
          }
        }
        return updated;
      });
    } catch (e) {
      console.error(e);
      setPopulateError(e instanceof Error ? e.message : "Failed to populate");
    }
    setPopulatePending(false);
  };

  // Category operations — rename updates all services in that category
  const renameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setEditingCategory(null);
      return;
    }
    setCategoryPending(true);
    try {
      const toUpdate = services.filter((s) => s.category === oldName);
      await Promise.all(toUpdate.map((s) =>
        api(`/cm/services/${s.id}`, { method: "PUT", body: JSON.stringify({ category: newName.trim() }) })
      ));
      setEditingCategory(null);
      reload();
    } catch (e) { console.error(e); }
    setCategoryPending(false);
  };

  const saveCategoryOrder = async (order: string[]) => {
    setSavedCategoryOrder(order);
    try {
      await api(`/cm/clients/${clientId}`, {
        method: "PUT",
        body: JSON.stringify({ serviceCategoryOrder: JSON.stringify(order) }),
      });
    } catch (e) { console.error("Failed to save category order:", e); }
  };

  const addCategory = async () => {
    if (!newCategoryValue.trim()) { setAddingCategory(false); return; }
    setAddingCategory(false);
    setEmptyCategories((prev) => [...prev, newCategoryValue.trim()]);
    // Also persist the new category in the order
    const newOrder = [...savedCategoryOrder, newCategoryValue.trim()];
    await saveCategoryOrder(newOrder);
    setNewCategoryValue("");
  };

  const moveCategory = async (catName: string, direction: "up" | "down") => {
    const currentOrder = [...allCategories];
    const idx = currentOrder.indexOf(catName);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= currentOrder.length) return;
    [currentOrder[idx], currentOrder[newIdx]] = [currentOrder[newIdx], currentOrder[idx]];
    await saveCategoryOrder(currentOrder);
  };

  const deleteCategory = async (catName: string) => {
    const catServices = services.filter((s) => s.category === catName);
    if (catServices.length > 0) {
      setCategoryPending(true);
      try {
        const parentIds = new Set(catServices.map((s) => s.id));
        const subsToDelete = services.filter((s) => s.parentServiceId && parentIds.has(s.parentServiceId));
        const allToDelete = [...catServices, ...subsToDelete];
        await Promise.all(allToDelete.map((s) =>
          api(`/cm/services/${s.id}`, { method: "DELETE" })
        ));
        reload();
      } catch (e) { console.error(e); }
      setCategoryPending(false);
    }
    setEmptyCategories((prev) => prev.filter((c) => c !== catName));
    // Remove from saved order
    const newOrder = savedCategoryOrder.filter((c) => c !== catName);
    await saveCategoryOrder(newOrder);
    setDeleteCategoryName(null);
  };

  // Track categories that have been added but have no services yet
  const [emptyCategories, setEmptyCategories] = useState<string[]>([]);

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
  const serviceCategories = [...new Set(parentServices.map((s) => s.category))];
  // Merge in empty categories, dedup, then sort by saved order
  const unorderedCategories = [...new Set([...serviceCategories, ...emptyCategories])];
  const allCategories = unorderedCategories.sort((a, b) => {
    const aIdx = savedCategoryOrder.indexOf(a);
    const bIdx = savedCategoryOrder.indexOf(b);
    // Categories in savedOrder come first in their saved position; unsaved ones go to end
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
    if (aIdx >= 0) return -1;
    if (bIdx >= 0) return 1;
    return 0;
  });

  const upd = (field: string, val: unknown) => setSvcForm((p) => ({ ...p, [field]: val }));
  const updSA = (field: string, val: unknown) => setSaForm((p) => ({ ...p, [field]: val }));

  const deleteCatServiceCount = deleteCategoryName
    ? services.filter((s) => s.category === deleteCategoryName).length
    + services.filter((s) => {
        const parent = services.find((p) => p.id === s.parentServiceId);
        return parent && parent.category === deleteCategoryName;
      }).length
    : 0;

  return (
    <div className="space-y-6">
      {/* ═══ Service Categories Section ═══ */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-2.5 bg-surface cursor-pointer hover:bg-surface-2 transition-colors"
          onClick={() => setShowCategoryManager(!showCategoryManager)}
        >
          <div className="flex items-center gap-2">
            {showCategoryManager ? <ChevronDown className="h-3.5 w-3.5 text-dim" /> : <ChevronRight className="h-3.5 w-3.5 text-dim" />}
            <h3 className="text-sm font-semibold text-foreground">Service Categories</h3>
            <span className="text-[10px] text-dim">{allCategories.length} categor{allCategories.length !== 1 ? "ies" : "y"}</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setAddingCategory(true); setShowCategoryManager(true); setNewCategoryValue(""); }}>
            <Plus className="h-3 w-3 mr-1" /> Add Category
          </Button>
        </div>

        {showCategoryManager && (
          <div className="border-t border-border">
            {allCategories.length === 0 && !addingCategory && (
              <div className="px-4 py-3 text-sm text-muted">No categories yet. Add a category to get started.</div>
            )}

            {allCategories.map((cat, catIdx) => {
              const catServiceCount = services.filter((s) => s.category === cat && !s.parentServiceId).length;
              const isEditing = editingCategory === cat;

              return (
                <div key={cat} className="flex items-center gap-1 px-4 py-2 border-b border-border/50 last:border-b-0 hover:bg-surface-2/50">
                  <div className="flex flex-col shrink-0 mr-1">
                    <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => moveCategory(cat, "up")}
                      disabled={categoryPending || catIdx === 0}>
                      <ArrowUp className="h-2.5 w-2.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => moveCategory(cat, "down")}
                      disabled={categoryPending || catIdx === allCategories.length - 1}>
                      <ArrowDown className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editCategoryValue}
                        onChange={(e) => setEditCategoryValue(e.target.value)}
                        className="h-7 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameCategory(cat, editCategoryValue);
                          if (e.key === "Escape") setEditingCategory(null);
                        }}
                        disabled={categoryPending}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400" onClick={() => renameCategory(cat, editCategoryValue)} disabled={categoryPending}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingCategory(null)} disabled={categoryPending}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground flex-1">{cat}</span>
                      <span className="text-[10px] text-dim mr-2">{catServiceCount} service{catServiceCount !== 1 ? "s" : ""}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingCategory(cat); setEditCategoryValue(cat); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteCategoryName(cat)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              );
            })}

            {/* Add new category inline */}
            {addingCategory && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 last:border-b-0 bg-surface-2/30">
                <div className="w-4 shrink-0" />
                <Input
                  value={newCategoryValue}
                  onChange={(e) => setNewCategoryValue(e.target.value)}
                  placeholder="New category name"
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCategory();
                    if (e.key === "Escape") { setAddingCategory(false); setNewCategoryValue(""); }
                  }}
                />
                <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400" onClick={addCategory}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setAddingCategory(false); setNewCategoryValue(""); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Services by Category ═══ */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Services</h3>
        <Button size="sm" variant="outline" onClick={() => openAddService()}>
          <Plus className="h-3 w-3 mr-1" /> Add Service
        </Button>
      </div>

      {allCategories.length === 0 && services.length === 0 && (
        <div className="text-muted text-sm">No services added yet. Start by adding a service category above.</div>
      )}

      {/* Compact service list grouped by category */}
      {allCategories.map((cat) => {
        const catServices = parentServices.filter((s) => s.category === cat);
        return (
          <div key={cat} className="border border-border rounded-lg overflow-hidden">
            {/* Category header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-surface border-b border-border">
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">{cat}</span>
              <span className="text-[10px] text-dim">{catServices.length} service{catServices.length !== 1 ? "s" : ""}</span>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-dim hover:text-foreground" onClick={() => openAddService(undefined, cat)}>
                <Plus className="h-3 w-3 mr-0.5" /> Add
              </Button>
            </div>

            {catServices.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted italic">No services in this category yet.</div>
            )}

            {/* Service rows */}
            {catServices.map((s) => {
              const isExpanded = expandedService === s.id;
              const subs = services.filter((sub) => sub.parentServiceId === s.id);
              const hasDetails = s.description || s.descriptionLong || s.idealPatientProfile || s.differentiators || s.expectedOutcomes || s.commonConcerns || subs.length > 0;

              return (
                <div key={s.id} className={cn(
                  "border-b border-border/50 last:border-b-0",
                  !s.offered && "opacity-50",
                  s.tier === "primary" && "border-l-2 border-l-green-500",
                  s.tier === "complementary" && "opacity-60",
                )}>
                  {/* Compact row */}
                  <div className={cn("flex items-center px-4 py-2 hover:bg-surface-2 transition-colors", s.tier === "primary" && "py-3")}>
                    {hasDetails ? (
                      <button onClick={() => setExpandedService(isExpanded ? null : s.id)} className="mr-2 text-dim">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <div className="w-[22px] mr-2" />
                    )}
                    <span className={cn(
                      "flex-1",
                      s.offered ? "text-foreground" : "text-dim line-through",
                      s.tier === "primary" ? "text-sm font-semibold" : "text-sm",
                    )}>{s.serviceName}</span>
                    {s.tier && TIER_CONFIG[s.tier] && s.tier !== "primary" && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border mr-2", TIER_CONFIG[s.tier].bg)}>{TIER_CONFIG[s.tier].label}</span>
                    )}
                    {s.providerIds?.length > 0 && (
                      <span className="text-[10px] text-dim mr-2">{s.providerIds.map((id) => teamMembers.find((t) => t.id === id)?.fullName?.split(" ")[0]).filter(Boolean).join(", ")}</span>
                    )}
                    {s.duration && <span className="text-xs text-dim mr-3">{s.duration}</span>}
                    {s.price != null && <span className="text-xs font-medium text-foreground mr-3">${s.price}</span>}
                    {!s.offered && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-dim mr-2">Not offered</span>}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditService(s)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteSvcId(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 ml-[22px] mr-4 border-t border-border/30 space-y-3">
                      {(s.descriptionLong || s.description) && (
                        <p className="text-sm text-muted">{s.descriptionLong || s.description}</p>
                      )}
                      {s.idealPatientProfile && (
                        <div><div className="text-xs font-medium text-dim mb-0.5">Ideal Client</div><div className="text-sm text-foreground">{s.idealPatientProfile}</div></div>
                      )}
                      {s.differentiators && (
                        <div><div className="text-xs font-medium text-dim mb-0.5">Differentiators</div><div className="text-sm text-foreground">{s.differentiators}</div></div>
                      )}
                      {s.expectedOutcomes && (
                        <div><div className="text-xs font-medium text-dim mb-0.5">Expected Outcomes</div><div className="text-sm text-foreground">{s.expectedOutcomes}</div></div>
                      )}
                      {s.commonConcerns && (
                        <div><div className="text-xs font-medium text-dim mb-0.5">Common Concerns</div><div className="text-sm text-foreground">{s.commonConcerns}</div></div>
                      )}
                      {(s.targetAgeRange || s.targetGender || s.targetConditions) && (
                        <div className="flex flex-wrap gap-1.5">
                          {s.targetAgeRange && <span className="text-[10px] px-2 py-0.5 rounded bg-surface-2 text-dim">Age: {s.targetAgeRange}</span>}
                          {s.targetGender && <span className="text-[10px] px-2 py-0.5 rounded bg-surface-2 text-dim">{s.targetGender}</span>}
                          {s.targetConditions && <span className="text-[10px] px-2 py-0.5 rounded bg-surface-2 text-dim">{s.targetConditions}</span>}
                        </div>
                      )}
                      {subs.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-dim mb-1">Sub-Services</div>
                          <div className="space-y-1 pl-3 border-l-2 border-border">
                            {subs.map((sub) => (
                              <div key={sub.id} className="flex items-center justify-between py-1">
                                <div>
                                  <span className="text-sm text-foreground">{sub.serviceName}</span>
                                  {sub.price != null && <span className="text-xs text-dim ml-2">${sub.price}</span>}
                                </div>
                                <div className="flex gap-0.5">
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openEditService(sub)}><Pencil className="h-2.5 w-2.5" /></Button>
                                  <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => setDeleteSvcId(sub.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => openAddService(s.id, cat)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Sub-Service
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

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
      <FormDialog open={svcDialogOpen} onOpenChange={() => { setSvcDialogOpen(false); setSvcError(null); }}
        title={editingSvcId ? "Edit Service" : (svcForm.parentServiceId ? "Add Sub-Service" : "Add Service")}
        onSubmit={submitService} isPending={svcPending} wide>
        {svcError && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{svcError}</div>}
        {populateError && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{populateError}</div>}

        {/* Populate from Brand Story */}
        <div className="flex items-center gap-3 p-3 bg-surface-2/50 rounded-lg border border-border/50">
          <div className="flex-1">
            <div className="text-xs font-medium text-foreground">Auto-populate from Brand Story</div>
            <div className="text-[10px] text-dim">Fill description, ideal client, differentiators, and more from your brand story — adapted for this service</div>
          </div>
          <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1.5"
            onClick={populateFromBrandStory} disabled={populatePending || !svcForm.serviceName?.trim()}>
            <Sparkles className="h-3 w-3" />
            {populatePending ? "Generating..." : "Populate"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Service Name" value={svcForm.serviceName || ""} onChange={(v) => upd("serviceName", v)} required />
          <FormField label="Category" type="select" value={svcForm.category || ""} onChange={(v) => upd("category", v)}
            options={[
              { value: "", label: "— Select category —" },
              ...allCategories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Price" type="number" value={svcForm.price?.toString() || ""} onChange={(v) => upd("price", v ? parseFloat(v) : null)} />
          <FormField label="Duration" value={svcForm.duration || ""} onChange={(v) => upd("duration", v)} placeholder="e.g. 60 min" />
          <FormField label="Sort Order" type="number" value={svcForm.sortOrder?.toString() || "0"} onChange={(v) => upd("sortOrder", parseInt(v) || 0)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tier" type="select" value={svcForm.tier || "primary"} onChange={(v) => upd("tier", v)}
            options={[
              { value: "primary", label: "Primary — Main revenue service" },
              { value: "secondary", label: "Secondary — Supporting service" },
              { value: "complementary", label: "Complementary — Add-on service" },
            ]} />
          <FormField label="Offered" type="checkbox" checked={svcForm.offered ?? true} onChange={(v) => upd("offered", v)} />
        </div>
        {teamMembers.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Providers</div>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map((tm) => {
                const selected = (svcForm.providerIds || []).includes(tm.id);
                return (
                  <button key={tm.id} type="button"
                    onClick={() => {
                      const ids = svcForm.providerIds || [];
                      upd("providerIds", selected ? ids.filter((id) => id !== tm.id) : [...ids, tm.id]);
                    }}
                    className={cn("text-xs px-3 py-1.5 rounded-md border transition-colors",
                      selected ? "bg-accent/10 border-accent text-accent" : "border-border text-dim hover:text-foreground")}
                  >
                    {tm.fullName}{tm.role ? ` (${tm.role})` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <FormField label="Short Description" value={svcForm.description || ""} onChange={(v) => upd("description", v)} />
        <FormField label="Full Description" type="textarea" value={svcForm.descriptionLong || ""} onChange={(v) => upd("descriptionLong", v)} rows={4} />
        <FormField label="Ideal Client Profile" type="textarea" value={svcForm.idealPatientProfile || ""} onChange={(v) => upd("idealPatientProfile", v)} placeholder="Who is this service for?" rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Good Fit Criteria" type="textarea" value={svcForm.goodFitCriteria || ""} onChange={(v) => upd("goodFitCriteria", v)} rows={3} />
          <FormField label="Not a Good Fit" type="textarea" value={svcForm.notGoodFitCriteria || ""} onChange={(v) => upd("notGoodFitCriteria", v)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Target Age Range" value={svcForm.targetAgeRange || ""} onChange={(v) => upd("targetAgeRange", v)} />
          <FormField label="Target Gender" value={svcForm.targetGender || ""} onChange={(v) => upd("targetGender", v)} />
        </div>
        <FormField label="Target Conditions" type="textarea" value={svcForm.targetConditions || ""} onChange={(v) => upd("targetConditions", v)} rows={2} />
        <FormField label="Differentiators" type="textarea" value={svcForm.differentiators || ""} onChange={(v) => upd("differentiators", v)} rows={3} />
        <FormField label="Expected Outcomes" type="textarea" value={svcForm.expectedOutcomes || ""} onChange={(v) => upd("expectedOutcomes", v)} rows={3} />
        <FormField label="Common Concerns / FAQs" type="textarea" value={svcForm.commonConcerns || ""} onChange={(v) => upd("commonConcerns", v)} rows={3} />
        <FormField label="Notes" type="textarea" value={svcForm.notes || ""} onChange={(v) => upd("notes", v)} rows={2} />
      </FormDialog>

      <FormDialog open={saDialogOpen} onOpenChange={setSaDialogOpen}
        title={editingSaId ? "Edit Service Area" : "Add Service Area"}
        onSubmit={submitSA} isPending={saPending}>
        <FormField label="Target Cities" type="textarea" value={saForm.targetCities || ""} onChange={(v) => updSA("targetCities", v)} rows={3} />
        <FormField label="Target Counties" type="textarea" value={saForm.targetCounties || ""} onChange={(v) => updSA("targetCounties", v)} rows={2} />
        <FormField label="Notes" type="textarea" value={saForm.notes || ""} onChange={(v) => updSA("notes", v)} rows={2} />
      </FormDialog>

      <ConfirmDialog open={deleteSvcId !== null} onOpenChange={() => setDeleteSvcId(null)}
        title="Delete Service" description="This will permanently delete this service and any sub-services."
        onConfirm={deleteService} isPending={svcPending} />
      <ConfirmDialog open={deleteSaId !== null} onOpenChange={() => setDeleteSaId(null)}
        title="Delete Service Area" description="This will permanently delete this service area."
        onConfirm={deleteSA} isPending={saPending} />
      <ConfirmDialog open={deleteCategoryName !== null} onOpenChange={() => setDeleteCategoryName(null)}
        title="Delete Category"
        description={deleteCatServiceCount > 0
          ? `This will permanently delete the "${deleteCategoryName}" category and all ${deleteCatServiceCount} service${deleteCatServiceCount !== 1 ? "s" : ""} within it.`
          : `Delete the "${deleteCategoryName}" category?`}
        onConfirm={() => deleteCategoryName && deleteCategory(deleteCategoryName)}
        isPending={categoryPending} />
    </div>
  );
}
