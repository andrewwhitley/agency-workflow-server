import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Shield, Heart, Droplets, Droplet, Leaf, ShieldCheck, Zap, Apple,
  Gauge, Beaker, ChevronRight, ChevronDown, Activity, Search,
  FlaskConical,
} from 'lucide-react';
import type { FamilyMember, BiomarkerSummary, BiomarkerCategoryResult, BiomarkerMarkerDetail } from '../types';
import { getBiomarkerSummary } from '../api';
import { EmptyState } from '../components/EmptyState';

const ICON_MAP: Record<string, typeof Heart> = {
  Shield, Heart, Droplets, Droplet, Leaf, ShieldCheck, Zap, Apple, Gauge, Beaker,
};

function StatusDot({ status }: { status: string }) {
  if (status === 'in-range') return <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />;
  if (status === 'out-of-range') return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />;
}

function CategoryBar({ result }: { result: BiomarkerCategoryResult }) {
  const total = result.inRange + result.outOfRange + result.other;
  if (total === 0) return null;
  const greenWidth = (result.inRange / total) * 100;
  const redWidth = (result.outOfRange / total) * 100;
  const grayWidth = (result.other / total) * 100;

  return (
    <div className="flex gap-0.5 h-2.5 w-full max-w-48 rounded-full overflow-hidden bg-dark-600">
      {result.inRange > 0 && (
        <div className="bg-emerald-400 rounded-l-full" style={{ width: `${greenWidth}%` }} />
      )}
      {result.outOfRange > 0 && (
        <div className="bg-red-400" style={{ width: `${redWidth}%` }} />
      )}
      {result.other > 0 && (
        <div className="bg-gray-500 rounded-r-full" style={{ width: `${grayWidth}%` }} />
      )}
    </div>
  );
}

function MarkerRow({ marker }: { marker: BiomarkerMarkerDetail }) {
  const rangeLabel = marker.optimal_low != null && marker.optimal_high != null
    ? `${marker.optimal_low} - ${marker.optimal_high}`
    : '—';

  return (
    <div className="flex items-center justify-between py-2.5 px-3 border-b border-dark-600/50 last:border-0">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <StatusDot status={marker.status} />
        <span className="text-sm text-gray-200 truncate">{marker.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-sm font-medium ${
          marker.status === 'in-range' ? 'text-emerald-400' :
          marker.status === 'out-of-range' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {marker.value} <span className="text-xs text-gray-500">{marker.unit}</span>
        </span>
        <span className="text-xs text-gray-500 w-24 text-right hidden sm:block">
          Optimal: {rangeLabel}
        </span>
      </div>
    </div>
  );
}

function CategoryCard({ result }: { result: BiomarkerCategoryResult }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICON_MAP[result.icon] || Shield;

  return (
    <div className="border-b border-dark-600 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-dark-700/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-dark-600/50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-amber-200/70" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-gray-100 mb-1.5">{result.label}</div>
          <div className="flex items-center gap-2">
            <CategoryBar result={result} />
            <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
              {result.inRange > 0 && (
                <span className="text-emerald-400 font-medium">{result.inRange}</span>
              )}
              {result.outOfRange > 0 && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-red-400 font-medium">{result.outOfRange}</span>
                </>
              )}
              {result.other > 0 && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  <span className="text-gray-500">{result.other}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="bg-dark-800/50 mx-2 mb-3 rounded-lg">
          {result.markers.map((m) => (
            <MarkerRow key={m.name} marker={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BiomarkersPage() {
  const { activeMember } = useOutletContext<{ activeMember: FamilyMember | null }>();
  const navigate = useNavigate();
  const [data, setData] = useState<BiomarkerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!activeMember) return;
    setLoading(true);
    getBiomarkerSummary(activeMember.id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeMember?.id]);

  if (!activeMember) {
    return (
      <EmptyState
        icon={Activity}
        title="No family members yet"
        description="Add a family member to view biomarker categories."
        action={{ label: 'Add Family Member', onClick: () => navigate('/family') }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.totalMarkers === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No biomarker data"
        description="Add lab results to see your biomarker categories and status."
        action={{ label: 'Add Lab Results', onClick: () => navigate('/labs') }}
      />
    );
  }

  const filteredResults = search
    ? data.results.filter((r) =>
        r.label.toLowerCase().includes(search.toLowerCase()) ||
        r.markers.some((m) => m.name.toLowerCase().includes(search.toLowerCase()))
      )
    : data.results;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Summary header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Biomarkers</h1>
        {data.testDate && (
          <p className="text-gray-500 text-sm">
            Latest results from {new Date(data.testDate).toLocaleDateString()}
            {data.labName ? ` · ${data.labName}` : ''}
          </p>
        )}
      </div>

      {/* Overall summary - Function Health style */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-5 mb-6">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold mb-1">{data.totalMarkers}</div>
          <div className="text-sm text-gray-500">Biomarkers Tested</div>
        </div>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-400">{data.totalInRange}</div>
            <div className="text-xs text-gray-500 mt-0.5">In Range</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{data.totalOutOfRange}</div>
            <div className="text-xs text-gray-500 mt-0.5">Out of Range</div>
          </div>
          {data.totalOther > 0 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-400">{data.totalOther}</div>
              <div className="text-xs text-gray-500 mt-0.5">Other</div>
            </div>
          )}
        </div>

        {/* Overall bar */}
        <div className="mt-4 flex gap-0.5 h-3 rounded-full overflow-hidden bg-dark-600">
          {data.totalInRange > 0 && (
            <div className="bg-emerald-400 rounded-l-full transition-all"
              style={{ width: `${(data.totalInRange / data.totalMarkers) * 100}%` }} />
          )}
          {data.totalOutOfRange > 0 && (
            <div className="bg-red-400 transition-all"
              style={{ width: `${(data.totalOutOfRange / data.totalMarkers) * 100}%` }} />
          )}
          {data.totalOther > 0 && (
            <div className="bg-gray-500 rounded-r-full transition-all"
              style={{ width: `${(data.totalOther / data.totalMarkers) * 100}%` }} />
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search categories or markers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg pl-9 pr-4 py-2.5 text-sm
            placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Categories section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Categories</h2>
        <span className="text-xs text-gray-600">{filteredResults.length} categories</span>
      </div>

      {/* Category list */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
        {filteredResults.map((result) => (
          <CategoryCard key={result.id} result={result} />
        ))}
        {filteredResults.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            No matching categories found
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>Optimal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span>Out of Range</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
          <span>Other</span>
        </div>
      </div>
    </div>
  );
}
