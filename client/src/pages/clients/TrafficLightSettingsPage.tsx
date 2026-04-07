import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { FormField } from "@/components/FormField";

// ── Types ──────────────────────────────────

interface Department {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Metric {
  id: number;
  departmentId: number;
  name: string;
  description: string | null;
  metricType: string;
  unit: string | null;
  greenLabel: string | null;
  yellowLabel: string | null;
  redLabel: string | null;
  sortOrder: number;
}

interface Playbook {
  id: number;
  departmentId: number;
  yellowActions: string | null;
  yellowTimeframe: string | null;
  redActions: string | null;
  redTimeframe: string | null;
  escalationContacts: string | null;
  notes: string | null;
  departmentName?: string;
}

interface Config {
  departments: Department[];
  metrics: Metric[];
  playbooks: Playbook[];
}

// ── Component ──────────────────────────────────

export function TrafficLightSettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDept, setExpandedDept] = useState<number | null>(null);

  // Department dialog
  const [deptDialog, setDeptDialog] = useState<{ isNew: boolean; id?: number } | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [deptIcon, setDeptIcon] = useState("");
  const [deptColor, setDeptColor] = useState("#3B82F6");
  const [deptSaving, setDeptSaving] = useState(false);

  // Metric dialog
  const [metricDialog, setMetricDialog] = useState<{ isNew: boolean; id?: number; departmentId: number } | null>(null);
  const [metricName, setMetricName] = useState("");
  const [metricDesc, setMetricDesc] = useState("");
  const [metricType, setMetricType] = useState("core_performance");
  const [metricUnit, setMetricUnit] = useState("");
  const [metricGreen, setMetricGreen] = useState("");
  const [metricYellow, setMetricYellow] = useState("");
  const [metricRed, setMetricRed] = useState("");
  const [metricSaving, setMetricSaving] = useState(false);

  // Playbook dialog
  const [playbookDeptId, setPlaybookDeptId] = useState<number | null>(null);
  const [pbYellowActions, setPbYellowActions] = useState("");
  const [pbYellowTimeframe, setPbYellowTimeframe] = useState("");
  const [pbRedActions, setPbRedActions] = useState("");
  const [pbRedTimeframe, setPbRedTimeframe] = useState("");
  const [pbEscalation, setPbEscalation] = useState("");
  const [pbNotes, setPbNotes] = useState("");
  const [pbSaving, setPbSaving] = useState(false);

  const reload = () => {
    api<Config>("/cm/traffic-light/config")
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const departments = config?.departments || [];
  const metrics = config?.metrics || [];
  const playbooks = config?.playbooks || [];

  // ── Department CRUD ──

  const openNewDept = () => {
    setDeptName(""); setDeptDesc(""); setDeptIcon(""); setDeptColor("#3B82F6");
    setDeptDialog({ isNew: true });
  };

  const openEditDept = (dept: Department) => {
    setDeptName(dept.name); setDeptDesc(dept.description || ""); setDeptIcon(dept.icon || ""); setDeptColor(dept.color || "#3B82F6");
    setDeptDialog({ isNew: false, id: dept.id });
  };

  const saveDept = async () => {
    if (!deptName.trim()) return;
    setDeptSaving(true);
    try {
      if (deptDialog?.isNew) {
        await api("/cm/traffic-light/departments", {
          method: "POST",
          body: JSON.stringify({ name: deptName, description: deptDesc, icon: deptIcon, color: deptColor, sortOrder: departments.length }),
        });
      } else {
        await api(`/cm/traffic-light/departments/${deptDialog!.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: deptName, description: deptDesc, icon: deptIcon, color: deptColor }),
        });
      }
      setDeptDialog(null);
      reload();
    } catch (e) { console.error(e); }
    setDeptSaving(false);
  };

  const deleteDept = async (dept: Department) => {
    if (!confirm(`Delete "${dept.name}" and all its metrics, playbooks, and health entries?`)) return;
    try {
      await api(`/cm/traffic-light/departments/${dept.id}`, { method: "DELETE" });
      reload();
    } catch (e) { console.error(e); }
  };

  // ── Metric CRUD ──

  const openNewMetric = (departmentId: number) => {
    setMetricName(""); setMetricDesc(""); setMetricType("core_performance"); setMetricUnit("");
    setMetricGreen(""); setMetricYellow(""); setMetricRed("");
    setMetricDialog({ isNew: true, departmentId });
  };

  const openEditMetric = (m: Metric) => {
    setMetricName(m.name); setMetricDesc(m.description || ""); setMetricType(m.metricType || "core_performance");
    setMetricUnit(m.unit || ""); setMetricGreen(m.greenLabel || ""); setMetricYellow(m.yellowLabel || ""); setMetricRed(m.redLabel || "");
    setMetricDialog({ isNew: false, id: m.id, departmentId: m.departmentId });
  };

  const saveMetric = async () => {
    if (!metricName.trim()) return;
    setMetricSaving(true);
    try {
      const body = {
        departmentId: metricDialog!.departmentId, name: metricName, description: metricDesc,
        metricType, unit: metricUnit, greenLabel: metricGreen, yellowLabel: metricYellow, redLabel: metricRed,
      };
      if (metricDialog?.isNew) {
        await api("/cm/traffic-light/metrics", { method: "POST", body: JSON.stringify(body) });
      } else {
        await api(`/cm/traffic-light/metrics/${metricDialog!.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      setMetricDialog(null);
      reload();
    } catch (e) { console.error(e); }
    setMetricSaving(false);
  };

  const deleteMetric = async (m: Metric) => {
    if (!confirm(`Delete metric "${m.name}"?`)) return;
    try {
      await api(`/cm/traffic-light/metrics/${m.id}`, { method: "DELETE" });
      reload();
    } catch (e) { console.error(e); }
  };

  // ── Playbook CRUD ──

  const openPlaybook = (deptId: number) => {
    const pb = playbooks.find((p) => p.departmentId === deptId);
    setPbYellowActions(pb?.yellowActions || ""); setPbYellowTimeframe(pb?.yellowTimeframe || "Within 48 hours");
    setPbRedActions(pb?.redActions || ""); setPbRedTimeframe(pb?.redTimeframe || "Within 24 hours");
    setPbEscalation(pb?.escalationContacts || ""); setPbNotes(pb?.notes || "");
    setPlaybookDeptId(deptId);
  };

  const savePlaybook = async () => {
    if (playbookDeptId === null) return;
    setPbSaving(true);
    try {
      await api(`/cm/traffic-light/playbooks/${playbookDeptId}`, {
        method: "PUT",
        body: JSON.stringify({
          yellowActions: pbYellowActions, yellowTimeframe: pbYellowTimeframe,
          redActions: pbRedActions, redTimeframe: pbRedTimeframe,
          escalationContacts: pbEscalation, notes: pbNotes,
        }),
      });
      setPlaybookDeptId(null);
      reload();
    } catch (e) { console.error(e); }
    setPbSaving(false);
  };

  if (loading) return <div className="text-muted p-4">Loading settings...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Traffic Light Configuration</h2>
          <p className="text-sm text-muted mt-1">Configure departments, health metrics, thresholds, and action playbooks</p>
        </div>
        <Button onClick={openNewDept}>+ Add Department</Button>
      </div>

      {/* Department Cards */}
      <div className="space-y-3">
        {departments.length === 0 && (
          <div className="bg-surface border border-border rounded-md p-12 text-center">
            <p className="text-muted mb-4">No departments configured. Add your first service department.</p>
            <Button onClick={openNewDept}>+ Add Department</Button>
          </div>
        )}

        {departments.map((dept) => {
          const deptMetrics = metrics.filter((m) => m.departmentId === dept.id);
          const deptPlaybook = playbooks.find((p) => p.departmentId === dept.id);
          const expanded = expandedDept === dept.id;

          return (
            <div key={dept.id} className="bg-surface border border-border rounded-md overflow-hidden">
              {/* Accordion header */}
              <button
                onClick={() => setExpandedDept(expanded ? null : dept.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-2/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: dept.color || "#3B82F6" }} />
                  <span className="font-semibold text-sm text-foreground truncate">{dept.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-dim">
                    {deptMetrics.length} metric{deptMetrics.length !== 1 ? "s" : ""}
                  </span>
                  {deptPlaybook && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-dim">Playbook</span>
                  )}
                  {!dept.isActive && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Inactive</span>
                  )}
                </div>
                <span className="text-dim text-sm">{expanded ? "▼" : "▶"}</span>
              </button>

              {/* Expanded content */}
              {expanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {dept.description && <p className="text-sm text-muted">{dept.description}</p>}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDept(dept)}>Edit Department</Button>
                    <Button variant="outline" size="sm" onClick={() => openPlaybook(dept.id)}>
                      {deptPlaybook ? "Edit Playbook" : "Add Playbook"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openNewMetric(dept.id)}>+ Add Metric</Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteDept(dept)}>
                      Delete
                    </Button>
                  </div>

                  {/* Metrics */}
                  <div>
                    <h4 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Health Metrics</h4>
                    {deptMetrics.length === 0 ? (
                      <p className="text-sm text-muted italic">No metrics configured.</p>
                    ) : (
                      <div className="space-y-2">
                        {deptMetrics.map((m) => (
                          <div key={m.id} className="border border-border rounded-md p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="text-sm font-medium text-foreground">{m.name}</span>
                                {m.description && <p className="text-xs text-muted">{m.description}</p>}
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-dim capitalize">
                                    {m.metricType?.replace("_", " ")}
                                  </span>
                                  {m.unit && <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-dim">{m.unit}</span>}
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => openEditMetric(m)} className="px-2 py-1 rounded text-xs text-muted hover:text-foreground hover:bg-surface-2">Edit</button>
                                <button onClick={() => deleteMetric(m)} className="px-2 py-1 rounded text-xs text-red-600 hover:text-red-700 hover:bg-red-50">Delete</button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div className="bg-emerald-50 text-emerald-700 rounded px-2 py-1.5">
                                <span className="font-medium">Green:</span> {m.greenLabel || "—"}
                              </div>
                              <div className="bg-amber-50 text-amber-700 rounded px-2 py-1.5">
                                <span className="font-medium">Yellow:</span> {m.yellowLabel || "—"}
                              </div>
                              <div className="bg-red-50 text-red-700 rounded px-2 py-1.5">
                                <span className="font-medium">Red:</span> {m.redLabel || "—"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Playbook preview */}
                  {deptPlaybook && (
                    <div>
                      <h4 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Action Playbook</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                          <h5 className="text-xs font-semibold text-amber-700 mb-1">Yellow — {deptPlaybook.yellowTimeframe}</h5>
                          <div className="text-xs text-amber-800 space-y-0.5">
                            {deptPlaybook.yellowActions?.split("\n").filter(Boolean).map((line, i) => (
                              <p key={i}>• {line}</p>
                            ))}
                          </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <h5 className="text-xs font-semibold text-red-700 mb-1">Red — {deptPlaybook.redTimeframe}</h5>
                          <div className="text-xs text-red-800 space-y-0.5">
                            {deptPlaybook.redActions?.split("\n").filter(Boolean).map((line, i) => (
                              <p key={i}>• {line}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                      {deptPlaybook.escalationContacts && (
                        <p className="text-xs text-muted mt-2"><strong>Escalation:</strong> {deptPlaybook.escalationContacts}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Department Dialog ── */}
      {deptDialog && (
        <FormDialog
          open={true}
          onOpenChange={() => setDeptDialog(null)}
          title={deptDialog.isNew ? "Add Department" : "Edit Department"}
          description="Configure a service department for the traffic light system."
          onSubmit={saveDept}
          isPending={deptSaving}
        >
          <FormField label="Department Name" value={deptName} onChange={setDeptName} required placeholder="e.g., Media Buying" />
          <FormField label="Description" type="textarea" value={deptDesc} onChange={setDeptDesc} placeholder="Brief description" rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Icon Name" value={deptIcon} onChange={setDeptIcon} placeholder="e.g., megaphone" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                <input type="color" value={deptColor} onChange={(e) => setDeptColor(e.target.value)}
                  className="w-10 h-9 rounded border-0 cursor-pointer" />
                <input value={deptColor} onChange={(e) => setDeptColor(e.target.value)}
                  className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
              </div>
            </div>
          </div>
        </FormDialog>
      )}

      {/* ── Metric Dialog ── */}
      {metricDialog && (
        <FormDialog
          open={true}
          onOpenChange={() => setMetricDialog(null)}
          title={metricDialog.isNew ? "Add Metric" : "Edit Metric"}
          description="Define a health metric with green/yellow/red threshold descriptions."
          onSubmit={saveMetric}
          isPending={metricSaving}
          wide
        >
          <FormField label="Metric Name" value={metricName} onChange={setMetricName} required placeholder="e.g., Cost Per Lead" />
          <FormField label="Description" type="textarea" value={metricDesc} onChange={setMetricDesc} placeholder="What does this metric measure?" rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Metric Type" type="select" value={metricType} onChange={setMetricType}
              options={[
                { value: "leading", label: "Leading Indicator" },
                { value: "core_performance", label: "Core Performance" },
                { value: "friction", label: "Friction Signal" },
              ]} />
            <FormField label="Unit" value={metricUnit} onChange={setMetricUnit} placeholder="e.g., %, $, ratio" />
          </div>
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold mb-3">Threshold Descriptions</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1">
                  <FormField label="Green (Healthy)" value={metricGreen} onChange={setMetricGreen} placeholder="What does green look like?" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                <div className="flex-1">
                  <FormField label="Yellow (Needs Attention)" value={metricYellow} onChange={setMetricYellow} placeholder="What triggers a yellow?" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1">
                  <FormField label="Red (Critical)" value={metricRed} onChange={setMetricRed} placeholder="What triggers a red?" />
                </div>
              </div>
            </div>
          </div>
        </FormDialog>
      )}

      {/* ── Playbook Dialog ── */}
      {playbookDeptId !== null && (
        <FormDialog
          open={true}
          onOpenChange={() => setPlaybookDeptId(null)}
          title={`Action Playbook — ${departments.find((d) => d.id === playbookDeptId)?.name}`}
          description="Define the response actions for yellow and red statuses."
          onSubmit={savePlaybook}
          isPending={pbSaving}
          wide
        >
          {/* Yellow section */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-amber-700">Yellow Response</h4>
            <FormField label="Actions (one per line)" type="textarea" value={pbYellowActions} onChange={setPbYellowActions}
              placeholder={"Review creative performance\nCheck for audience fatigue\nSchedule optimization review"} rows={4} />
            <FormField label="Timeframe" value={pbYellowTimeframe} onChange={setPbYellowTimeframe} placeholder="e.g., Within 48 hours" />
          </div>

          {/* Red section */}
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-red-700">Red Response</h4>
            <FormField label="Actions (one per line)" type="textarea" value={pbRedActions} onChange={setPbRedActions}
              placeholder={"Full internal audit\nClient reset call scheduled\nLeadership looped in"} rows={4} />
            <FormField label="Timeframe" value={pbRedTimeframe} onChange={setPbRedTimeframe} placeholder="e.g., Within 24 hours" />
          </div>

          <FormField label="Escalation Contacts" value={pbEscalation} onChange={setPbEscalation}
            placeholder="e.g., Media Director, Account Manager" />
          <FormField label="Additional Notes" type="textarea" value={pbNotes} onChange={setPbNotes}
            placeholder="Any additional context for this playbook" rows={2} />
        </FormDialog>
      )}
    </div>
  );
}
