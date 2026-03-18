import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField } from "@/components/FormField";
import { Plus, Pencil, Trash2 } from "lucide-react";

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

const emptyForm = (): Partial<TeamMember> => ({
  name: "", email: "", phone: "", role: "", department: "", bio: "", status: "active",
});

export function AgencyTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<TeamMember>>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const reload = () => {
    api<TeamMember[]>("/cm/agency-team").then(setMembers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); };
  const openEdit = (m: TeamMember) => { setForm({ ...m }); setEditingId(m.id); setDialogOpen(true); };
  const submit = async () => {
    setPending(true);
    try {
      // Agency team currently only has POST (no PUT endpoint), so always POST
      await api("/cm/agency-team", { method: "POST", body: JSON.stringify(form) });
      setDialogOpen(false);
      reload();
    } catch (e) { console.error(e); }
    setPending(false);
  };

  const upd = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  if (loading) return <div className="text-muted">Loading team...</div>;

  const departments = [...new Set(members.map((m) => m.department).filter(Boolean))] as string[];
  const filtered = filter ? members.filter((m) => m.department === filter) : members;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Agency Team</h2>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Team Member</Button>
      </div>

      {/* Department filter */}
      {departments.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button size="sm" variant={filter === null ? "default" : "outline"} onClick={() => setFilter(null)}>All</Button>
          {departments.map((d) => (
            <Button key={d} size="sm" variant={filter === d ? "default" : "outline"} onClick={() => setFilter(d)}>{d}</Button>
          ))}
        </div>
      )}

      {departments.length > 0 && !filter ? (
        departments.map((dept) => {
          const deptMembers = filtered.filter((m) => m.department === dept);
          if (deptMembers.length === 0) return null;
          return (
            <div key={dept} className="mb-6">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">{dept}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {deptMembers.map((m) => <MemberCard key={m.id} member={m} onEdit={() => openEdit(m)} />)}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => <MemberCard key={m.id} member={m} onEdit={() => openEdit(m)} />)}
        </div>
      )}

      {members.length === 0 && (
        <div className="bg-surface border border-border rounded-md p-8 text-center text-muted">
          No team members yet. Add your agency team to get started.
        </div>
      )}

      <FormDialog open={dialogOpen} onOpenChange={setDialogOpen}
        title={editingId ? "Edit Team Member" : "Add Team Member"} onSubmit={submit} isPending={pending}>
        <FormField label="Full Name" value={form.name || ""} onChange={(v) => upd("name", v)} required />
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Role" value={form.role || ""} onChange={(v) => upd("role", v)} required placeholder="e.g. SEO Specialist" />
          <FormField label="Department" value={form.department || ""} onChange={(v) => upd("department", v)} placeholder="e.g. SEO, Content, Leadership" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" value={form.email || ""} onChange={(v) => upd("email", v)} />
          <FormField label="Phone" value={form.phone || ""} onChange={(v) => upd("phone", v)} />
        </div>
        <FormField label="Bio" type="textarea" value={form.bio || ""} onChange={(v) => upd("bio", v)} rows={3} />
      </FormDialog>
    </div>
  );
}

function MemberCard({ member, onEdit }: { member: TeamMember; onEdit: () => void }) {
  return (
    <div className="bg-surface border border-border rounded-md p-5 group">
      <div className="flex items-start justify-between">
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
        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
      </div>
      {member.email && <div className="text-xs text-dim">{member.email}</div>}
      {member.phone && <div className="text-xs text-dim">{member.phone}</div>}
      {member.bio && <p className="text-xs text-muted mt-2 line-clamp-2">{member.bio}</p>}
    </div>
  );
}
