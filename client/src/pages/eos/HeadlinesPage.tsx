import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Headline {
  id: string;
  content: string;
  category: string;
  shared_by: string | null;
  created_at: string;
}

export function HeadlinesPage() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Headline[]>("/eos/headlines")
      .then(setHeadlines)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted">Loading headlines...</div>;

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Headlines</h2>

      {headlines.length === 0 ? (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No headlines yet. Headlines are shared during L10 meetings.
        </div>
      ) : (
        <div className="space-y-3">
          {headlines.map((h) => (
            <div key={h.id} className="bg-surface border border-border rounded-md p-4 flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm text-foreground">{h.content}</p>
                <div className="flex gap-2 mt-2 text-xs text-dim">
                  <span className="px-2 py-0.5 rounded bg-surface-2 capitalize">{h.category}</span>
                  {h.shared_by && <span>{h.shared_by}</span>}
                  <span>{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
