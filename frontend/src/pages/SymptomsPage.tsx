import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { HeartPulse, Plus, Trash2 } from 'lucide-react';
import type { FamilyMember, Symptom } from '../types';
import { getSymptoms, createSymptom, deleteSymptom } from '../api';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

const BODY_SYSTEMS = [
  'Digestive', 'Neurological', 'Musculoskeletal', 'Cardiovascular',
  'Respiratory', 'Endocrine', 'Immune', 'Dermatological',
  'Urological', 'Reproductive', 'Mental/Emotional', 'Sleep', 'Energy', 'Other',
];

interface OutletCtx {
  activeMember: FamilyMember | null;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function SymptomsPage() {
  const { activeMember, addToast } = useOutletContext<OutletCtx>();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    logged_date: new Date().toISOString().split('T')[0],
    symptom: '', severity: 5, body_system: '', notes: '',
  });

  const load = async () => {
    if (!activeMember) return;
    setLoading(true);
    try { setSymptoms(await getSymptoms(activeMember.id)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeMember?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    try {
      await createSymptom({ ...form, family_member_id: activeMember.id });
      addToast('Symptom logged');
      setModalOpen(false);
      setForm({ logged_date: new Date().toISOString().split('T')[0], symptom: '', severity: 5, body_system: '', notes: '' });
      load();
    } catch (err) { addToast(String(err), 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSymptom(id);
      addToast('Symptom removed');
      load();
    } catch (err) { addToast(String(err), 'error'); }
  };

  if (!activeMember) {
    return <EmptyState icon={HeartPulse} title="Select a family member" description="Choose a family member to log symptoms." />;
  }

  const inputCls = 'w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500';

  // Group by date
  const grouped = symptoms.reduce<Record<string, Symptom[]>>((acc, s) => {
    (acc[s.logged_date] = acc[s.logged_date] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Symptoms</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Log Symptom</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : symptoms.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No symptoms logged"
          description="Track symptoms over time to find patterns and correlations."
          action={{ label: 'Log Symptom', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="text-xs text-gray-500 font-medium mb-2 px-1">{date}</div>
              <div className="space-y-2">
                {items.map((s) => (
                  <div key={s.id} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{s.symptom}</span>
                          {s.body_system && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 text-gray-400">{s.body_system}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 10 }, (_, i) => (
                              <div key={i} className={`w-2 h-4 rounded-sm ${
                                i < s.severity
                                  ? s.severity <= 3 ? 'bg-emerald-500' : s.severity <= 6 ? 'bg-amber-500' : 'bg-red-500'
                                  : 'bg-dark-600'
                              }`} />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">{s.severity}/10</span>
                        </div>
                        {s.notes && <p className="text-xs text-gray-500 mt-1">{s.notes}</p>}
                      </div>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-500 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Symptom">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
            <input type="date" className={inputCls} value={form.logged_date} onChange={(e) => setForm({ ...form, logged_date: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Symptom *</label>
            <input className={inputCls} value={form.symptom} onChange={(e) => setForm({ ...form, symptom: e.target.value })} placeholder="Headache, fatigue, bloating..." required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Severity: {form.severity}/10</label>
            <input type="range" min="1" max="10" value={form.severity}
              onChange={(e) => setForm({ ...form, severity: Number(e.target.value) })}
              className="w-full accent-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Body System</label>
            <select className={inputCls} value={form.body_system} onChange={(e) => setForm({ ...form, body_system: e.target.value })}>
              <option value="">--</option>
              {BODY_SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-600">
            Log Symptom
          </button>
        </form>
      </Modal>
    </div>
  );
}
