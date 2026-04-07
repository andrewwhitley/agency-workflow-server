import { useState, useEffect, useMemo, useCallback } from "react";
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
}

interface Metric {
  id: number;
  departmentId: number;
  name: string;
  description: string | null;
  metricType: string;
  greenLabel: string | null;
  yellowLabel: string | null;
  redLabel: string | null;
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
}

interface HealthEntry {
  id: number;
  clientId: number;
  departmentId: number;
  weekOf: string;
  status: string;
  notes: string | null;
  updatedByName: string | null;
  departmentName?: string;
  icon?: string | null;
  color?: string | null;
}

interface ActionLogEntry {
  id: number;
  healthEntryId: number;
  clientId: number;
  departmentId: number;
  action: string;
  actionType: string;
  completedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  departmentName?: string;
}

interface ClientDepartment {
  clientId: number;
  departmentId: number;
  isEnabled: boolean;
  notes: string | null;
  departmentName?: string;
}

interface DashboardData {
  departments: Department[];
  metrics: Metric[];
  playbooks: Playbook[];
  currentEntries: HealthEntry[];
  previousEntries: HealthEntry[];
  recentActions: ActionLogEntry[];
  clientDepartments: ClientDepartment[];
}

type StatusKey = "green" | "yellow" | "red" | "na";

// ── Helpers ──────────────────────────────────

function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  return monday.toISOString().slice(0, 10);
}

function shiftWeek(weekOf: string, delta: number): string {
  const d = new Date(weekOf + "T12:00:00");
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

function formatWeekLabel(weekOf: string): string {
  const start = new Date(weekOf + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${start.getFullYear()}`;
}

const STATUS_CONFIG: Record<StatusKey, { dot: string; bg: string; border: string; text: string; label: string }> = {
  green:  { dot: "bg-emerald-500", bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700", label: "Green" },
  yellow: { dot: "bg-amber-400",   bg: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-700",   label: "Yellow" },
  red:    { dot: "bg-red-500",     bg: "bg-red-50",      border: "border-red-200",     text: "text-red-700",     label: "Red" },
  na:     { dot: "bg-gray-300",    bg: "bg-gray-50",     border: "border-gray-200",    text: "text-gray-500",    label: "N/A" },
};

function StatusDot({ status, size = "md" }: { status: StatusKey; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return <div className={cn(s, "rounded-full shrink-0", STATUS_CONFIG[status].dot)} />;
}

function TrendIndicator({ current, previous }: { current: StatusKey; previous?: StatusKey }) {
  if (!previous || previous === "na" || current === "na") return null;
  const order: Record<string, number> = { green: 3, yellow: 2, red: 1, na: 0 };
  const diff = order[current] - order[previous];
  if (diff > 0) return <span className="text-emerald-600 text-xs font-bold" title="Improved">▲</span>;
  if (diff < 0) return <span className="text-red-600 text-xs font-bold" title="Declined">▼</span>;
  return <span className="text-gray-400 text-xs" title="No change">—</span>;
}

function computeOverallStatus(entries: Array<{ status: string }>): StatusKey {
  const statuses = entries.filter((e) => e.status !== "na").map((e) => e.status);
  if (statuses.length === 0) return "na";
  if (statuses.some((s) => s === "red")) return "red";
  if (statuses.filter((s) => s === "yellow").length >= 1) return "yellow";
  return "green";
}

// ── Component ──────────────────────────────────

interface ClientHealthTabProps {
  clientId: number;
  clientName?: string;
}

export function ClientHealthTab({ clientId }: ClientHealthTabProps) {
  const [weekOf, setWeekOf] = useState(getCurrentWeekMonday);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<StatusKey>("green");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Action log inline
  const [newAction, setNewAction] = useState("");
  const [newActionType, setNewActionType] = useState("other");
  const [savingAction, setSavingAction] = useState(false);

  // Playbook dialog
  const [playbookDeptId, setPlaybookDeptId] = useState<number | null>(null);

  // Configure departments dialog
  const [showConfig, setShowConfig] = useState(false);
  const [configDrafts, setConfigDrafts] = useState<Record<number, boolean>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api<DashboardData>(`/cm/traffic-light/client-dashboard?clientId=${clientId}&weekOf=${weekOf}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId, weekOf]);

  useEffect(() => { reload(); }, [reload]);

  // Maps for quick lookup
  const currentMap = useMemo(() => {
    const map: Record<number, HealthEntry> = {};
    (data?.currentEntries || []).forEach((e) => (map[e.departmentId] = e));
    return map;
  }, [data?.currentEntries]);

  const previousMap = useMemo(() => {
    const map: Record<number, HealthEntry> = {};
    (data?.previousEntries || []).forEach((e) => (map[e.departmentId] = e));
    return map;
  }, [data?.previousEntries]);

  const playbookMap = useMemo(() => {
    const map: Record<number, Playbook> = {};
    (data?.playbooks || []).forEach((p) => (map[p.departmentId] = p));
    return map;
  }, [data?.playbooks]);

  const allDepartments = data?.departments || [];
  const metrics = data?.metrics || [];
  const recentActions = data?.recentActions || [];
  const clientDepts = data?.clientDepartments || [];

  // Filter departments: if per-client config exists, only show enabled ones
  // If no config exists for this client, show all departments
  const departments = useMemo(() => {
    if (clientDepts.length === 0) return allDepartments;
    const enabledIds = new Set(clientDepts.filter((cd) => cd.isEnabled).map((cd) => cd.departmentId));
    return allDepartments.filter((d) => enabledIds.has(d.id));
  }, [allDepartments, clientDepts]);

  const overallStatus = computeOverallStatus(
    departments.map((d) => ({ status: currentMap[d.id]?.status || "na" }))
  );
  const overallPrevStatus = computeOverallStatus(
    departments.map((d) => ({ status: previousMap[d.id]?.status || "na" }))
  );

  // Configure departments handlers
  const openConfig = () => {
    const drafts: Record<number, boolean> = {};
    allDepartments.forEach((d) => {
      if (clientDepts.length === 0) {
        drafts[d.id] = true; // all enabled by default
      } else {
        const cd = clientDepts.find((cd) => cd.departmentId === d.id);
        drafts[d.id] = cd ? cd.isEnabled : true;
      }
    });
    setConfigDrafts(drafts);
    setShowConfig(true);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const deptConfigs = allDepartments.map((d) => ({
        departmentId: d.id,
        isEnabled: configDrafts[d.id] ?? true,
      }));
      await api(`/cm/traffic-light/client-departments/${clientId}`, {
        method: "PUT",
        body: JSON.stringify({ departments: deptConfigs }),
      });
      setShowConfig(false);
      reload();
    } catch (e) { console.error(e); }
    setSavingConfig(false);
  };

  // Edit dialog handlers
  const openEdit = (deptId: number) => {
    const entry = currentMap[deptId];
    setEditingDeptId(deptId);
    setEditStatus((entry?.status as StatusKey) || "na");
    setEditNotes(entry?.notes || "");
    setNewAction("");
    setNewActionType("other");
  };

  const handleSave = async () => {
    if (editingDeptId === null) return;
    setSaving(true);
    try {
      await api("/cm/traffic-light/health", {
        method: "POST",
        body: JSON.stringify({ clientId, departmentId: editingDeptId, weekOf, status: editStatus, notes: editNotes }),
      });
      setEditingDeptId(null);
      reload();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleLogAction = async () => {
    if (!newAction.trim() || editingDeptId === null) return;
    const entry = currentMap[editingDeptId];
    if (!entry) return;
    setSavingAction(true);
    try {
      await api("/cm/traffic-light/actions", {
        method: "POST",
        body: JSON.stringify({
          healthEntryId: entry.id, clientId, departmentId: editingDeptId,
          action: newAction, actionType: newActionType,
        }),
      });
      setNewAction("");
      setNewActionType("other");
      reload();
    } catch (e) { console.error(e); }
    setSavingAction(false);
  };

  const editingDept = departments.find((d) => d.id === editingDeptId);
  const editingPlaybook = editingDeptId ? playbookMap[editingDeptId] : null;
  const editDeptMetrics = editingDeptId ? metrics.filter((m) => m.departmentId === editingDeptId) : [];
  const playbookDept = departments.find((d) => d.id === playbookDeptId);
  const playbookData = playbookDeptId ? playbookMap[playbookDeptId] : null;

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-16 bg-surface-2 rounded-md" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="animate-pulse h-28 bg-surface-2 rounded-md" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation + Overall Status */}
      <div className="bg-surface border border-border rounded-md p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOf(shiftWeek(weekOf, -1))}
              className="px-2.5 py-1.5 rounded-md text-sm bg-surface-2 text-muted hover:bg-surface-3">←</button>
            <span className="text-sm font-medium text-foreground min-w-[200px] text-center">
              {formatWeekLabel(weekOf)}
            </span>
            <button onClick={() => setWeekOf(shiftWeek(weekOf, 1))}
              disabled={weekOf >= getCurrentWeekMonday()}
              className="px-2.5 py-1.5 rounded-md text-sm bg-surface-2 text-muted hover:bg-surface-3 disabled:opacity-40">→</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Overall:</span>
              <StatusDot status={overallStatus} size="lg" />
              <span className={cn("text-sm font-semibold", STATUS_CONFIG[overallStatus].text)}>
                {STATUS_CONFIG[overallStatus].label}
              </span>
              <TrendIndicator current={overallStatus} previous={overallPrevStatus} />
            </div>
            <Button variant="outline" size="sm" onClick={openConfig}>
              Configure
            </Button>
          </div>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {departments.map((dept) => {
          const entry = currentMap[dept.id];
          const prevEntry = previousMap[dept.id];
          const status = (entry?.status as StatusKey) || "na";
          const prevStatus = (prevEntry?.status as StatusKey) || undefined;
          const config = STATUS_CONFIG[status];
          const deptMetrics = metrics.filter((m) => m.departmentId === dept.id);
          const playbook = playbookMap[dept.id];

          return (
            <button
              key={dept.id}
              onClick={() => openEdit(dept.id)}
              className={cn(
                "text-left rounded-md border-l-4 p-4 transition-all hover:shadow-md cursor-pointer",
                config.border, config.bg
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusDot status={status} size="lg" />
                  <span className="font-semibold text-sm text-foreground truncate">{dept.name}</span>
                </div>
                <TrendIndicator current={status} previous={prevStatus} />
              </div>

              {/* Metric labels */}
              {deptMetrics.length > 0 && (
                <div className="space-y-0.5 mb-2">
                  {deptMetrics.map((m) => (
                    <div key={m.id} className="text-xs text-muted flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
                      <span className="truncate">{m.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes preview */}
              {entry?.notes && (
                <p className="text-xs text-muted italic line-clamp-2">{entry.notes}</p>
              )}

              {/* Updated by */}
              {entry?.updatedByName && (
                <p className="text-xs text-dim mt-1">— {entry.updatedByName}</p>
              )}

              {/* Playbook hint for yellow/red */}
              {(status === "yellow" || status === "red") && playbook && (
                <span
                  onClick={(e) => { e.stopPropagation(); setPlaybookDeptId(dept.id); }}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-muted hover:text-foreground"
                >
                  📋 View Playbook
                </span>
              )}
            </button>
          );
        })}
      </div>

      {departments.length === 0 && (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No departments configured. Go to Traffic Light Settings to add departments.
        </div>
      )}

      {/* Recent Action Log */}
      <div className="bg-surface border border-border rounded-md">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Action Log</h3>
          <p className="text-xs text-muted">Recent actions taken for this client</p>
        </div>
        <div className="p-4">
          {recentActions.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              No actions logged yet. Actions will appear when you respond to yellow or red statuses.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActions.slice(0, 10).map((action) => (
                <div key={action.id} className="flex items-start gap-3 text-sm border-l-2 border-border pl-3 py-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-muted font-medium">
                        {action.departmentName || "Unknown"}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-dim capitalize">
                        {action.actionType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{action.action}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-dim">
                      {action.completedByName && <span>{action.completedByName}</span>}
                      {action.createdAt && <span>{new Date(action.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Status Dialog ── */}
      {editingDeptId !== null && (
        <FormDialog
          open={true}
          onOpenChange={() => setEditingDeptId(null)}
          title={`${editingDept?.name || "Update Status"}`}
          onSubmit={handleSave}
          isPending={saving}
          wide
        >
          {/* Status Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">Status</label>
            <div className="grid grid-cols-4 gap-2">
              {(["green", "yellow", "red", "na"] as StatusKey[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditStatus(s)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                      editStatus === s
                        ? `${cfg.border} ${cfg.bg} ring-2 ring-offset-1`
                        : "border-transparent hover:border-border"
                    )}
                  >
                    <StatusDot status={s} size="lg" />
                    <span className={cn("text-xs font-medium", cfg.text)}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metric Thresholds Reference */}
          {editDeptMetrics.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider">Metric Thresholds</h4>
              {editDeptMetrics.map((m) => (
                <div key={m.id} className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{m.name}</p>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="bg-emerald-50 text-emerald-700 rounded px-2 py-1">
                      <span className="font-medium">G:</span> {m.greenLabel || "—"}
                    </div>
                    <div className="bg-amber-50 text-amber-700 rounded px-2 py-1">
                      <span className="font-medium">Y:</span> {m.yellowLabel || "—"}
                    </div>
                    <div className="bg-red-50 text-red-700 rounded px-2 py-1">
                      <span className="font-medium">R:</span> {m.redLabel || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Playbook Prompt for yellow/red */}
          {(editStatus === "yellow" || editStatus === "red") && editingPlaybook && (
            <div className={cn(
              "rounded-lg border p-3",
              editStatus === "yellow" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"
            )}>
              <h4 className={cn(
                "text-xs font-semibold uppercase tracking-wider mb-2",
                editStatus === "yellow" ? "text-amber-700" : "text-red-700"
              )}>
                {editStatus === "yellow" ? "Yellow Playbook" : "Red Playbook"} —{" "}
                {editStatus === "yellow" ? editingPlaybook.yellowTimeframe : editingPlaybook.redTimeframe}
              </h4>
              <div className="text-sm space-y-1">
                {(editStatus === "yellow" ? editingPlaybook.yellowActions : editingPlaybook.redActions)
                  ?.split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="opacity-50 mt-0.5">✓</span>
                      <span>{line}</span>
                    </div>
                  ))}
              </div>
              {editingPlaybook.escalationContacts && (
                <p className="text-xs mt-2 text-muted">
                  <strong>Escalation:</strong> {editingPlaybook.escalationContacts}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <FormField label="Notes" type="textarea" value={editNotes} onChange={setEditNotes}
            placeholder="Add context about this status..." rows={3} />

          {/* Log Action (for yellow/red with existing entry) */}
          {(editStatus === "yellow" || editStatus === "red") && currentMap[editingDeptId] && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <h4 className="text-xs font-semibold text-dim uppercase tracking-wider">Log an Action</h4>
              <FormField label="" type="text" value={newAction} onChange={setNewAction}
                placeholder="What action was taken?" />
              <div className="flex gap-2">
                <FormField label="" type="select" value={newActionType} onChange={setNewActionType}
                  options={[
                    { value: "proactive_checkin", label: "Proactive Check-in" },
                    { value: "internal_audit", label: "Internal Audit" },
                    { value: "client_call", label: "Client Call" },
                    { value: "escalation", label: "Escalation" },
                    { value: "resolution", label: "Resolution" },
                    { value: "other", label: "Other" },
                  ]} />
                <Button type="button" variant="outline" size="sm"
                  disabled={!newAction.trim() || savingAction}
                  onClick={handleLogAction}
                  className="shrink-0 self-end">
                  {savingAction ? "..." : "+ Log"}
                </Button>
              </div>
            </div>
          )}
        </FormDialog>
      )}

      {/* ── Playbook Dialog ── */}
      {playbookDeptId !== null && playbookData && (
        <FormDialog
          open={true}
          onOpenChange={() => setPlaybookDeptId(null)}
          title={`${playbookDept?.name || ""} — Action Playbook`}
          onSubmit={() => setPlaybookDeptId(null)}
          submitLabel="Close"
        >
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <h4 className="text-sm font-semibold text-amber-700 mb-2">
                Yellow Actions — {playbookData.yellowTimeframe || "No timeframe set"}
              </h4>
              <div className="space-y-1.5">
                {playbookData.yellowActions?.split("\n").filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-600 mt-0.5">✓</span>
                    <span>{line}</span>
                  </div>
                )) || <p className="text-sm text-muted">No yellow actions defined.</p>}
              </div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <h4 className="text-sm font-semibold text-red-700 mb-2">
                Red Actions — {playbookData.redTimeframe || "No timeframe set"}
              </h4>
              <div className="space-y-1.5">
                {playbookData.redActions?.split("\n").filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-red-600 mt-0.5">✓</span>
                    <span>{line}</span>
                  </div>
                )) || <p className="text-sm text-muted">No red actions defined.</p>}
              </div>
            </div>
            {playbookData.escalationContacts && (
              <p className="text-sm"><strong>Escalation Contacts:</strong> {playbookData.escalationContacts}</p>
            )}
          </div>
        </FormDialog>
      )}

      {/* ── Configure Departments Dialog ── */}
      {showConfig && (
        <FormDialog
          open={true}
          onOpenChange={() => setShowConfig(false)}
          title="Configure Tracked Departments"
          description="Choose which departments are tracked for this client. Uncheck departments that don't apply."
          onSubmit={saveConfig}
          isPending={savingConfig}
        >
          <div className="space-y-2">
            {allDepartments.map((dept) => {
              const enabled = configDrafts[dept.id] ?? true;
              return (
                <label key={dept.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                    enabled ? "border-border bg-surface" : "border-border bg-surface-2 opacity-60"
                  )}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setConfigDrafts((prev) => ({ ...prev, [dept.id]: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: dept.color || "#3B82F6" }} />
                    <div>
                      <span className="text-sm font-medium text-foreground">{dept.name}</span>
                      {dept.description && (
                        <p className="text-xs text-muted">{dept.description}</p>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </FormDialog>
      )}
    </div>
  );
}
