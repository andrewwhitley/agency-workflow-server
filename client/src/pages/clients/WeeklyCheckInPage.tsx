import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Types ──────────────────────────────────

interface Department { id: number; name: string; description: string | null; icon: string | null; color: string | null; sortOrder: number; }
interface Client { id: number; slug: string; companyName: string; status: string; }
interface HealthEntry { id: number; clientId: number; departmentId: number; weekOf: string; status: string; notes: string | null; }
interface ClientDeptConfig { clientId: number; departmentId: number; isEnabled: boolean; }

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
  if (diff > 0) return <span className="text-emerald-600 text-xs font-bold">▲</span>;
  if (diff < 0) return <span className="text-red-600 text-xs font-bold">▼</span>;
  return <span className="text-gray-400 text-xs">—</span>;
}

function computeOverallStatus(statuses: StatusKey[]): StatusKey {
  const active = statuses.filter((s) => s !== "na");
  if (active.length === 0) return "na";
  if (active.some((s) => s === "red")) return "red";
  if (active.filter((s) => s === "yellow").length >= 1) return "yellow";
  return "green";
}

// ── Draft types ──────────────────────────────────

type EntryDraft = { status: StatusKey; notes: string };
type DraftMap = Record<string, EntryDraft>; // key: "clientId-departmentId"

// ── Component ──────────────────────────────────

export function WeeklyCheckInPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [prevEntries, setPrevEntries] = useState<HealthEntry[]>([]);
  const [weekOf, setWeekOf] = useState(getCurrentWeekMonday());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [notesClient, setNotesClient] = useState<number | null>(null);
  const [clientDeptConfigs, setClientDeptConfigs] = useState<ClientDeptConfig[]>([]);

  const prevWeek = useMemo(() => shiftWeek(weekOf, -1), [weekOf]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<Department[]>("/cm/traffic-light/departments"),
      api<Client[]>("/cm/clients"),
      api<HealthEntry[]>(`/cm/traffic-light/health?weekOf=${weekOf}`),
      api<HealthEntry[]>(`/cm/traffic-light/health?weekOf=${prevWeek}`),
      api<ClientDeptConfig[]>("/cm/traffic-light/client-departments").catch(() => []),
    ]).then(([depts, cls, ents, prev, cdConfigs]) => {
      setDepartments(depts.sort((a, b) => a.sortOrder - b.sortOrder));
      setClients(cls.filter((c) => c.status === "active"));
      setEntries(ents);
      setPrevEntries(prev);
      setClientDeptConfigs(cdConfigs);
      setDrafts({});
    }).catch(console.error).finally(() => setLoading(false));
  }, [weekOf, prevWeek]);

  // Per-client department filtering: returns true if this dept is enabled for this client
  const isDeptEnabledForClient = useCallback((clientId: number, deptId: number): boolean => {
    const configs = clientDeptConfigs.filter((c) => c.clientId === clientId);
    if (configs.length === 0) return true; // no config = all enabled
    const match = configs.find((c) => c.departmentId === deptId);
    return match ? match.isEnabled : true;
  }, [clientDeptConfigs]);

  // Get enabled departments for a specific client
  const getClientDepts = useCallback((clientId: number): Department[] => {
    return departments.filter((d) => isDeptEnabledForClient(clientId, d.id));
  }, [departments, isDeptEnabledForClient]);

  // Server entry map
  const serverMap = useMemo(() => {
    const map: Record<string, EntryDraft> = {};
    entries.forEach((e) => { map[`${e.clientId}-${e.departmentId}`] = { status: e.status as StatusKey, notes: e.notes || "" }; });
    return map;
  }, [entries]);

  // Previous week map
  const prevMap = useMemo(() => {
    const map: Record<string, StatusKey> = {};
    prevEntries.forEach((e) => { map[`${e.clientId}-${e.departmentId}`] = e.status as StatusKey; });
    return map;
  }, [prevEntries]);

  const getEffective = useCallback(
    (clientId: number, deptId: number): EntryDraft => {
      const key = `${clientId}-${deptId}`;
      return drafts[key] || serverMap[key] || { status: "na" as StatusKey, notes: "" };
    },
    [drafts, serverMap]
  );

  const cycleStatus = (clientId: number, deptId: number) => {
    const key = `${clientId}-${deptId}`;
    const current = getEffective(clientId, deptId);
    const order: StatusKey[] = ["green", "yellow", "red", "na"];
    const next = order[(order.indexOf(current.status) + 1) % order.length];
    setDrafts((prev) => ({ ...prev, [key]: { ...current, status: next } }));
  };

  const setNotes = (clientId: number, deptId: number, notes: string) => {
    const key = `${clientId}-${deptId}`;
    const current = getEffective(clientId, deptId);
    setDrafts((prev) => ({ ...prev, [key]: { ...current, notes } }));
  };

  const hasChanges = Object.keys(drafts).length > 0;
  const changedCount = Object.keys(drafts).length;

  // Overall status per client (using only their enabled departments)
  const clientOverall = useMemo(() => {
    const result: Record<number, StatusKey> = {};
    clients.forEach((c) => {
      const cDepts = getClientDepts(c.id);
      result[c.id] = computeOverallStatus(cDepts.map((d) => getEffective(c.id, d.id).status));
    });
    return result;
  }, [clients, getClientDepts, getEffective]);

  const prevClientOverall = useMemo(() => {
    const result: Record<number, StatusKey> = {};
    clients.forEach((c) => {
      const cDepts = getClientDepts(c.id);
      result[c.id] = computeOverallStatus(cDepts.map((d) => prevMap[`${c.id}-${d.id}`] || "na"));
    });
    return result;
  }, [clients, getClientDepts, prevMap]);

  // Sort: red first, then yellow, green, na
  const sortedClients = useMemo(() => {
    const order: Record<StatusKey, number> = { red: 0, yellow: 1, green: 2, na: 3 };
    return [...clients].sort((a, b) => (order[clientOverall[a.id] || "na"] || 3) - (order[clientOverall[b.id] || "na"] || 3));
  }, [clients, clientOverall]);

  // Summary counts
  const summary = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0, na: 0 };
    Object.values(clientOverall).forEach((s) => counts[s]++);
    return counts;
  }, [clientOverall]);

  const handleSave = async () => {
    const entriesToSave = Object.entries(drafts).map(([key, draft]) => {
      const [clientId, departmentId] = key.split("-").map(Number);
      return { clientId, departmentId, weekOf, status: draft.status, notes: draft.notes || undefined };
    });
    if (entriesToSave.length === 0) return;
    setSaving(true);
    try {
      await api("/cm/traffic-light/health", { method: "POST", body: JSON.stringify(entriesToSave) });
      const updated = await api<HealthEntry[]>(`/cm/traffic-light/health?weekOf=${weekOf}`);
      setEntries(updated);
      setDrafts({});
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleReset = () => {
    setDrafts({});
  };

  const changeWeek = (delta: number) => {
    if (hasChanges && !window.confirm("You have unsaved changes. Discard and switch weeks?")) return;
    setDrafts({});
    setWeekOf(shiftWeek(weekOf, delta));
  };

  if (loading) return <div className="text-muted p-4">Loading check-in...</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Weekly Check-In</h2>
          <p className="text-sm text-muted mt-1">Update all client health statuses in one view</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/settings/traffic-light")}>
          Settings
        </Button>
      </div>

      {/* Week Navigation + Summary + Save */}
      <div className="bg-surface border border-border rounded-md p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Top row: week picker + save */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => changeWeek(-1)}
                className="px-2.5 py-1.5 rounded-md text-sm bg-surface-2 text-muted hover:bg-surface-3">←</button>
              <span className="text-sm font-medium text-foreground min-w-[220px] text-center">
                {formatWeekLabel(weekOf)}
              </span>
              <button onClick={() => changeWeek(1)}
                disabled={weekOf >= getCurrentWeekMonday()}
                className="px-2.5 py-1.5 rounded-md text-sm bg-surface-2 text-muted hover:bg-surface-3 disabled:opacity-40">→</button>
            </div>

            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-xs px-2 py-1 rounded bg-surface-2 text-muted">
                  {changedCount} unsaved {changedCount === 1 ? "change" : "changes"}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
                {saving ? "Saving..." : "Save All"}
              </Button>
            </div>
          </div>

          {/* Summary Badges */}
          <div className="flex flex-wrap gap-2">
            {summary.red > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                <StatusDot status="red" size="sm" /> {summary.red} Critical
              </span>
            )}
            {summary.yellow > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
                <StatusDot status="yellow" size="sm" /> {summary.yellow} Needs Attention
              </span>
            )}
            {summary.green > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                <StatusDot status="green" size="sm" /> {summary.green} Healthy
              </span>
            )}
            {summary.na > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                <StatusDot status="na" size="sm" /> {summary.na} Not Tracked
              </span>
            )}
          </div>
        </div>
      </div>

      {sortedClients.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-12 text-center">
          <p className="text-muted mb-4">No active clients found. Add clients to start tracking health.</p>
          <Button onClick={() => navigate("/clients")}>Go to Clients</Button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-md">
          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-4 py-3 font-medium text-dim sticky left-0 bg-surface-2 z-10 min-w-[180px]">Client</th>
                  <th className="text-center px-3 py-3 font-medium text-dim w-[60px]">Overall</th>
                  {departments.map((d) => (
                    <th key={d.id} className="text-center px-3 py-3 font-medium text-dim whitespace-nowrap text-xs min-w-[90px]"
                      title={d.description || d.name}>{d.name}</th>
                  ))}
                  <th className="text-center px-3 py-3 font-medium text-dim w-[50px]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((client) => {
                  const overall = clientOverall[client.id] || "na";
                  const prevOverall = prevClientOverall[client.id] || "na";
                  const isDirty = departments.some((d) => drafts[`${client.id}-${d.id}`] !== undefined);

                  return (
                    <tr key={client.id} className={cn("border-b border-border last:border-0 hover:bg-surface-2/50 transition-colors",
                      isDirty && "bg-blue-50/30")}>
                      {/* Client name */}
                      <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                        <button onClick={() => navigate(`/clients/${client.slug}`)}
                          className="text-sm font-medium text-foreground hover:text-accent transition-colors text-left">
                          {client.companyName}
                        </button>
                      </td>

                      {/* Overall */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <StatusDot status={overall} />
                          <TrendIndicator current={overall} previous={prevOverall} />
                        </div>
                      </td>

                      {/* Department cells */}
                      {departments.map((dept) => {
                        const enabled = isDeptEnabledForClient(client.id, dept.id);
                        if (!enabled) {
                          return (
                            <td key={dept.id} className="px-2 py-2 text-center">
                              <span className="text-xs text-dim" title={`${dept.name} not tracked for this client`}>—</span>
                            </td>
                          );
                        }
                        const effective = getEffective(client.id, dept.id);
                        const prevStatus = prevMap[`${client.id}-${dept.id}`] as StatusKey | undefined;
                        const key = `${client.id}-${dept.id}`;
                        const isChanged = drafts[key] !== undefined;

                        return (
                          <td key={dept.id} className="px-2 py-2 text-center">
                            <button
                              onClick={() => cycleStatus(client.id, dept.id)}
                              title={`${client.companyName} / ${dept.name}: ${STATUS_CONFIG[effective.status].label}${prevStatus && prevStatus !== "na" ? ` (was ${STATUS_CONFIG[prevStatus].label})` : ""}. Click to cycle.`}
                              className={cn(
                                "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 transition-all text-xs font-medium border",
                                STATUS_CONFIG[effective.status].bg,
                                STATUS_CONFIG[effective.status].text,
                                STATUS_CONFIG[effective.status].border,
                                "hover:opacity-80 active:scale-95",
                                isChanged && "ring-2 ring-blue-400 ring-offset-1"
                              )}
                            >
                              <StatusDot status={effective.status} size="sm" />
                              <TrendIndicator current={effective.status} previous={prevStatus} />
                            </button>
                          </td>
                        );
                      })}

                      {/* Notes toggle */}
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => setNotesClient(notesClient === client.id ? null : client.id)}
                          className={cn(
                            "inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors hover:bg-surface-2",
                            departments.some((d) => getEffective(client.id, d.id).notes) ? "text-blue-600" : "text-dim"
                          )}
                          title="Toggle notes"
                        >
                          💬
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Notes panel (appears below the row when toggled) */}
            {notesClient !== null && (
              <div className="border-t border-border p-4 bg-surface-2/50">
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Notes — {clients.find((c) => c.id === notesClient)?.companyName}
                </h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {departments.map((dept) => {
                    const effective = getEffective(notesClient, dept.id);
                    return (
                      <div key={dept.id} className="space-y-1">
                        <label className="text-xs font-medium text-dim flex items-center gap-1.5">
                          <StatusDot status={effective.status} size="sm" />
                          {dept.name}
                        </label>
                        <textarea
                          value={effective.notes}
                          onChange={(e) => setNotes(notesClient, dept.id, e.target.value)}
                          placeholder={`Notes for ${dept.name}...`}
                          className="w-full px-2 py-1.5 rounded-md border border-border bg-surface text-foreground text-xs min-h-[48px] resize-none"
                          rows={2}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile: Card view */}
          <div className="md:hidden divide-y divide-border">
            {sortedClients.map((client) => {
              const overall = clientOverall[client.id] || "na";
              const prevOverall = prevClientOverall[client.id] || "na";

              return (
                <div key={client.id} className="p-4">
                  {/* Client header */}
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => navigate(`/clients/${client.slug}`)}
                      className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                      {client.companyName}
                    </button>
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={overall} />
                      <span className={cn("text-xs font-medium", STATUS_CONFIG[overall].text)}>
                        {STATUS_CONFIG[overall].label}
                      </span>
                      <TrendIndicator current={overall} previous={prevOverall} />
                    </div>
                  </div>

                  {/* Department grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {departments.filter((d) => isDeptEnabledForClient(client.id, d.id)).map((dept) => {
                      const effective = getEffective(client.id, dept.id);
                      const prevStatus = prevMap[`${client.id}-${dept.id}`] as StatusKey | undefined;
                      const key = `${client.id}-${dept.id}`;
                      const isChanged = drafts[key] !== undefined;

                      return (
                        <button
                          key={dept.id}
                          onClick={() => cycleStatus(client.id, dept.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all border",
                            STATUS_CONFIG[effective.status].bg,
                            STATUS_CONFIG[effective.status].text,
                            STATUS_CONFIG[effective.status].border,
                            "hover:opacity-80 active:scale-[0.98]",
                            isChanged && "ring-2 ring-blue-400 ring-offset-1"
                          )}
                        >
                          <StatusDot status={effective.status} size="sm" />
                          <span className="flex-1 text-xs font-medium truncate">{dept.name}</span>
                          <TrendIndicator current={effective.status} previous={prevStatus} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          {departments.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-surface-2/50">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
                <span className="font-medium">Legend:</span>
                {(["green", "yellow", "red", "na"] as StatusKey[]).map((s) => (
                  <span key={s} className="flex items-center gap-1">
                    <StatusDot status={s} size="sm" />
                    {STATUS_CONFIG[s].label}
                  </span>
                ))}
                <span className="text-dim ml-2">Click any cell to cycle status</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky save bar when there are unsaved changes */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur border-t border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-muted">
                {changedCount} unsaved {changedCount === 1 ? "change" : "changes"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>Discard</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save All Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
