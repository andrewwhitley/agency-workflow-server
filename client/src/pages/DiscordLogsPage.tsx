import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DiscordLog {
  id: string;
  type: string;
  username: string;
  userMessage: string;
  botResponse: string;
  timestamp: string;
  channel?: string;
}

export function DiscordLogsPage() {
  const [logs, setLogs] = useState<DiscordLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchLogs = () => {
    const params = filter ? `?type=${filter}` : "";
    api<DiscordLog[]>(`/discord/logs${params}`)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 15000);
    return () => clearInterval(intervalRef.current);
  }, [filter]);

  if (loading) return <div className="text-muted">Loading Discord logs...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Discord Logs</h2>
        <button
          onClick={fetchLogs}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[null, "conversation", "command"].map((f) => (
          <button
            key={f ?? "all"}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
              filter === f
                ? "bg-accent text-white"
                : "bg-surface-2 text-muted hover:bg-surface-3"
            )}
          >
            {f ?? "All"}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <p className="text-muted">No Discord logs yet.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-surface border border-border rounded-md p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
                  {log.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{log.username}</span>
                  <span className="text-xs text-dim ml-2">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-surface-2 text-dim capitalize">
                  {log.type}
                </span>
              </div>
              <div className="bg-surface-2 rounded p-3 mb-2 text-sm text-foreground">
                {log.userMessage}
              </div>
              {log.botResponse && (
                <div className="bg-accent/5 rounded p-3 text-sm text-foreground border-l-2 border-accent">
                  {log.botResponse}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
