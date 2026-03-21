import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UtensilsCrossed, Plus, Trash2, Zap } from 'lucide-react';
import type { FamilyMember, DietEntry } from '../types';
import { getDiet, createDietEntry, deleteDietEntry } from '../api';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'beverage'];
const DIET_TAGS = [
  'gluten-free', 'dairy-free', 'sugar-free', 'organic', 'grass-fed',
  'wild-caught', 'fermented', 'whole-food', 'processed', 'aip',
  'paleo', 'keto', 'vegan', 'vegetarian', 'elimination',
  'anti-inflammatory', 'high-protein', 'low-carb', 'low-fodmap',
];

interface OutletCtx {
  activeMember: FamilyMember | null;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '\u2600\ufe0f',
  lunch: '\ud83c\udf1e',
  dinner: '\ud83c\udf19',
  snack: '\ud83c\udf4e',
  beverage: '\u2615',
};

export function DietPage() {
  const { activeMember, addToast } = useOutletContext<OutletCtx>();
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    logged_date: new Date().toISOString().split('T')[0],
    meal_type: 'meal', description: '', tags: [] as string[],
    reactions: '', energy_level: '', notes: '',
  });

  const load = async () => {
    if (!activeMember) return;
    setLoading(true);
    try { setEntries(await getDiet(activeMember.id)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeMember?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    try {
      await createDietEntry({
        ...form,
        family_member_id: activeMember.id,
        energy_level: form.energy_level ? Number(form.energy_level) : undefined,
      });
      addToast('Diet entry logged');
      setModalOpen(false);
      setForm({ logged_date: new Date().toISOString().split('T')[0], meal_type: 'meal', description: '', tags: [], reactions: '', energy_level: '', notes: '' });
      load();
    } catch (err) { addToast(String(err), 'error'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteDietEntry(id); addToast('Entry removed'); load(); }
    catch (err) { addToast(String(err), 'error'); }
  };

  const toggleTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag] });
  };

  if (!activeMember) {
    return <EmptyState icon={UtensilsCrossed} title="Select a family member" description="Choose a family member to track diet." />;
  }

  const inputCls = 'w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500';

  const grouped = entries.reduce<Record<string, DietEntry[]>>((acc, e) => {
    (acc[e.logged_date] = acc[e.logged_date] || []).push(e);
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Diet Log</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Log Meal</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No diet entries"
          description="Log meals to track food reactions, energy levels, and patterns."
          action={{ label: 'Log Meal', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="text-xs text-gray-500 font-medium mb-2 px-1">{date}</div>
              <div className="space-y-2">
                {items.map((entry) => (
                  <div key={entry.id} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{MEAL_ICONS[entry.meal_type] || '\ud83c\udf7d\ufe0f'}</span>
                          <span className="font-medium text-sm capitalize">{entry.meal_type}</span>
                          {entry.energy_level && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-400">
                              <Zap className="w-3 h-3" /> {entry.energy_level}/10
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">{entry.description}</p>
                        {entry.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.tags.map((t) => (
                              <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-dark-600 text-gray-400">{t}</span>
                            ))}
                          </div>
                        )}
                        {entry.reactions && (
                          <p className="text-xs text-red-400 mt-1">Reaction: {entry.reactions}</p>
                        )}
                      </div>
                      <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-gray-500 hover:text-red-400">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Meal">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
              <input type="date" className={inputCls} value={form.logged_date} onChange={(e) => setForm({ ...form, logged_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Meal Type</label>
              <select className={inputCls} value={form.meal_type} onChange={(e) => setForm({ ...form, meal_type: e.target.value })}>
                {MEAL_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">What did you eat? *</label>
            <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required
              placeholder="Grilled salmon with roasted broccoli and sweet potato" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {DIET_TAGS.map((t) => (
                <button key={t} type="button" onClick={() => toggleTag(t)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    form.tags.includes(t)
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'border-dark-500 text-gray-500 hover:border-dark-400'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Energy Level: {form.energy_level || '--'}/10</label>
            <input type="range" min="1" max="10" value={form.energy_level || 5}
              onChange={(e) => setForm({ ...form, energy_level: e.target.value })}
              className="w-full accent-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Reactions</label>
            <input className={inputCls} value={form.reactions} onChange={(e) => setForm({ ...form, reactions: e.target.value })}
              placeholder="Bloating, brain fog, energy crash..." />
          </div>
          <button type="submit" className="w-full bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-600">
            Log Meal
          </button>
        </form>
      </Modal>
    </div>
  );
}
