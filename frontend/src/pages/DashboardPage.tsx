import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  FlaskConical, HeartPulse, Pill, UtensilsCrossed,
  TrendingUp, AlertTriangle, CheckCircle, Activity,
  ChevronRight, Sparkles,
} from 'lucide-react';
import type { FamilyMember, DashboardSummary, BiomarkerSummary } from '../types';
import { getDashboard, getBiomarkerSummary } from '../api';
import { EmptyState } from '../components/EmptyState';

function getMarkerStatus(value: number, optLow: number | null, optHigh: number | null) {
  if (optLow != null && optHigh != null && value >= optLow && value <= optHigh) return 'optimal';
  return 'out-of-range';
}

export function DashboardPage() {
  const { activeMember } = useOutletContext<{ activeMember: FamilyMember | null }>();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [biomarkers, setBiomarkers] = useState<BiomarkerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeMember) return;
    setLoading(true);
    Promise.all([
      getDashboard(activeMember.id),
      getBiomarkerSummary(activeMember.id),
    ])
      .then(([dashData, bioData]) => {
        setData(dashData);
        setBiomarkers(bioData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeMember?.id]);

  if (!activeMember) {
    return (
      <EmptyState
        icon={Activity}
        title="No family members yet"
        description="Add your first family member to start tracking health data."
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

  const activeProtocols = data?.protocols.filter((p) => p.status === 'active') || [];
  const outOfRangeMarkers: { name: string; value: number; unit: string }[] = [];
  if (data?.recentLabs[0]?.markers) {
    for (const m of data.recentLabs[0].markers) {
      if (getMarkerStatus(m.value, m.optimal_low, m.optimal_high) === 'out-of-range') {
        outOfRangeMarkers.push({ name: m.name, value: m.value, unit: m.unit });
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{activeMember.name}'s Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {activeMember.role === 'child' ? 'Child' : 'Adult'}
          {activeMember.health_goals?.length ? ` \u00b7 Goals: ${activeMember.health_goals.join(', ')}` : ''}
        </p>
      </div>

      {/* Biomarker Summary Panel - Function Health Style */}
      {biomarkers && biomarkers.totalMarkers > 0 && (
        <button
          onClick={() => navigate('/biomarkers')}
          className="w-full bg-dark-800 border border-dark-600 rounded-xl p-5 mb-6 text-left
            hover:border-emerald-500/30 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{biomarkers.totalMarkers} Biomarkers</h2>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          </div>

          <div className="flex gap-6 mb-4">
            <div>
              <div className="text-3xl font-bold text-emerald-400">{biomarkers.totalInRange}</div>
              <div className="text-xs text-gray-500">In Range</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400">{biomarkers.totalOutOfRange}</div>
              <div className="text-xs text-gray-500">Out of Range</div>
            </div>
            {biomarkers.totalOther > 0 && (
              <div>
                <div className="text-3xl font-bold text-gray-400">{biomarkers.totalOther}</div>
                <div className="text-xs text-gray-500">Other</div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-dark-600">
            {biomarkers.totalInRange > 0 && (
              <div className="bg-emerald-400 rounded-l-full transition-all"
                style={{ width: `${(biomarkers.totalInRange / biomarkers.totalMarkers) * 100}%` }} />
            )}
            {biomarkers.totalOutOfRange > 0 && (
              <div className="bg-red-400 transition-all"
                style={{ width: `${(biomarkers.totalOutOfRange / biomarkers.totalMarkers) * 100}%` }} />
            )}
            {biomarkers.totalOther > 0 && (
              <div className="bg-gray-500 rounded-r-full transition-all"
                style={{ width: `${(biomarkers.totalOther / biomarkers.totalMarkers) * 100}%` }} />
            )}
          </div>

          <div className="text-xs text-gray-500 mt-2">
            View all categories →
          </div>
        </button>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button onClick={() => navigate('/labs')}
          className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-left hover:border-dark-500 transition-colors">
          <FlaskConical className="w-5 h-5 text-blue-400 mb-2" />
          <div className="text-2xl font-bold">{data?.recentLabs.length || 0}</div>
          <div className="text-xs text-gray-500">Lab Panels</div>
        </button>
        <button onClick={() => navigate('/symptoms')}
          className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-left hover:border-dark-500 transition-colors">
          <HeartPulse className="w-5 h-5 text-pink-400 mb-2" />
          <div className="text-2xl font-bold">{data?.recentSymptoms.length || 0}</div>
          <div className="text-xs text-gray-500">Recent Symptoms</div>
        </button>
        <button onClick={() => navigate('/protocols')}
          className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-left hover:border-dark-500 transition-colors">
          <Pill className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-2xl font-bold">{activeProtocols.length}</div>
          <div className="text-xs text-gray-500">Active Protocols</div>
        </button>
        <button onClick={() => navigate('/diet')}
          className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-left hover:border-dark-500 transition-colors">
          <UtensilsCrossed className="w-5 h-5 text-orange-400 mb-2" />
          <div className="text-2xl font-bold">{data?.recentDiet.length || 0}</div>
          <div className="text-xs text-gray-500">Diet Entries</div>
        </button>
      </div>

      {/* Personalized Protocols shortcut */}
      <button
        onClick={() => navigate('/protocols')}
        className="w-full bg-dark-800 border border-dark-600 rounded-xl p-4 mb-4 flex items-center gap-3
          hover:border-amber-500/30 transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-left flex-1">
          <div className="font-medium text-sm">Personalized Protocols</div>
          <div className="text-xs text-gray-500">Based on your test results and health history</div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-amber-400" />
      </button>

      {/* Alerts - markers out of optimal range */}
      {outOfRangeMarkers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-amber-300">Markers Outside Optimal Range</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {outOfRangeMarkers.slice(0, 6).map((m) => (
              <div key={m.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{m.name}</span>
                <span className="text-amber-300 font-medium">{m.value} {m.unit}</span>
              </div>
            ))}
          </div>
          {outOfRangeMarkers.length > 6 && (
            <button onClick={() => navigate('/labs')} className="text-xs text-amber-400 mt-2 hover:underline">
              +{outOfRangeMarkers.length - 6} more
            </button>
          )}
        </div>
      )}

      {/* Recent symptoms */}
      {data?.recentSymptoms && data.recentSymptoms.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-pink-400" />
              Recent Symptoms
            </h3>
            <button onClick={() => navigate('/symptoms')} className="text-xs text-emerald-400 hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-2">
            {data.recentSymptoms.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">{s.symptom}</span>
                  <span className="text-xs text-gray-500">{s.body_system}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className={`w-1.5 h-3 rounded-sm ${i < s.severity ? 'bg-pink-500' : 'bg-dark-600'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 w-16">{s.logged_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active protocols */}
      {activeProtocols.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Active Protocols
            </h3>
            <button onClick={() => navigate('/protocols')} className="text-xs text-emerald-400 hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-2">
            {activeProtocols.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-300">{p.name}</span>
                  {p.dosage && <span className="text-gray-500 ml-2">{p.dosage}</span>}
                </div>
                <span className="text-xs text-gray-500 capitalize">{p.frequency || p.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/trends')}
          className="bg-dark-800 border border-dark-600 rounded-xl p-4 flex items-center gap-3 hover:border-emerald-500/30 transition-colors"
        >
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <div className="text-left">
            <div className="font-medium text-sm">View Trends</div>
            <div className="text-xs text-gray-500">Track markers over time</div>
          </div>
        </button>
        <button
          onClick={() => navigate('/foods')}
          className="bg-dark-800 border border-dark-600 rounded-xl p-4 flex items-center gap-3 hover:border-emerald-500/30 transition-colors"
        >
          <UtensilsCrossed className="w-5 h-5 text-amber-400" />
          <div className="text-left">
            <div className="font-medium text-sm">Food Guide</div>
            <div className="text-xs text-gray-500">Foods to enjoy & limit</div>
          </div>
        </button>
      </div>
    </div>
  );
}
