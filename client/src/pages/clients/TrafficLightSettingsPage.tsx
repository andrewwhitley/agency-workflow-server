import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  greenLabel: string | null;
  yellowLabel: string | null;
  redLabel: string | null;
}

interface Playbook {
  id: number;
  departmentId: number;
  departmentName: string;
  yellowActions: string | null;
  redActions: string | null;
  escalationContacts: string | null;
}

export function TrafficLightSettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [metrics, setMetrics] = useState<Record<number, Metric[]>>({});
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDept, setShowAddDept] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", description: "", icon: "", color: "#3B82F6" });
  const [expandedDept, setExpandedDept] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api<Department[]>("/cm/traffic-light/departments"),
      api<Playbook[]>("/cm/traffic-light/playbooks"),
    ]).then(([depts, pbs]) => {
      setDepartments(depts.sort((a, b) => a.sortOrder - b.sortOrder));
      setPlaybooks(pbs);
      // Fetch metrics for each department
      Promise.all(depts.map((d) =>
        api<Metric[]>(`/cm/traffic-light/departments/${d.id}/metrics`).then((m) => ({ id: d.id, metrics: m }))
      )).then((results) => {
        const map: Record<number, Metric[]> = {};
        results.forEach((r) => { map[r.id] = r.metrics; });
        setMetrics(map);
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addDepartment = async () => {
    await api("/cm/traffic-light/departments", { method: "POST", body: JSON.stringify(deptForm) });
    setShowAddDept(false);
    setDeptForm({ name: "", description: "", icon: "", color: "#3B82F6" });
    const depts = await api<Department[]>("/cm/traffic-light/departments");
    setDepartments(depts);
  };

  if (loading) return <div className="text-muted">Loading settings...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Traffic Light Settings</h2>
          <p className="text-sm text-muted mt-1">Configure departments, metrics, and action playbooks</p>
        </div>
        <button onClick={() => setShowAddDept(true)} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
          Add Department
        </button>
      </div>

      <div className="space-y-4">
        {departments.map((dept) => {
          const deptMetrics = metrics[dept.id] || [];
          const playbook = playbooks.find((p) => p.departmentId === dept.id);
          const expanded = expandedDept === dept.id;

          return (
            <div key={dept.id} className="bg-surface border border-border rounded-md">
              <button onClick={() => setExpandedDept(expanded ? null : dept.id)}
                className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || "#3B82F6" }} />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{dept.name}</div>
                    {dept.description && <div className="text-xs text-muted">{dept.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-dim">{deptMetrics.length} metrics</span>
                  <span className="text-dim">{expanded ? "▼" : "▶"}</span>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Metrics */}
                  <div>
                    <h4 className="text-xs font-semibold text-dim uppercase mb-2">Metrics</h4>
                    {deptMetrics.length === 0 ? (
                      <p className="text-xs text-muted">No metrics defined.</p>
                    ) : (
                      <div className="space-y-2">
                        {deptMetrics.map((m) => (
                          <div key={m.id} className="bg-surface-2 rounded p-3 text-sm">
                            <div className="font-medium text-foreground">{m.name}</div>
                            {m.description && <div className="text-xs text-muted mt-0.5">{m.description}</div>}
                            <div className="flex gap-3 mt-2 text-xs">
                              {m.greenLabel && <span className="text-success">Green: {m.greenLabel}</span>}
                              {m.yellowLabel && <span className="text-warning">Yellow: {m.yellowLabel}</span>}
                              {m.redLabel && <span className="text-destructive">Red: {m.redLabel}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Playbook */}
                  {playbook && (
                    <div>
                      <h4 className="text-xs font-semibold text-dim uppercase mb-2">Action Playbook</h4>
                      <div className="bg-surface-2 rounded p-3 text-sm space-y-2">
                        {playbook.yellowActions && (
                          <div><span className="text-warning font-medium text-xs">Yellow:</span> <span className="text-muted text-xs">{playbook.yellowActions}</span></div>
                        )}
                        {playbook.redActions && (
                          <div><span className="text-destructive font-medium text-xs">Red:</span> <span className="text-muted text-xs">{playbook.redActions}</span></div>
                        )}
                        {playbook.escalationContacts && (
                          <div><span className="text-dim font-medium text-xs">Escalation:</span> <span className="text-muted text-xs">{playbook.escalationContacts}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {departments.length === 0 && (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No departments configured. Add departments like "Media Buying", "SEO", "Content", etc.
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDept && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddDept(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Department</h3>
            <div className="space-y-4">
              <input placeholder="Department Name" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <textarea placeholder="Description" value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} rows={2}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Icon (emoji)" value={deptForm.icon} onChange={(e) => setDeptForm({ ...deptForm, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                <div className="flex items-center gap-2">
                  <input type="color" value={deptForm.color} onChange={(e) => setDeptForm({ ...deptForm, color: e.target.value })} className="w-10 h-10 rounded border-0" />
                  <span className="text-sm text-muted">Color</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddDept(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={addDepartment} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
