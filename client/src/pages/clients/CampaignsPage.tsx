import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Campaign {
  id: number;
  clientId: number;
  clientName: string;
  campaignName: string;
  campaignType: string | null;
  status: string;
  platforms: string | null;
  budget: number | null;
  createdAt: string;
}

const STATUSES = ["planning", "active", "paused", "completed", "archived"];

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    api<Campaign[]>("/cm/campaigns").then(setCampaigns).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter ? campaigns.filter((c) => c.status === filter) : campaigns;

  if (loading) return <div className="text-muted">Loading campaigns...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Campaigns</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter(null)}
          className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors", !filter ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
          All ({campaigns.length})
        </button>
        {STATUSES.map((s) => {
          const count = campaigns.filter((c) => c.status === s).length;
          if (count === 0) return null;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize", filter === s ? "bg-accent text-white" : "bg-surface-2 text-muted hover:bg-surface-3")}>
              {s} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">No campaigns found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-surface border border-border rounded-md p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{c.campaignName}</h3>
                  <Link to={`/clients/${c.clientName?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="text-xs text-accent hover:underline">{c.clientName}</Link>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize",
                  c.status === "active" ? "bg-success/10 text-success" :
                  c.status === "paused" ? "bg-warning/10 text-warning" :
                  c.status === "completed" ? "bg-accent/10 text-accent" : "bg-surface-2 text-dim"
                )}>{c.status}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-dim mt-3">
                {c.campaignType && <span className="px-2 py-0.5 rounded bg-surface-2">{c.campaignType}</span>}
                {c.platforms && <span className="px-2 py-0.5 rounded bg-surface-2">{c.platforms}</span>}
                {c.budget && <span className="px-2 py-0.5 rounded bg-surface-2">${Number(c.budget).toLocaleString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
