import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { Chart, registerables } from 'chart.js';
import type { FamilyMember, ReferenceData, TrendPoint } from '../types';
import { getReferences, getMarkerTrends } from '../api';
import { EmptyState } from '../components/EmptyState';

Chart.register(...registerables);

interface OutletCtx {
  activeMember: FamilyMember | null;
}

export function TrendsPage() {
  const { activeMember } = useOutletContext<OutletCtx>();
  const [refs, setRefs] = useState<ReferenceData | null>(null);
  const [selectedMarkers, setSelectedMarkers] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, TrendPoint[]>>({});
  const [search, setSearch] = useState('');
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    getReferences().then(setRefs).catch(console.error);
  }, []);

  useEffect(() => {
    if (!activeMember || selectedMarkers.length === 0) return;
    Promise.all(
      selectedMarkers.map(async (m) => {
        const points = await getMarkerTrends(activeMember.id, m);
        return [m, points] as const;
      })
    ).then((results) => {
      const newData: Record<string, TrendPoint[]> = {};
      for (const [name, points] of results) newData[name] = points;
      setData(newData);
    });
  }, [activeMember?.id, selectedMarkers]);

  useEffect(() => {
    if (!chartRef.current || selectedMarkers.length === 0) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const allDates = new Set<string>();
    for (const points of Object.values(data)) {
      for (const p of points) allDates.add(p.test_date);
    }
    const labels = [...allDates].sort();

    const datasets = selectedMarkers.map((marker, i) => {
      const color = colors[i % colors.length];
      const points = data[marker] || [];
      return {
        label: marker,
        data: labels.map((d) => points.find((p) => p.test_date === d)?.value ?? null),
        borderColor: color,
        backgroundColor: color + '33',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true,
      };
    });

    // Add optimal range bands for first marker
    const firstData = data[selectedMarkers[0]];
    if (firstData?.[0]?.optimal_low != null) {
      datasets.push({
        label: `${selectedMarkers[0]} Optimal Range`,
        data: labels.map(() => firstData[0].optimal_high),
        borderColor: '#10b98133',
        backgroundColor: '#10b98115',
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        // @ts-expect-error fill option
        fill: { target: '+1', above: '#10b98115' },
        spanGaps: true,
      });
      datasets.push({
        label: `_low`,
        data: labels.map(() => firstData[0].optimal_low),
        borderColor: '#10b98133',
        backgroundColor: 'transparent',
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        spanGaps: true,
      });
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#9ca3af', filter: (item) => !item.text.startsWith('_') },
          },
        },
        scales: {
          x: { grid: { color: '#1e2030' }, ticks: { color: '#6b7280' } },
          y: { grid: { color: '#1e2030' }, ticks: { color: '#6b7280' } },
        },
      },
    });

    return () => { chartInstance.current?.destroy(); };
  }, [data, selectedMarkers]);

  if (!activeMember) {
    return <EmptyState icon={TrendingUp} title="Select a family member" description="Choose a family member to view trends." />;
  }

  const filteredRefs = refs
    ? Object.values(refs.markers).filter((m) =>
      !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase()))
    : [];

  const toggleMarker = (name: string) => {
    setSelectedMarkers((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name].slice(0, 6)
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Trends</h1>

      {/* Marker selection */}
      <div className="mb-4">
        <input
          className="w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markers to chart (TSH, Vitamin D, etc.)"
        />
        {search && filteredRefs.length > 0 && (
          <div className="mt-1 bg-dark-700 border border-dark-500 rounded-lg max-h-48 overflow-y-auto">
            {filteredRefs.slice(0, 15).map((r) => (
              <button key={r.name} type="button"
                onClick={() => { toggleMarker(r.name); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-dark-600 flex justify-between ${
                  selectedMarkers.includes(r.name) ? 'text-emerald-400' : ''
                }`}>
                <span>{r.name}</span>
                <span className="text-xs text-gray-500">{r.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected markers chips */}
      {selectedMarkers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {selectedMarkers.map((m) => (
            <button key={m} onClick={() => toggleMarker(m)}
              className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30">
              {m} \u00d7
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      {selectedMarkers.length > 0 ? (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4">
          <div className="h-64 sm:h-80">
            <canvas ref={chartRef} />
          </div>
        </div>
      ) : (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-8 text-center">
          <TrendingUp className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Search and select markers above to view trends over time.</p>
          <p className="text-gray-600 text-xs mt-1">You can compare up to 6 markers at once.</p>
        </div>
      )}

      {/* Data table */}
      {selectedMarkers.length === 1 && data[selectedMarkers[0]]?.length > 0 && (
        <div className="mt-4 bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-600">
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Date</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Value</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Optimal</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data[selectedMarkers[0]].map((p, i) => {
                const isOpt = p.optimal_low != null && p.optimal_high != null && p.value >= p.optimal_low && p.value <= p.optimal_high;
                return (
                  <tr key={i} className="border-b border-dark-700/50">
                    <td className="px-4 py-2 text-gray-400">{p.test_date}</td>
                    <td className="px-4 py-2 text-right font-medium">{p.value} <span className="text-gray-500 text-xs">{p.unit}</span></td>
                    <td className="px-4 py-2 text-right text-gray-500">{p.optimal_low}-{p.optimal_high}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${isOpt ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {isOpt ? 'Optimal' : 'Review'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
