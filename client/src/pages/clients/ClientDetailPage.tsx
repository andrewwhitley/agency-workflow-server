import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Client {
  id: number;
  slug: string;
  companyName: string;
  industry: string | null;
  location: string | null;
  domain: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  businessType: string | null;
  status: string;
  [key: string]: unknown;
}

interface Contact { id: number; name: string; role: string | null; email: string | null; phone: string | null; isPrimary: boolean; }
interface Service { id: number; category: string; serviceName: string; offered: boolean; price: number | null; description: string | null; }
interface TeamMember { id: number; fullName: string; role: string | null; email: string | null; phone: string | null; bio: string | null; }
interface Competitor { id: number; companyName: string; url: string | null; usps: string | null; rank: number | null; }
interface Differentiator { id: number; category: string; title: string | null; description: string; }
interface ImportantLink { id: number; linkType: string; url: string; label: string | null; }
interface BuyerPersona { id: number; personaName: string; age: number | null; occupation: string | null; painPoints: string | null; }
interface Campaign { id: number; campaignName: string; campaignType: string | null; status: string; platforms: string | null; budget: number | null; }
interface ContentGuidelines { brandVoice: string | null; tone: string | null; writingStyle: string | null; seoKeywords: string | null; [key: string]: unknown; }
interface BrandStory { id: number; status: string; heroSection: unknown; problemSection: unknown; guideSection: unknown; fullBrandStory: string | null; }
interface HealthEntry { id: number; departmentName: string; status: string; notes: string | null; weekOf: string; icon: string | null; color: string | null; }

const TABS = ["info", "services", "content-guide", "campaigns", "health", "brand-story"] as const;
type Tab = typeof TABS[number];

export function ClientDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("info");

  useEffect(() => {
    if (!slug) return;
    api<Client>(`/cm/clients/${slug}`)
      .then(setClient)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="text-muted">Loading client...</div>;
  if (!client) return <div className="text-destructive">Client not found.</div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">{client.companyName}</h2>
        <div className="flex gap-3 mt-1 text-sm text-muted">
          {client.industry && <span>{client.industry}</span>}
          {client.location && <span>| {client.location}</span>}
          {client.domain && <span>| {client.domain}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize whitespace-nowrap",
              tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground")}>
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab client={client} />}
      {tab === "services" && <ServicesTab clientId={client.id} />}
      {tab === "content-guide" && <ContentGuideTab clientId={client.id} />}
      {tab === "campaigns" && <CampaignsTab clientId={client.id} />}
      {tab === "health" && <HealthTab clientId={client.id} />}
      {tab === "brand-story" && <BrandStoryTab clientId={client.id} />}
    </div>
  );
}

// ── Info Tab ───────────────────────────────

function InfoTab({ client }: { client: Client }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [differentiators, setDifferentiators] = useState<Differentiator[]>([]);
  const [links, setLinks] = useState<ImportantLink[]>([]);
  const [personas, setPersonas] = useState<BuyerPersona[]>([]);

  useEffect(() => {
    Promise.all([
      api<Contact[]>(`/cm/clients/${client.id}/contacts`).catch(() => []),
      api<TeamMember[]>(`/cm/clients/${client.id}/team-members`).catch(() => []),
      api<Competitor[]>(`/cm/clients/${client.id}/competitors`).catch(() => []),
      api<Differentiator[]>(`/cm/clients/${client.id}/differentiators`).catch(() => []),
      api<ImportantLink[]>(`/cm/clients/${client.id}/important-links`).catch(() => []),
      api<BuyerPersona[]>(`/cm/clients/${client.id}/buyer-personas`).catch(() => []),
    ]).then(([c, tm, comp, diff, lnk, bp]) => {
      setContacts(c); setTeamMembers(tm); setCompetitors(comp);
      setDifferentiators(diff); setLinks(lnk); setPersonas(bp);
    });
  }, [client.id]);

  const fields = [
    { label: "Phone", value: client.companyPhone },
    { label: "Email", value: client.companyEmail },
    { label: "Website", value: client.companyWebsite },
    { label: "Domain", value: client.domain },
    { label: "Business Type", value: client.businessType },
    { label: "Status", value: client.status },
  ];

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <Section title="Company Information">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fields.filter((f) => f.value).map((f) => (
            <div key={f.label}>
              <div className="text-xs text-dim">{f.label}</div>
              <div className="text-sm text-foreground">{String(f.value)}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Contacts */}
      {contacts.length > 0 && (
        <Section title="Contacts">
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-4 text-sm">
                <span className="font-medium text-foreground">{c.name}</span>
                {c.role && <span className="text-muted">{c.role}</span>}
                {c.email && <span className="text-dim">{c.email}</span>}
                {c.phone && <span className="text-dim">{c.phone}</span>}
                {c.isPrimary && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Primary</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Team members */}
      {teamMembers.length > 0 && (
        <Section title="Team Members">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teamMembers.map((m) => (
              <div key={m.id} className="bg-surface-2 rounded-md p-3">
                <div className="text-sm font-medium text-foreground">{m.fullName}</div>
                {m.role && <div className="text-xs text-muted">{m.role}</div>}
                {m.email && <div className="text-xs text-dim">{m.email}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Competitors */}
      {competitors.length > 0 && (
        <Section title="Competitors">
          <div className="space-y-2">
            {competitors.map((c) => (
              <div key={c.id} className="flex items-center gap-3 text-sm">
                {c.rank && <span className="text-xs font-bold text-dim w-6">#{c.rank}</span>}
                <span className="font-medium text-foreground">{c.companyName}</span>
                {c.url && <span className="text-xs text-accent">{c.url}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Differentiators */}
      {differentiators.length > 0 && (
        <Section title="Differentiators">
          <div className="space-y-2">
            {differentiators.map((d) => (
              <div key={d.id}>
                <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-dim mr-2">{d.category}</span>
                {d.title && <span className="text-sm font-medium text-foreground">{d.title}: </span>}
                <span className="text-sm text-muted">{d.description}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Links */}
      {links.length > 0 && (
        <Section title="Important Links">
          <div className="space-y-1">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-dim w-24">{l.linkType}</span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate">{l.label || l.url}</a>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Buyer Personas */}
      {personas.length > 0 && (
        <Section title="Buyer Personas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {personas.map((p) => (
              <div key={p.id} className="bg-surface-2 rounded-md p-3">
                <div className="text-sm font-medium text-foreground">{p.personaName}</div>
                <div className="text-xs text-muted">{[p.age && `Age: ${p.age}`, p.occupation].filter(Boolean).join(" | ")}</div>
                {p.painPoints && <div className="text-xs text-dim mt-1">{p.painPoints}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Services Tab ───────────────────────────

function ServicesTab({ clientId }: { clientId: number }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Service[]>(`/cm/clients/${clientId}/services`).then(setServices).catch(console.error).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-sm text-muted">Loading services...</div>;

  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <Section key={cat} title={cat}>
          <div className="space-y-2">
            {services.filter((s) => s.category === cat).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className={cn("font-medium", s.offered ? "text-foreground" : "text-dim line-through")}>{s.serviceName}</span>
                  {s.description && <span className="text-muted ml-2 text-xs">{s.description}</span>}
                </div>
                {s.price && <span className="text-muted">${s.price}</span>}
              </div>
            ))}
          </div>
        </Section>
      ))}
      {services.length === 0 && <div className="text-muted">No services added yet.</div>}
    </div>
  );
}

// ── Content Guide Tab ──────────────────────

function ContentGuideTab({ clientId }: { clientId: number }) {
  const [guide, setGuide] = useState<ContentGuidelines | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ContentGuidelines>(`/cm/clients/${clientId}/content-guidelines`).then(setGuide).catch(() => {}).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-sm text-muted">Loading content guidelines...</div>;
  if (!guide) return <div className="text-muted">No content guidelines configured yet.</div>;

  const sections = [
    { title: "Brand Voice & Messaging", fields: [
      { label: "Brand Voice", value: guide.brandVoice }, { label: "Tone", value: guide.tone },
      { label: "Writing Style", value: guide.writingStyle }, { label: "Do's & Don'ts", value: guide.dosAndDonts },
      { label: "Approved Terminology", value: guide.approvedTerminology },
    ]},
    { title: "USPs", fields: [
      { label: "Unique Selling Points", value: guide.uniqueSellingPoints }, { label: "Guarantees", value: guide.guarantees },
      { label: "Competitive Advantages", value: guide.competitiveAdvantages },
    ]},
    { title: "Content Topics & Keywords", fields: [
      { label: "Focus Topics", value: guide.focusTopics }, { label: "SEO Keywords", value: guide.seoKeywords },
      { label: "Content Themes", value: guide.contentThemes },
    ]},
    { title: "Ad Copy Guidelines", fields: [
      { label: "Ad Copy Guidelines", value: guide.adCopyGuidelines }, { label: "Preferred CTAs", value: guide.preferredCtas },
    ]},
  ];

  return (
    <div className="space-y-6">
      {sections.map((s) => {
        const hasContent = s.fields.some((f) => f.value);
        if (!hasContent) return null;
        return (
          <Section key={s.title} title={s.title}>
            <div className="space-y-3">
              {s.fields.filter((f) => f.value).map((f) => (
                <div key={f.label}>
                  <div className="text-xs text-dim mb-0.5">{f.label}</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{String(f.value)}</div>
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}

// ── Campaigns Tab ──────────────────────────

function CampaignsTab({ clientId }: { clientId: number }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Campaign[]>(`/cm/campaigns?clientId=${clientId}`).then(setCampaigns).catch(console.error).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-sm text-muted">Loading campaigns...</div>;

  return (
    <div>
      {campaigns.length === 0 ? (
        <div className="text-muted">No campaigns yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-surface border border-border rounded-md p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">{c.campaignName}</h3>
                <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize",
                  c.status === "active" ? "bg-success/10 text-success" :
                  c.status === "paused" ? "bg-warning/10 text-warning" : "bg-surface-2 text-dim"
                )}>{c.status}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-dim">
                {c.campaignType && <span className="px-2 py-0.5 rounded bg-surface-2">{c.campaignType}</span>}
                {c.platforms && <span className="px-2 py-0.5 rounded bg-surface-2">{c.platforms}</span>}
                {c.budget && <span className="px-2 py-0.5 rounded bg-surface-2">${c.budget}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Health Tab (Traffic Light) ─────────────

function HealthTab({ clientId }: { clientId: number }) {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<HealthEntry[]>(`/cm/traffic-light/health?clientId=${clientId}`).then(setEntries).catch(console.error).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-sm text-muted">Loading health status...</div>;

  const latestWeek = entries.length > 0 ? entries[0].weekOf : null;
  const latest = entries.filter((e) => e.weekOf === latestWeek);

  return (
    <div>
      {latest.length === 0 ? (
        <div className="text-muted">No health entries yet. Use the Weekly Check-in to add status.</div>
      ) : (
        <>
          <div className="text-sm text-muted mb-4">Week of {latestWeek}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {latest.map((e) => (
              <div key={e.id} className="bg-surface border border-border rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("w-3 h-3 rounded-full",
                    e.status === "green" && "bg-success",
                    e.status === "yellow" && "bg-warning",
                    e.status === "red" && "bg-destructive",
                    e.status === "na" && "bg-dim"
                  )} />
                  <span className="text-sm font-medium text-foreground">{e.departmentName}</span>
                </div>
                {e.notes && <p className="text-xs text-muted">{e.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Brand Story Tab ────────────────────────

function BrandStoryTab({ clientId }: { clientId: number }) {
  const [story, setStory] = useState<BrandStory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<BrandStory>(`/cm/clients/${clientId}/brand-story`).then(setStory).catch(() => {}).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-sm text-muted">Loading brand story...</div>;
  if (!story) return <div className="text-muted">No brand story generated yet.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize",
          story.status === "approved" ? "bg-success/10 text-success" :
          story.status === "reviewed" ? "bg-accent/10 text-accent" : "bg-surface-2 text-dim"
        )}>{story.status}</span>
      </div>
      {story.fullBrandStory ? (
        <div className="bg-surface border border-border rounded-md p-6">
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">{story.fullBrandStory}</div>
        </div>
      ) : (
        <div className="text-muted">Brand story content is empty. Generate one to get started.</div>
      )}
    </div>
  );
}

// ── Shared Section Component ───────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">{title}</h3>
      {children}
    </div>
  );
}
