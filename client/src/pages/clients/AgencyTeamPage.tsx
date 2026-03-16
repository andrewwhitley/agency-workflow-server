import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface TeamMember {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  status: string;
  bio: string | null;
  avatarUrl: string | null;
}

export function AgencyTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "", department: "", bio: "" });

  const fetch = () => {
    api<TeamMember[]>("/cm/agency-team").then(setMembers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    await api("/cm/agency-team", { method: "POST", body: JSON.stringify(form) });
    setShowAdd(false);
    setForm({ name: "", email: "", phone: "", role: "", department: "", bio: "" });
    fetch();
  };

  if (loading) return <div className="text-muted">Loading team...</div>;

  const departments = [...new Set(members.map((m) => m.department).filter(Boolean))] as string[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Agency Team</h2>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">
          Add Team Member
        </button>
      </div>

      {departments.length > 0 ? (
        departments.map((dept) => (
          <div key={dept} className="mb-6">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">{dept}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {members.filter((m) => m.department === dept).map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((m) => <MemberCard key={m.id} member={m} />)}
        </div>
      )}

      {members.length === 0 && (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No team members yet. Add your agency team to get started.
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface rounded-lg border border-border w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Team Member</h3>
            <div className="space-y-4">
              <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
                <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
              </div>
              <textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-surface-2 text-muted hover:bg-surface-3">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90">Add Member</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }: { member: { name: string; role: string; email: string | null; phone: string | null; bio: string | null; status: string; avatarUrl: string | null } }) {
  return (
    <div className="bg-surface border border-border rounded-md p-5">
      <div className="flex items-center gap-3 mb-2">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold">
            {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
        )}
        <div>
          <div className="text-sm font-semibold text-foreground">{member.name}</div>
          <div className="text-xs text-muted">{member.role}</div>
        </div>
      </div>
      {member.email && <div className="text-xs text-dim">{member.email}</div>}
      {member.phone && <div className="text-xs text-dim">{member.phone}</div>}
      {member.bio && <p className="text-xs text-muted mt-2 line-clamp-2">{member.bio}</p>}
    </div>
  );
}
