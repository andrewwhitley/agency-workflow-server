import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Client {
  name: string;
  documentCount: number;
  sopCount: number;
  profile?: {
    brandVoice?: string;
    goals?: string[];
    services?: string[];
  };
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState<string | null>(null);

  useEffect(() => {
    api<Client[]>("/clients")
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const buildProfile = async (name: string) => {
    setBuilding(name);
    try {
      await api(`/clients/${encodeURIComponent(name)}/build`, { method: "POST" });
      const updated = await api<Client[]>("/clients");
      setClients(updated);
    } catch (err) { console.error(err); }
    setBuilding(null);
  };

  if (loading) return <div className="text-muted">Loading clients...</div>;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Clients</h2>

      {clients.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No clients found. Connect Google Drive and sync to discover client documents.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div key={client.name} className="bg-surface border border-border rounded-md p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{client.name}</h3>
                <button
                  onClick={() => buildProfile(client.name)}
                  disabled={building === client.name}
                  className="text-xs text-accent hover:underline disabled:opacity-50"
                >
                  {building === client.name ? "Building..." : "Build Profile"}
                </button>
              </div>
              <div className="flex gap-2 text-xs text-dim mb-3">
                <span className="px-2 py-0.5 rounded bg-surface-2">{client.documentCount} docs</span>
                <span className="px-2 py-0.5 rounded bg-surface-2">{client.sopCount} SOPs</span>
              </div>
              {client.profile?.brandVoice && (
                <p className="text-xs text-muted mb-2">
                  <span className="font-medium">Voice:</span> {client.profile.brandVoice}
                </p>
              )}
              {client.profile?.services && client.profile.services.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {client.profile.services.slice(0, 5).map((s) => (
                    <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
