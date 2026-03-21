import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Users, Plus, Edit2, Trash2, Phone, MapPin,
  Shield, Heart, Pill as PillIcon, Target, AlertCircle,
} from 'lucide-react';
import type { FamilyMember } from '../types';
import { createFamilyMember, updateFamilyMember, deleteFamilyMember } from '../api';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

interface OutletCtx {
  activeMember: FamilyMember | null;
  members: FamilyMember[];
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const AVATAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function MemberForm({ member, onSave, onCancel }: {
  member?: FamilyMember;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: member?.name || '',
    date_of_birth: member?.date_of_birth || '',
    sex: member?.sex || '',
    role: member?.role || 'adult' as const,
    avatar_color: member?.avatar_color || AVATAR_COLORS[0],
    height_feet: member?.height_inches ? Math.floor(member.height_inches / 12) : '',
    height_inches: member?.height_inches ? member.height_inches % 12 : '',
    weight_lbs: member?.weight_lbs || '',
    blood_type: member?.blood_type || '',
    allergies: member?.allergies?.join(', ') || '',
    conditions: member?.conditions?.join(', ') || '',
    medications: member?.medications?.join(', ') || '',
    primary_doctor: member?.primary_doctor || '',
    pharmacy_name: member?.pharmacy_name || '',
    pharmacy_phone: member?.pharmacy_phone || '',
    insurance_provider: member?.insurance_provider || '',
    insurance_policy: member?.insurance_policy || '',
    insurance_group: member?.insurance_group || '',
    emergency_contact_name: member?.emergency_contact_name || '',
    emergency_contact_phone: member?.emergency_contact_phone || '',
    address: member?.address || '',
    health_goals: member?.health_goals?.join(', ') || '',
    notes: member?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toArr = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const heightInches = form.height_feet || form.height_inches
      ? (Number(form.height_feet) || 0) * 12 + (Number(form.height_inches) || 0)
      : undefined;
    onSave({
      name: form.name,
      date_of_birth: form.date_of_birth || undefined,
      sex: form.sex || undefined,
      role: form.role || undefined,
      avatar_color: form.avatar_color,
      height_inches: heightInches,
      weight_lbs: form.weight_lbs ? Number(form.weight_lbs) : undefined,
      blood_type: form.blood_type,
      allergies: toArr(form.allergies),
      conditions: toArr(form.conditions),
      medications: toArr(form.medications),
      primary_doctor: form.primary_doctor,
      pharmacy_name: form.pharmacy_name,
      pharmacy_phone: form.pharmacy_phone,
      insurance_provider: form.insurance_provider,
      insurance_policy: form.insurance_policy,
      insurance_group: form.insurance_group,
      emergency_contact_name: form.emergency_contact_name,
      emergency_contact_phone: form.emergency_contact_phone,
      address: form.address,
      health_goals: toArr(form.health_goals),
      notes: form.notes,
    });
  };

  const inputCls = 'w-full bg-dark-700 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500';
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Name *</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className={labelCls}>Date of Birth</label>
          <input type="date" className={inputCls} value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Sex</label>
          <select className={inputCls} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            <option value="">--</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Role</label>
          <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'adult' | 'child' })}>
            <option value="adult">Adult</option>
            <option value="child">Child</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Avatar Color</label>
          <div className="flex gap-1.5 flex-wrap">
            {AVATAR_COLORS.map((c) => (
              <button key={c} type="button"
                onClick={() => setForm({ ...form, avatar_color: c })}
                className={`w-7 h-7 rounded-full border-2 transition-all ${form.avatar_color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Height (ft)</label>
          <input type="number" className={inputCls} value={form.height_feet} onChange={(e) => setForm({ ...form, height_feet: e.target.value })} placeholder="5" />
        </div>
        <div>
          <label className={labelCls}>Height (in)</label>
          <input type="number" className={inputCls} value={form.height_inches} onChange={(e) => setForm({ ...form, height_inches: e.target.value })} placeholder="10" />
        </div>
        <div>
          <label className={labelCls}>Weight (lbs)</label>
          <input type="number" className={inputCls} value={form.weight_lbs} onChange={(e) => setForm({ ...form, weight_lbs: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Blood Type</label>
        <select className={inputCls} value={form.blood_type} onChange={(e) => setForm({ ...form, blood_type: e.target.value })}>
          <option value="">Unknown</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Medical */}
      <div>
        <label className={labelCls}>Allergies (comma-separated)</label>
        <input className={inputCls} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Peanuts, Penicillin" />
      </div>
      <div>
        <label className={labelCls}>Conditions (comma-separated)</label>
        <input className={inputCls} value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="Hypothyroidism, MTHFR" />
      </div>
      <div>
        <label className={labelCls}>Medications (comma-separated)</label>
        <input className={inputCls} value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} placeholder="Synthroid 75mcg" />
      </div>

      {/* Provider */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Primary Doctor</label>
          <input className={inputCls} value={form.primary_doctor} onChange={(e) => setForm({ ...form, primary_doctor: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Pharmacy</label>
          <input className={inputCls} value={form.pharmacy_name} onChange={(e) => setForm({ ...form, pharmacy_name: e.target.value })} />
        </div>
      </div>

      {/* Emergency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Emergency Contact</label>
          <input className={inputCls} value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Emergency Phone</label>
          <input className={inputCls} value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
        </div>
      </div>

      {/* Goals */}
      <div>
        <label className={labelCls}>Health Goals (comma-separated)</label>
        <input className={inputCls} value={form.health_goals} onChange={(e) => setForm({ ...form, health_goals: e.target.value })} placeholder="Optimize thyroid, improve gut health" />
      </div>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-600 transition-colors">
          {member ? 'Update' : 'Add Member'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function FamilyPage() {
  const { members, addToast } = useOutletContext<OutletCtx>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Get the refresh function from window - hacky but works for now
  const refresh = () => window.location.reload();

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editing) {
        await updateFamilyMember(editing.id, data as Partial<FamilyMember>);
        addToast('Member updated');
      } else {
        await createFamilyMember(data as Partial<FamilyMember>);
        addToast('Member added');
      }
      setModalOpen(false);
      setEditing(undefined);
      refresh();
    } catch (err) {
      addToast(String(err), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this family member and all their health data?')) return;
    try {
      await deleteFamilyMember(id);
      addToast('Member deleted');
      refresh();
    } catch (err) {
      addToast(String(err), 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Family Members</h1>
        <button
          onClick={() => { setEditing(undefined); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Member</span>
        </button>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No family members"
          description="Add your family members to start tracking their health."
          action={{ label: 'Add First Member', onClick: () => setModalOpen(true) }}
        />
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: m.avatar_color }}
                >
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    {m.role && <span className="capitalize">{m.role}</span>}
                    {m.sex && <span className="capitalize">{m.sex}</span>}
                    {m.date_of_birth && <span>{m.date_of_birth}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setEditing(m); setModalOpen(true); }}
                    className="p-2 text-gray-500 hover:text-gray-300">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                    className="p-2 text-gray-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </button>

              {expanded === m.id && (
                <div className="px-4 pb-4 border-t border-dark-600 pt-3 space-y-3 text-sm">
                  {m.height_inches && (
                    <div className="text-gray-400">
                      Height: {Math.floor(m.height_inches / 12)}'{m.height_inches % 12}"
                      {m.weight_lbs && ` \u00b7 Weight: ${m.weight_lbs} lbs`}
                      {m.blood_type && ` \u00b7 Blood: ${m.blood_type}`}
                    </div>
                  )}
                  {m.allergies?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="text-gray-400">Allergies: {m.allergies.join(', ')}</span>
                    </div>
                  )}
                  {m.conditions?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Heart className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                      <span className="text-gray-400">Conditions: {m.conditions.join(', ')}</span>
                    </div>
                  )}
                  {m.medications?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <PillIcon className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-gray-400">Medications: {m.medications.join(', ')}</span>
                    </div>
                  )}
                  {m.primary_doctor && (
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-gray-400">Dr. {m.primary_doctor}</span>
                    </div>
                  )}
                  {m.emergency_contact_name && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-gray-400">Emergency: {m.emergency_contact_name} {m.emergency_contact_phone}</span>
                    </div>
                  )}
                  {m.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      <span className="text-gray-400">{m.address}</span>
                    </div>
                  )}
                  {m.health_goals?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-gray-400">Goals: {m.health_goals.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(undefined); }}
        title={editing ? 'Edit Member' : 'Add Family Member'}
        wide
      >
        <MemberForm
          member={editing}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(undefined); }}
        />
      </Modal>
    </div>
  );
}
