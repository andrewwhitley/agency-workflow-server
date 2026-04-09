import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useClientSelector } from "@/hooks/useClientSelector";
import { ClientSelector } from "@/components/ClientSelector";

interface HeatmapPoint {
  row?: number;
  col?: number;
  grid_row?: number;
  grid_col?: number;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  position: number | null;
  business_found?: boolean;
  topCompetitor?: string | null;
  top_competitor?: string | null;
}

interface HeatmapScan {
  id: string;
  keyword: string;
  center_lat: number;
  center_lng: number;
  grid_size: number;
  radius_miles: number;
  business_name: string | null;
  scanned_at: string;
  cost_estimate: number;
  point_count?: number;
  found_count?: number;
  top3_count?: number;
}

interface ScanResponse {
  scanId: string;
  keyword: string;
  gridSize: number;
  radiusMiles: number;
  businessName: string;
  totalPoints: number;
  pointsFound: number;
  top3Count: number;
  top10Count: number;
  averagePosition: number | null;
  coverage: string;
  points: HeatmapPoint[];
}

export function LocalHeatmapPage() {
  const { clients, slug, setSlug, loading: clientsLoading } = useClientSelector();
  const [scans, setScans] = useState<HeatmapScan[]>([]);
  const [loading, setLoading] = useState(false);

  // New scan form
  const [showNew, setShowNew] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [centerLat, setCenterLat] = useState("");
  const [centerLng, setCenterLng] = useState("");
  const [gridSize, setGridSize] = useState(5);
  const [radiusMiles, setRadiusMiles] = useState(1.0);
  const [businessName, setBusinessName] = useState("");
  const [scanning, setScanning] = useState(false);

  // Selected scan view
  const [selectedScan, setSelectedScan] = useState<ScanResponse | null>(null);
  const [loadingScan, setLoadingScan] = useState(false);

  const fetchScans = () => {
    if (!slug) return;
    setLoading(true);
    api<HeatmapScan[]>(`/seo/clients/${slug}/heatmap/scans`)
      .then(setScans)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchScans(); }, [slug]);

  const runScan = async () => {
    if (!slug || !keyword || !centerLat || !centerLng) return;
    setScanning(true);
    try {
      const result = await api<ScanResponse>(`/seo/clients/${slug}/heatmap/scan`, {
        method: "POST",
        body: JSON.stringify({
          keyword,
          centerLat: parseFloat(centerLat),
          centerLng: parseFloat(centerLng),
          gridSize,
          radiusMiles,
          businessName: businessName || undefined,
        }),
      });
      setSelectedScan(result);
      setShowNew(false);
      fetchScans();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Scan failed");
    }
    setScanning(false);
  };

  const loadScan = async (scanId: string) => {
    if (!slug) return;
    setLoadingScan(true);
    try {
      const data = await api<{ scan: HeatmapScan; points: HeatmapPoint[] }>(`/seo/clients/${slug}/heatmap/scans/${scanId}`);
      // Normalize point format
      const points: HeatmapPoint[] = data.points.map((p) => ({
        ...p,
        row: p.grid_row,
        col: p.grid_col,
        lat: p.latitude,
        lng: p.longitude,
      }));
      setSelectedScan({
        scanId: data.scan.id,
        keyword: data.scan.keyword,
        gridSize: data.scan.grid_size,
        radiusMiles: data.scan.radius_miles,
        businessName: data.scan.business_name || "",
        totalPoints: points.length,
        pointsFound: points.filter((p) => p.position !== null).length,
        top3Count: points.filter((p) => p.position !== null && p.position <= 3).length,
        top10Count: points.filter((p) => p.position !== null && p.position <= 10).length,
        averagePosition: null,
        coverage: "",
        points,
      });
    } catch (err) { console.error(err); }
    setLoadingScan(false);
  };

  const deleteScan = async (scanId: string) => {
    if (!confirm("Delete this scan?")) return;
    await api(`/seo/clients/${slug}/heatmap/scans/${scanId}`, { method: "DELETE" });
    if (selectedScan?.scanId === scanId) setSelectedScan(null);
    fetchScans();
  };

  const positionColor = (pos: number | null) => {
    if (pos === null) return "bg-gray-200 text-gray-500";
    if (pos <= 3) return "bg-emerald-500 text-white";
    if (pos <= 10) return "bg-amber-400 text-white";
    if (pos <= 20) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  const estimatedCost = (gridSize * gridSize * 0.0006).toFixed(3);

  if (clientsLoading) return <div className="text-muted">Loading...</div>;

  // Build grid display
  const renderGrid = () => {
    if (!selectedScan) return null;
    const grid: (HeatmapPoint | null)[][] = [];
    for (let r = 0; r < selectedScan.gridSize; r++) {
      grid[r] = new Array(selectedScan.gridSize).fill(null);
    }
    for (const p of selectedScan.points) {
      const r = p.row ?? p.grid_row ?? 0;
      const c = p.col ?? p.grid_col ?? 0;
      if (grid[r]) grid[r][c] = p;
    }

    return (
      <div className="inline-block">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${selectedScan.gridSize}, minmax(60px, 80px))` }}>
          {grid.flat().map((p, i) => (
            <div key={i}
              className={cn("aspect-square rounded flex items-center justify-center font-bold text-lg shadow-sm",
                positionColor(p?.position ?? null)
              )}
              title={p ? `Position: ${p.position ?? "Not found"}\n${(p.lat ?? p.latitude)?.toFixed(4)}, ${(p.lng ?? p.longitude)?.toFixed(4)}${p.topCompetitor || p.top_competitor ? `\nTop: ${p.topCompetitor || p.top_competitor}` : ""}` : ""}>
              {p?.position ?? (p ? "—" : "")}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-foreground">Local Heatmap (GBP Grid Scan)</h2>
        <div className="flex gap-2 flex-wrap">
          <ClientSelector clients={clients} value={slug} onChange={setSlug} />
          <button onClick={() => setShowNew(true)} disabled={!slug}
            className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-40">
            New Scan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan List */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Scans</h3>
          {loading ? (
            <div className="text-sm text-muted">Loading scans...</div>
          ) : scans.length === 0 ? (
            <div className="bg-surface border border-border rounded-md p-4 text-center text-sm text-muted">
              No scans yet. Run your first heatmap to see how this client ranks across their service area.
            </div>
          ) : (
            <div className="space-y-2">
              {scans.map((s) => (
                <button key={s.id} onClick={() => loadScan(s.id)}
                  className={cn("w-full text-left p-3 rounded-md border transition-colors",
                    selectedScan?.scanId === s.id ? "border-accent bg-accent/10" : "border-border bg-surface hover:bg-surface-2"
                  )}>
                  <div className="font-medium text-sm text-foreground truncate">{s.keyword}</div>
                  <div className="text-xs text-dim mt-1">
                    {s.grid_size}×{s.grid_size} grid · {s.radius_miles}mi radius
                  </div>
                  <div className="text-xs text-dim mt-0.5">
                    {new Date(s.scanned_at).toLocaleDateString()} · {s.found_count}/{s.point_count} found
                  </div>
                  {s.top3_count != null && (
                    <div className="text-xs mt-1">
                      <span className="text-success">{s.top3_count} top-3</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Heatmap Display */}
        <div className="lg:col-span-2">
          {loadingScan ? (
            <div className="text-sm text-muted">Loading scan...</div>
          ) : selectedScan ? (
            <div className="bg-surface border border-border rounded-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedScan.keyword}</h3>
                  <p className="text-xs text-muted">{selectedScan.businessName} · {selectedScan.gridSize}×{selectedScan.gridSize} grid · {selectedScan.radiusMiles}mi radius</p>
                </div>
                <button onClick={() => deleteScan(selectedScan.scanId)} className="text-xs text-destructive hover:underline">Delete</button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-surface-2 rounded-md p-3"><div className="text-2xl font-bold text-foreground">{selectedScan.pointsFound}/{selectedScan.totalPoints}</div><div className="text-xs text-muted">Coverage</div></div>
                <div className="bg-surface-2 rounded-md p-3"><div className="text-2xl font-bold text-success">{selectedScan.top3Count}</div><div className="text-xs text-muted">Top 3</div></div>
                <div className="bg-surface-2 rounded-md p-3"><div className="text-2xl font-bold text-accent">{selectedScan.top10Count}</div><div className="text-xs text-muted">Top 10</div></div>
                <div className="bg-surface-2 rounded-md p-3"><div className="text-2xl font-bold text-foreground">{selectedScan.averagePosition?.toFixed(1) ?? "—"}</div><div className="text-xs text-muted">Avg Pos</div></div>
              </div>

              {/* Grid */}
              <div className="flex justify-center">
                {renderGrid()}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Top 3</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> Top 10</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> 11-20</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> 21+</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200" /> Not found</span>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-md p-12 text-center text-muted">
              Select a scan from the list or run a new one.
            </div>
          )}
        </div>
      </div>

      {/* New Scan Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">New Heatmap Scan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Keyword</label>
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., functional medicine clinic"
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Business Name (optional)</label>
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Defaults to client company name"
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Center Latitude</label>
                  <input value={centerLat} onChange={(e) => setCenterLat(e.target.value)}
                    placeholder="e.g., 41.3963"
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Center Longitude</label>
                  <input value={centerLng} onChange={(e) => setCenterLng(e.target.value)}
                    placeholder="e.g., -72.8967"
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>
              <p className="text-xs text-dim">
                Tip: get the lat/lng from Google Maps — right-click on the business location and copy the coordinates.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Grid Size</label>
                  <select value={gridSize} onChange={(e) => setGridSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm">
                    <option value="3">3×3 (9 points)</option>
                    <option value="5">5×5 (25 points)</option>
                    <option value="7">7×7 (49 points)</option>
                    <option value="9">9×9 (81 points)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Radius (miles)</label>
                  <input type="number" step="0.5" value={radiusMiles} onChange={(e) => setRadiusMiles(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                </div>
              </div>
              <div className="bg-surface-2 rounded-md p-3 text-xs text-dim">
                Estimated cost: <strong className="text-foreground">${estimatedCost}</strong> ({gridSize * gridSize} DataForSEO Maps API calls)
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={runScan} disabled={scanning || !keyword || !centerLat || !centerLng}
                className={cn("px-4 py-2 rounded-md text-sm font-medium",
                  scanning || !keyword || !centerLat || !centerLng ? "bg-surface-2 text-dim" : "bg-accent text-white hover:bg-accent/90")}>
                {scanning ? "Scanning..." : "Run Scan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
