import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FlaskConical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { FamilyMember, LabResult, ReferenceData, MarkerReference } from '../types';
import { getLabs, createLab, deleteLab, getReferences } from '../api';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

interface OutletCtx {
  activeMember: FamilyMember | null;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function MarkerBadge({ value, optLow, optHigh }: { value: number; optLow: number | null; optHigh: number | null }) {
  if (optLow == null || optHigh == null) return <span className="text-xs text-gray-500">--</span>;
  const isOptimal = value >= optLow && value <= optHigh;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${isOptimal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
      {isOptimal ? 'Optimal' : 'Review'}
    </span>
  );
}

function LabForm({ refs, onSave, onCancel }: {
  refs: ReferenceData | null;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    test_date: new Date().toISOString().split('T')[0],
    lab_name: '',
    test_type: '',
    notes: '',
  });
  const [markers, setMarkers] = useState<{ name: string; value: string; unit: string }[]>([]);
  const [search, setSearch] = useState('');

  const filteredRefs = refs
    ? Object.values(refs.markers).filter((m) =>
      !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase()))
    : [];

  const addMarker = (ref: MarkerReference) => {
    if (markers.some((m) => m.name === ref.name)) return;
    setMarkers([...markers, { name: ref.name, value: '', unit: ref.unit }]);
    setSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      markers: markers.filter((m) => m.value).map((m) => ({
        name: m.name,
        value: Number(m.value),
        unit: m.unit,
      })),
    });
  };

  const inputCls = 'w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Test Date *</label>
          <input type="date" className={inputCls} value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Lab Name</label>
          <input className={inputCls} value={form.lab_name} onChange={(e) => setForm({ ...form, lab_name: e.target.value })} placeholder="Quest, LabCorp..." />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Test Type</label>
        <input className={inputCls} value={form.test_type} onChange={(e) => setForm({ ...form, test_type: e.target.value })} placeholder="Comprehensive Metabolic, Thyroid..." />
      </div>

      {/* Marker search */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Add Markers</label>
        <input
          className={inputCls}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search markers (TSH, Vitamin D, etc.)"
        />
        {search && filteredRefs.length > 0 && (
          <div className="mt-1 bg-dark-700 border border-dark-500 rounded-lg max-h-40 overflow-y-auto">
            {filteredRefs.slice(0, 10).map((r) => (
              <button key={r.name} type="button"
                onClick={() => addMarker(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-dark-600 flex justify-between">
                <span>{r.name}</span>
                <span className="text-xs text-gray-500">{r.category} ({r.unit})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Added markers */}
      {markers.length > 0 && (
        <div className="space-y-2">
          {markers.map((m, i) => (
            <div key={m.name} className="flex items-center gap-2">
              <span className="text-sm text-gray-300 w-40 truncate">{m.name}</span>
              <input
                type="number"
                step="any"
                className="flex-1 bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
                value={m.value}
                onChange={(e) => {
                  const updated = [...markers];
                  updated[i] = { ...m, value: e.target.value };
                  setMarkers(updated);
                }}
                placeholder="Value"
              />
              <span className="text-xs text-gray-500 w-12">{m.unit}</span>
              <button type="button" onClick={() => setMarkers(markers.filter((_, j) => j !== i))}
                className="p-1 text-gray-500 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-600">
          Save Lab Results
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
      </div>
    </form>
  );
}

export function LabsPage() {
  const { activeMember, addToast } = useOutletContext<OutletCtx>();
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [refs, setRefs] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    if (!activeMember) return;
    setLoading(true);
    try {
      const [labData, refData] = await Promise.all([getLabs(activeMember.id), getReferences()]);
      setLabs(labData);
      setRefs(refData);
      if (labData.length > 0) setExpanded(labData[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeMember?.id]);

  const handleSave = async (data: Record<string, unknown>) => {
    if (!activeMember) return;
    try {
      await createLab({ ...data, family_member_id: activeMember.id });
      addToast('Lab results saved');
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(String(err), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lab result?')) return;
    try {
      await deleteLab(id);
      addToast('Lab deleted');
      load();
    } catch (err) {
      addToast(String(err), 'error');
    }
  };

  if (!activeMember) {
    return <EmptyState icon={FlaskConical} title="Select a family member" description="Choose a family member to view their lab results." />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Lab Results</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Results</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : labs.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No lab results yet"
          description="Add lab results to track biomarkers with functional medicine optimal ranges."
          action={{ label: 'Add Lab Results', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {labs.map((lab) => (
            <div key={lab.id} className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === lab.id ? null : lab.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <FlaskConical className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{lab.test_type || lab.lab_name || 'Lab Panel'}</div>
                  <div className="text-xs text-gray-500">
                    {lab.test_date}
                    {lab.lab_name && ` \u00b7 ${lab.lab_name}`}
                    {lab.markers && ` \u00b7 ${lab.markers.length} markers`}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(lab.id); }}
                  className="p-2 text-gray-500 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
                {expanded === lab.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>

              {expanded === lab.id && lab.markers && lab.markers.length > 0 && (
                <div className="px-4 pb-4 border-t border-dark-600 pt-3">
                  <div className="space-y-1.5">
                    {lab.markers.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm py-1">
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-300">{m.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{m.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{m.value} <span className="text-xs text-gray-500">{m.unit}</span></span>
                          <MarkerBadge value={m.value} optLow={m.optimal_low} optHigh={m.optimal_high} />
                          {m.optimal_low != null && m.optimal_high != null && (
                            <span className="text-xs text-gray-600 hidden sm:inline">({m.optimal_low}-{m.optimal_high})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Lab Results" wide>
        <LabForm refs={refs} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
