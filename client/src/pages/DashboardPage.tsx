import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Building2, Target, Heart, Users, Globe, PenTool } from "lucide-react";

interface SummaryData {
  workflows: { name: string; description: string; category: string }[];
  workflowStats: {
    totalRuns: number;
    successes: number;
    failures: number;
    averageDuration: number;
  };
  workflowHistory: {
    id: string;
    workflow: string;
    status: string;
    startedAt: string;
    duration?: number;
    error?: string;
  }[];
  uptime: number;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function DashboardPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<SummaryData>("/summary")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="text-muted">Loading dashboard...</div>;
  }

  const stats = data.workflowStats;
  const cards = [
    { label: "Workflows", value: data.workflows.length, color: "text-accent" },
    { label: "Total Runs", value: stats.totalRuns, color: "text-foreground" },
    { label: "Successes", value: stats.successes, color: "text-success" },
    { label: "Failures", value: stats.failures, color: "text-destructive" },
    { label: "Avg Duration", value: formatDuration(stats.averageDuration), color: "text-foreground" },
    { label: "Uptime", value: formatUptime(data.uptime), color: "text-foreground" },
  ];

  const quickLinks = [
    { to: "/clients", label: "Clients", icon: Building2, color: "text-blue-600", desc: "Manage client accounts" },
    { to: "/weekly-check-in", label: "Weekly Check-In", icon: Heart, color: "text-pink-600", desc: "Traffic light health" },
    { to: "/seo", label: "SEO Dashboard", icon: Globe, color: "text-green-600", desc: "Keyword tracking & audits" },
    { to: "/content", label: "Content", icon: PenTool, color: "text-purple-600", desc: "Content management" },
    { to: "/team", label: "Agency Team", icon: Users, color: "text-orange-600", desc: "Team directory" },
    { to: "/workflows", label: "Workflows", icon: Target, color: "text-cyan-600", desc: "Automation workflows" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Dashboard</h2>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.to} to={link.to}
              className="bg-surface border border-border rounded-md p-4 hover:border-accent/50 hover:shadow-sm transition-all">
              <Icon className={cn("h-6 w-6 mb-2", link.color)} />
              <div className="text-sm font-medium text-foreground">{link.label}</div>
              <div className="text-xs text-dim">{link.desc}</div>
            </Link>
          );
        })}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface border border-border rounded-md p-4">
            <div className="text-xs text-dim uppercase tracking-wide mb-1">{c.label}</div>
            <div className={cn("text-2xl font-semibold", c.color)}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Recent runs */}
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Runs</h3>
      {data.workflowHistory.length === 0 ? (
        <p className="text-muted">No workflow runs yet.</p>
      ) : (
        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="text-left px-4 py-3 font-medium text-dim">Status</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Workflow</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Started</th>
                <th className="text-left px-4 py-3 font-medium text-dim">Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.workflowHistory.slice(0, 20).map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-xs font-medium",
                        run.status === "completed" && "bg-success/10 text-success",
                        run.status === "failed" && "bg-destructive/10 text-destructive",
                        run.status === "running" && "bg-warning/10 text-warning"
                      )}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{run.workflow}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(run.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {run.duration ? formatDuration(run.duration) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
