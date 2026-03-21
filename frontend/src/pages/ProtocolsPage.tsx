import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Pill, Plus, Trash2, Pause, Play, CheckCircle,
  Sparkles, Dumbbell, UtensilsCrossed, Moon, Loader2,
  ChevronRight, Beaker, Brain, ShieldCheck,
} from 'lucide-react';
import type { FamilyMember, Protocol } from '../types';
import { getProtocols, createProtocol, updateProtocol, deleteProtocol, streamChat } from '../api';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

const CATEGORIES = ['supplement', 'diet', 'lifestyle', 'treatment', 'detox', 'exercise', 'stress-management', 'sleep', 'other'];

interface OutletCtx {
  activeMember: FamilyMember | null;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PROTOCOL_TEMPLATES = [
  { id: 'whole-body', label: 'Whole body', description: 'One protocol across food, fitness, sleep and supplements, based on your health data.', icon: ShieldCheck, iconLabel: '360' },
  { id: 'supplements', label: 'Daily supplements', description: 'List of supplements and time-based schedule, based on your health data.', icon: Beaker },
  { id: 'meal-plan', label: 'One week of dinners', description: 'Detailed meal plan and recipes to improve key biomarkers, based on your health data.', icon: UtensilsCrossed },
  { id: 'sleep', label: 'Sleep better', description: 'Sleep routines and supplements, based on your health data.', icon: Moon },
  { id: 'workout', label: 'Workout routine', description: 'Customizable fitness plan based on your health data.', icon: Dumbbell },
  { id: 'stress', label: 'Stress and anxiety relief', description: 'Quick practices to reduce stress and anxiety based on your health data.', icon: Brain },
  { id: 'grocery', label: 'Grocery list', description: 'Grocery list, based on your health data.', icon: UtensilsCrossed },
  { id: 'muscle', label: 'Muscle growth', description: 'Nutrition and workouts for muscle growth based on your health data.', icon: Dumbbell },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  paused: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-blue-500/20 text-blue-400',
  discontinued: 'bg-gray-500/20 text-gray-400',
};

export function ProtocolsPage() {
  const { activeMember, addToast } = useOutletContext<OutletCtx>();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [contentTitle, setContentTitle] = useState('');
  const [form, setForm] = useState({
    name: '', category: 'supplement', description: '', dosage: '',
    frequency: '', start_date: new Date().toISOString().split('T')[0],
    end_date: '', notes: '',
  });

  const load = async () => {
    if (!activeMember) return;
    setLoading(true);
    try { setProtocols(await getProtocols(activeMember.id)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeMember?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    try {
      await createProtocol({ ...form, family_member_id: activeMember.id });
      addToast('Protocol added');
      setModalOpen(false);
      setForm({ name: '', category: 'supplement', description: '', dosage: '', frequency: '', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' });
      load();
    } catch (err) { addToast(String(err), 'error'); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateProtocol(id, { status });
      load();
    } catch (err) { addToast(String(err), 'error'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteProtocol(id); addToast('Protocol removed'); load(); }
    catch (err) { addToast(String(err), 'error'); }
  };

  const handleGenerateProtocol = (templateId: string) => {
    if (!activeMember) return;
    const template = PROTOCOL_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setGeneratingId(templateId);
    setContentTitle(template.label);
    setGeneratedContent('');
    setContentModalOpen(true);

    const prompt = `Create a detailed, personalized "${template.label}" protocol for ${activeMember.name}.

Context about this protocol type: ${template.description}

Consider their health profile:
- Conditions: ${activeMember.conditions?.join(', ') || 'None listed'}
- Allergies: ${activeMember.allergies?.join(', ') || 'None listed'}
- Health goals: ${activeMember.health_goals?.join(', ') || 'General wellness'}
- Sex: ${activeMember.sex || 'Not specified'}
- Age: ${activeMember.date_of_birth ? Math.floor((Date.now() - new Date(activeMember.date_of_birth).getTime()) / 31557600000) : 'Unknown'}

Format with clear sections using markdown headers (##), bullet points, and timing. Be specific with dosages, brands when relevant, and explain WHY each recommendation based on their markers. Keep it actionable and practical.`;

    let content = '';
    streamChat(prompt, activeMember.id, undefined, (event) => {
      if (event.type === 'text') {
        content += event.content;
        setGeneratedContent(content);
      } else if (event.type === 'done' || event.type === 'error') {
        setGeneratingId(null);
      }
    });
  };

  if (!activeMember) {
    return <EmptyState icon={Pill} title="Select a family member" description="Choose a family member to manage protocols." />;
  }

  const inputCls = 'w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500';

  const active = protocols.filter((p) => p.status === 'active');
  const paused = protocols.filter((p) => p.status === 'paused');
  const other = protocols.filter((p) => p.status !== 'active' && p.status !== 'paused');

  const renderProtocol = (p: Protocol) => (
    <div key={p.id} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm">{p.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 text-gray-400 capitalize">{p.category}</span>
          </div>
          {(p.dosage || p.frequency) && (
            <div className="text-xs text-gray-500">
              {p.dosage && <span>{p.dosage}</span>}
              {p.dosage && p.frequency && <span> \u00b7 </span>}
              {p.frequency && <span>{p.frequency}</span>}
            </div>
          )}
          {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
          {p.notes && <p className="text-xs text-gray-400 mt-1 italic">{p.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {p.status === 'active' && (
            <button onClick={() => handleStatusChange(p.id, 'paused')} className="p-1.5 text-gray-500 hover:text-amber-400" title="Pause">
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
          {p.status === 'paused' && (
            <button onClick={() => handleStatusChange(p.id, 'active')} className="p-1.5 text-gray-500 hover:text-emerald-400" title="Resume">
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          {(p.status === 'active' || p.status === 'paused') && (
            <button onClick={() => handleStatusChange(p.id, 'completed')} className="p-1.5 text-gray-500 hover:text-blue-400" title="Complete">
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-500 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Protocols</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Protocol</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : protocols.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No protocols"
          description="Track supplements, diet changes, lifestyle interventions, and more."
          action={{ label: 'Add Protocol', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-emerald-400 mb-2">Active ({active.length})</h2>
              <div className="space-y-2">{active.map(renderProtocol)}</div>
            </div>
          )}
          {paused.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-amber-400 mb-2">Paused ({paused.length})</h2>
              <div className="space-y-2">{paused.map(renderProtocol)}</div>
            </div>
          )}
          {other.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-2">Completed / Discontinued ({other.length})</h2>
              <div className="space-y-2">{other.map(renderProtocol)}</div>
            </div>
          )}
        </div>
      )}

      {/* Personalized Protocol Templates - Function Health Style */}
      <div className="mt-8 mb-6">
        <div className="text-center mb-6">
          <div className="flex justify-center gap-4 mb-3 text-amber-300/60">
            <Dumbbell className="w-5 h-5" />
            <UtensilsCrossed className="w-5 h-5" />
            <Sparkles className="w-6 h-6 text-amber-300" />
            <Beaker className="w-5 h-5" />
            <Moon className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold mb-1">Personalized Protocols</h2>
          <p className="text-sm text-gray-500">Based on your test results and health history</p>
        </div>

        <div className="space-y-3">
          {PROTOCOL_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isGenerating = generatingId === template.id;
            return (
              <button
                key={template.id}
                onClick={() => handleGenerateProtocol(template.id)}
                disabled={generatingId !== null}
                className="w-full bg-dark-800 border border-dark-600 rounded-xl p-4 text-left
                  hover:border-dark-500 transition-colors disabled:opacity-50 group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">{template.label}</div>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    ) : (
                      <>
                        <Icon className="w-5 h-5 text-amber-300/60" />
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-dark-600">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Create Protocol →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generated content modal */}
      <Modal open={contentModalOpen} onClose={() => { setContentModalOpen(false); setGeneratedContent(null); }} title={contentTitle} wide>
        <div className="prose prose-invert prose-sm max-w-none">
          {generatedContent ? (
            <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
              {generatedContent.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-gray-100 mt-4 mb-2">{line.slice(3)}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-medium text-gray-200 mt-3 mb-1">{line.slice(4)}</h3>;
                if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} className="flex gap-2 ml-2"><span className="text-emerald-400 flex-shrink-0">•</span><span>{line.slice(2)}</span></div>;
                if (line.startsWith('**') && line.endsWith('**')) return <div key={i} className="font-semibold text-gray-100 mt-2">{line.slice(2, -2)}</div>;
                if (line.trim() === '') return <div key={i} className="h-2" />;
                return <p key={i} className="mb-1">{line}</p>;
              })}
              {generatingId && (
                <div className="flex items-center gap-2 mt-4 text-emerald-400 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          )}
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Protocol">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vitamin D3, AIP Diet..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
              <input type="date" className={inputCls} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Dosage</label>
              <input className={inputCls} value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="5000 IU" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Frequency</label>
              <input className={inputCls} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="Daily with food" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-600">
            Add Protocol
          </button>
        </form>
      </Modal>
    </div>
  );
}
