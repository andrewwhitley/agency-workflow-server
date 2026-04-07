import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────

interface Department { id: number; name: string; }
interface Client { id: number; slug: string; companyName: string; status: string; }
interface HealthEntry { clientId: number; departmentId: number; status: string; }
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
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

const STATUS_DOT: Record<StatusKey, string> = {
  green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-500", na: "bg-gray-300",
};

function StatusDot({ status, size = "sm" }: { status: StatusKey; size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return <div className={cn(s, "rounded-full shrink-0", STATUS_DOT[status])} />;
}

function computeOverallStatus(statuses: StatusKey[]): StatusKey {
  const active = statuses.filter((s) => s !== "na");
  if (active.length === 0) return "na";
  if (active.some((s) => s === "red")) return "red";
  if (active.filter((s) => s === "yellow").length >= 1) return "yellow";
  return "green";
}

// ── Component ──────────────────────────────────

interface TrafficLightRollUpProps {
  compact?: boolean;
}

export function TrafficLightRollUp({ compact = false }: TrafficLightRollUpProps) {
  const navigate = useNavigate();
  const [weekOf, setWeekOf] = useState(getCurrentWeekMonday);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [clientDeptConfigs, setClientDeptConfigs] = useState<ClientDeptConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Department[]>("/cm/traffic-light/departments"),
      api<Client[]>("/cm/clients"),
      api<HealthEntry[]>(`/cm/traffic-light/health?weekOf=${weekOf}`),
      api<ClientDeptConfig[]>("/cm/traffic-light/client-departments").catch(() => []),
    ]).then(([depts, cls, ents, cdConfigs]) => {
      setDepartments(depts);
      setClients(cls.filter((c) => c.status === "active"));
      setEntries(ents);
      setClientDeptConfigs(cdConfigs);
    }).catch(console.error).finally(() => setLoading(false));
  }, [weekOf]);

  // Per-client department filtering
  const isDeptEnabled = useCallback((clientId: number, deptId: number): boolean => {
    const configs = clientDeptConfigs.filter((c) => c.clientId === clientId);
    if (configs.length === 0) return true;
    const match = configs.find((c) => c.departmentId === deptId);
    return match ? match.isEnabled : true;
  }, [clientDeptConfigs]);

  // Group entries by clientId → departmentId → status
  const clientHealthMap = useMemo(() => {
    const map: Record<number, Record<number, StatusKey>> = {};
    entries.forEach((e) => {
      if (!map[e.clientId]) map[e.clientId] = {};
      map[e.clientId][e.departmentId] = e.status as StatusKey;
    });
    return map;
  }, [entries]);

  // Overall per client (only enabled departments)
  const clientOverall = useMemo(() => {
    const result: Record<number, StatusKey> = {};
    clients.forEach((c) => {
      const enabledDepts = departments.filter((d) => isDeptEnabled(c.id, d.id));
      const statuses = enabledDepts.map((d) => clientHealthMap[c.id]?.[d.id] || "na" as StatusKey);
      result[c.id] = computeOverallStatus(statuses);
    });
    return result;
  }, [clients, departments, clientHealthMap, isDeptEnabled]);

  // Sort: red first
  const sortedClients = useMemo(() => {
    const order: Record<StatusKey, number> = { red: 0, yellow: 1, green: 2, na: 3 };
    return [...clients].sort((a, b) => (order[clientOverall[a.id] || "na"] || 3) - (order[clientOverall[b.id] || "na"] || 3));
  }, [clients, clientOverall]);

  // Summary
  const summary = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0, na: 0 };
    Object.values(clientOverall).forEach((s) => counts[s]++);
    return counts;
  }, [clientOverall]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-md p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-surface-2 rounded w-1/3" />
          <div className="h-32 bg-surface-2 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-md">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Client Health Overview</h3>
            <p className="text-xs text-muted">Traffic light status across all clients</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOf(shiftWeek(weekOf, -1))}
              className="px-2 py-1 rounded text-xs bg-surface-2 text-muted hover:bg-surface-3">←</button>
            <span className="text-xs font-medium text-foreground min-w-[130px] text-center">{formatWeekLabel(weekOf)}</span>
            <button onClick={() => setWeekOf(shiftWeek(weekOf, 1))}
              disabled={weekOf >= getCurrentWeekMonday()}
              className="px-2 py-1 rounded text-xs bg-surface-2 text-muted hover:bg-surface-3 disabled:opacity-40">→</button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Summary Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {summary.red > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-100 text-red-800">
              <StatusDot status="red" /> {summary.red} Critical
            </span>
          )}
          {summary.yellow > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">
              <StatusDot status="yellow" /> {summary.yellow} Needs Attention
            </span>
          )}
          {summary.green > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800">
              <StatusDot status="green" /> {summary.green} Healthy
            </span>
          )}
          {summary.na > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
              <StatusDot status="na" /> {summary.na} Not Tracked
            </span>
          )}
        </div>

        {/* Client Rows */}
        {sortedClients.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">No active clients found.</p>
        ) : (
          <div className="space-y-1.5">
            {(compact ? sortedClients.slice(0, 8) : sortedClients).map((client) => {
              const overall = clientOverall[client.id] || "na";
              const deptStatuses = clientHealthMap[client.id] || {};

              return (
                <button
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.slug}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-2/50 transition-colors cursor-pointer border border-border text-left"
                >
                  <StatusDot status={overall} size="md" />
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{client.companyName}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {departments.map((dept) => {
                      const enabled = isDeptEnabled(client.id, dept.id);
                      return (
                        <div key={dept.id} title={dept.name}>
                          {enabled
                            ? <StatusDot status={(deptStatuses[dept.id] as StatusKey) || "na"} />
                            : <div className="h-3 w-3 rounded-full bg-transparent border border-gray-200" title={`${dept.name} (not tracked)`} />
                          }
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Department Legend */}
        {departments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
              {departments.map((dept, i) => (
                <span key={dept.id}><span className="font-medium">{i + 1}.</span> {dept.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
