import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Department { id: number; name: string; icon: string | null; color: string | null; sortOrder: number; }
interface Client { id: number; slug: string; companyName: string; status: string; }
interface HealthEntry { id: number; clientId: number; departmentId: number; weekOf: string; status: string; notes: string | null; }

type StatusValue = "green" | "yellow" | "red" | "na";

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

const STATUS_COLORS: Record<StatusValue, string> = {
  green: "bg-success", yellow: "bg-warning", red: "bg-destructive", na: "bg-dim",
};

export function WeeklyCheckInPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [weekOf, setWeekOf] = useState(getCurrentWeekMonday());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, StatusValue>>({});

  useEffect(() => {
    Promise.all([
      api<Department[]>("/cm/traffic-light/departments"),
      api<Client[]>("/cm/clients"),
      api<HealthEntry[]>(`/cm/traffic-light/health?weekOf=${weekOf}`),
    ]).then(([depts, cls, ents]) => {
      setDepartments(depts.sort((a, b) => a.sortOrder - b.sortOrder));
      setClients(cls.filter((c) => c.status === "active"));
      setEntries(ents);
      setChanges({});
    }).catch(console.error).finally(() => setLoading(false));
  }, [weekOf]);

  const getStatus = (clientId: number, deptId: number): StatusValue => {
    const key = `${clientId}-${deptId}`;
    if (changes[key]) return changes[key];
    const entry = entries.find((e) => e.clientId === clientId && e.departmentId === deptId);
    return (entry?.status as StatusValue) || "na";
  };

  const cycleStatus = (clientId: number, deptId: number) => {
    const key = `${clientId}-${deptId}`;
    const current = getStatus(clientId, deptId);
    const order: StatusValue[] = ["green", "yellow", "red", "na"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    setChanges({ ...changes, [key]: next });
  };

  const hasChanges = Object.keys(changes).length > 0;

  const saveAll = async () => {
    setSaving(true);
    const entriesToSave = Object.entries(changes).map(([key, status]) => {
      const [clientId, deptId] = key.split("-").map(Number);
      return { clientId, departmentId: deptId, weekOf, status };
    });
    try {
      await api("/cm/traffic-light/health", { method: "POST", body: JSON.stringify(entriesToSave) });
      const updated = await api<HealthEntry[]>(`/cm/traffic-light/health?weekOf=${weekOf}`);
      setEntries(updated);
      setChanges({});
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  if (loading) return <div className="text-muted">Loading check-in...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Weekly Check-In</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOf(shiftWeek(weekOf, -1))} className="px-3 py-1.5 rounded-md text-sm bg-surface-2 text-muted hover:bg-surface-3">&larr;</button>
          <span className="text-sm font-medium text-foreground min-w-[200px] text-center">{formatWeekLabel(weekOf)}</span>
          <button onClick={() => setWeekOf(shiftWeek(weekOf, 1))} className="px-3 py-1.5 rounded-md text-sm bg-surface-2 text-muted hover:bg-surface-3">&rarr;</button>
        </div>
        <button onClick={saveAll} disabled={!hasChanges || saving}
          className={cn("px-4 py-2 rounded-md text-sm font-medium", hasChanges && !saving ? "bg-accent text-white hover:bg-accent/90" : "bg-surface-2 text-dim")}>
          {saving ? "Saving..." : hasChanges ? `Save ${Object.keys(changes).length} Changes` : "No Changes"}
        </button>
      </div>

      <p className="text-xs text-muted mb-4">Click a cell to cycle through: Green → Yellow → Red → N/A</p>

      <div className="bg-surface border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-3 font-medium text-dim sticky left-0 bg-surface-2 z-10">Client</th>
              {departments.map((d) => (
                <th key={d.id} className="text-center px-3 py-3 font-medium text-dim whitespace-nowrap text-xs">{d.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground font-medium sticky left-0 bg-surface z-10 whitespace-nowrap">{client.companyName}</td>
                {departments.map((dept) => {
                  const status = getStatus(client.id, dept.id);
                  const key = `${client.id}-${dept.id}`;
                  const isChanged = !!changes[key];
                  return (
                    <td key={dept.id} className="px-3 py-3 text-center">
                      <button
                        onClick={() => cycleStatus(client.id, dept.id)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all mx-auto",
                          STATUS_COLORS[status],
                          isChanged && "ring-2 ring-accent ring-offset-1"
                        )}
                        title={`${client.companyName} / ${dept.name}: ${status}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && <div className="p-8 text-center text-muted">No active clients. Add clients first.</div>}
      </div>
    </div>
  );
}
