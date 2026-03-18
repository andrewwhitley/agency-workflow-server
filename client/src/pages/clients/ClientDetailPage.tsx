import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CompanyInfoEdit } from "@/components/client/CompanyInfoEdit";
import { ServicesSection } from "@/components/client/ServicesSection";
import { CrudSection, CrudItem } from "@/components/client/CrudSection";
import { FormField } from "@/components/FormField";

// ── Types ────────────────────────────────────

interface Client {
  id: number;
  slug: string;
  companyName: string;
  legalName: string | null;
  dbaName: string | null;
  industry: string | null;
  location: string | null;
  domain: string | null;
  isLocalServiceArea: boolean;
  displayAddress: boolean;
  companyPhone: string | null;
  mainPhone: string | null;
  smsPhone: string | null;
  tollFreePhone: string | null;
  faxPhone: string | null;
  companyEmail: string | null;
  primaryEmail: string | null;
  inquiryEmails: string | null;
  employmentEmail: string | null;
  companyWebsite: string | null;
  dateFounded: string | null;
  yearFounded: number | null;
  ein: string | null;
  businessType: string | null;
  numberOfCustomers: number | null;
  desiredNewClients: number | null;
  avgClientLifetimeValue: number | null;
  numberOfEmployees: number | null;
  estimatedAnnualRevenue: number | null;
  targetRevenue: number | null;
  currentMarketingSpend: number | null;
  currentAdsSpend: number | null;
  crmSystem: string | null;
  businessHours: string | null;
  holidayHours: string | null;
  domainRegistrar: string | null;
  googleDriveLink: string | null;
  colorScheme: string | null;
  designInspirationUrls: string | null;
  adsMarketingBudget: string | null;
  adsRecruitingBudget: string | null;
  targetGoogleAdsConvRate: number | null;
  targetGoogleAdsCpa: number | null;
  targetBingAdsConvRate: number | null;
  targetBingAdsCpa: number | null;
  targetFacebookAdsCpa: number | null;
  timeZone: string | null;
  paymentTypesAccepted: string | null;
  combinedYearsExperience: number | null;
  businessFacts: string | null;
  affiliationsAssociations: string | null;
  certificationsTrainings: string | null;
  communityInvolvement: string | null;
  languagesSpoken: string | null;
  serviceSeasonality: string | null;
  telemedicineOffered: boolean;
  status: string;
  [key: string]: unknown;
}

interface Contact { id: number; name: string; role: string | null; email: string | null; phone: string | null; phoneType: string | null; notes: string | null; isPrimary: boolean; shouldAttribute: boolean; linktreeUrl: string | null; wordpressEmail: string | null; }
interface Address { id: number; label: string; streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null; locationType: string; notes: string | null; isPrimary: boolean; }
interface Service { id: number; category: string; serviceName: string; offered: boolean; price: number | null; duration: string | null; description: string | null; descriptionLong: string | null; idealPatientProfile: string | null; goodFitCriteria: string | null; notGoodFitCriteria: string | null; targetAgeRange: string | null; targetGender: string | null; targetConditions: string | null; targetInterests: string | null; serviceAreaCities: string | null; differentiators: string | null; expectedOutcomes: string | null; commonConcerns: string | null; parentServiceId: number | null; sortOrder: number; }
interface ServiceArea { id: number; targetCities: string | null; targetCounties: string | null; notes: string | null; }
interface TeamMember { id: number; fullName: string; role: string | null; email: string | null; phone: string | null; photoUrl: string | null; linkedinUrl: string | null; facebookUrl: string | null; instagramUrl: string | null; bio: string | null; useForAttribution: boolean; preferredContactMethod: string | null; }
interface Competitor { id: number; companyName: string; url: string | null; usps: string | null; description: string | null; rank: number | null; }
interface Differentiator { id: number; category: string; title: string | null; description: string; }
interface ImportantLink { id: number; linkType: string; url: string; label: string | null; notes: string | null; }
interface BuyerPersona { id: number; personaName: string; age: number | null; gender: string | null; location: string | null; familyStatus: string | null; educationLevel: string | null; occupation: string | null; incomeLevel: string | null; communicationChannels: string | null; needsDescription: string | null; painPoints: string | null; gains: string | null; buyingFactors: string | null; }
interface Login { id: number; platform: string; username: string | null; loginUrl: string | null; notes: string | null; accessLevel: string | null; }
interface Campaign { id: number; campaignName: string; campaignType: string | null; status: string; platforms: string | null; durationType: string | null; servicesPromoted: string | null; usps: string | null; demographicsGender: string | null; demographicsAge: string | null; demographicsLocation: string | null; demographicsInterests: string | null; audienceTargeting: string | null; geoTargeting: string | null; adTypes: string | null; creativeStyle: string | null; ctas: string | null; budget: number | null; dailyBudget: number | null; totalBudget: number | null; startDate: string | null; endDate: string | null; expectedOutcomes: string | null; notes: string | null; }
interface Deliverable { id: number; campaignId: number; title: string; deliverableType: string; status: string; priority: string; description: string | null; assignedTo: string | null; dueDate: string | null; completedAt: string | null; notes: string | null; }
interface MarketingPlanItem { id: number; category: string; item: string; isIncluded: boolean; quantity: number | null; notes: string | null; completionTarget: string | null; }
interface ContentGuidelines { brandVoice: string | null; tone: string | null; writingStyle: string | null; dosAndDonts: string | null; approvedTerminology: string | null; restrictions: string | null; uniqueSellingPoints: string | null; guarantees: string | null; competitiveAdvantages: string | null; brandColors: string | null; fonts: string | null; logoGuidelines: string | null; designInspiration: string | null; targetAudienceSummary: string | null; demographics: string | null; psychographics: string | null; focusTopics: string | null; seoKeywords: string | null; contentThemes: string | null; messagingPriorities: string | null; featuredTestimonials: string | null; successStories: string | null; socialProofNotes: string | null; adCopyGuidelines: string | null; preferredCtas: string | null; targetingPreferences: string | null; promotions: string | null; observedHolidays: string | null; holidayContentNotes: string | null; brandStory: string | null; contentPurpose: string | null; userActionStrategy: string | null; existingCollateral: string | null; useStockPhotography: boolean; imageSourceNotes: string | null; marketingGuide: string | null; writingStyleGuide: string | null; [key: string]: unknown; }
interface BrandStory { id: number; status: string; heroSection: unknown; problemSection: unknown; guideSection: unknown; planSection: unknown; ctaSection: unknown; successSection: unknown; failureSection: unknown; brandVoiceSection: unknown; visualIdentitySection: unknown; contentStrategySection: unknown; messagingSection: unknown; implementationSection: unknown; fullBrandStory: string | null; }
interface HealthEntry { id: number; departmentName: string; status: string; notes: string | null; weekOf: string; icon: string | null; color: string | null; }

// ── Tabs ─────────────────────────────────────

const TABS = ["info", "services", "campaigns", "marketing-plan", "content-guide", "health", "brand-story"] as const;
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
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-foreground">{client.companyName}</h2>
          <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize",
            client.status === "active" ? "bg-success/10 text-success" :
            client.status === "inactive" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
          )}>{client.status}</span>
        </div>
        <div className="flex gap-3 mt-1 text-sm text-muted">
          {client.industry && <span>{client.industry}</span>}
          {client.location && <span>| {client.location}</span>}
          {client.domain && <span>| {client.domain}</span>}
          {client.timeZone && <span>| {client.timeZone}</span>}
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize whitespace-nowrap",
              tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground")}>
            {t.replace(/-/g, " ")}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab client={client} onClientUpdate={setClient} />}
      {tab === "services" && <ServicesSection clientId={client.id} />}
      {tab === "campaigns" && <CampaignsTab clientId={client.id} />}
      {tab === "marketing-plan" && <MarketingPlanTab clientId={client.id} />}
      {tab === "content-guide" && <ContentGuideTab clientId={client.id} />}
      {tab === "health" && <HealthTab clientId={client.id} />}
      {tab === "brand-story" && <BrandStoryTab clientId={client.id} />}
    </div>
  );
}

// ── Helpers ───────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">{title}</h3>
      {children}
    </div>
  );
}

function FieldGrid({ fields }: { fields: { label: string; value: unknown }[] }) {
  const filled = fields.filter((f) => f.value != null && f.value !== "" && f.value !== false);
  if (filled.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
      {filled.map((f) => (
        <div key={f.label}>
          <div className="text-xs text-dim">{f.label}</div>
          <div className="text-sm text-foreground whitespace-pre-wrap">{String(f.value)}</div>
        </div>
      ))}
    </div>
  );
}

function currency(val: number | null) {
  if (val == null) return null;
  return `$${Number(val).toLocaleString()}`;
}

function pct(val: number | null) {
  if (val == null) return null;
  return `${val}%`;
}

// ── Info Tab (editable) ──────────────────────

function InfoTab({ client, onClientUpdate }: { client: Client; onClientUpdate: (c: Client) => void }) {
  return (
    <div className="space-y-8">
      {/* Editable company info sections */}
      <CompanyInfoEdit client={client} onUpdate={onClientUpdate} />

      {/* Contacts */}
      <CrudSection<Contact> title="Contacts" clientId={client.id} entityPath="contacts"
        emptyForm={() => ({ name: "", role: "", email: "", phone: "", phoneType: "", notes: "", isPrimary: false, shouldAttribute: false, linktreeUrl: "", wordpressEmail: "" } as Partial<Contact>)}
        renderItem={(c, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{c.name}</span>
              {c.role && <span className="text-xs text-muted">({c.role})</span>}
              {c.isPrimary && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Primary</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-dim">
              {c.email && <span>{c.email}</span>}
              {c.phone && <span>{c.phone}{c.phoneType ? ` (${c.phoneType})` : ""}</span>}
            </div>
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Name" value={form.name || ""} onChange={(v) => upd("name", v)} required />
          <FormField label="Role" value={form.role || ""} onChange={(v) => upd("role", v)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" value={form.email || ""} onChange={(v) => upd("email", v)} />
            <FormField label="Phone" value={form.phone || ""} onChange={(v) => upd("phone", v)} />
          </div>
          <FormField label="Phone Type" value={form.phoneType || ""} onChange={(v) => upd("phoneType", v)} placeholder="e.g. Mobile, Office" />
          <FormField label="WordPress Email" value={form.wordpressEmail || ""} onChange={(v) => upd("wordpressEmail", v)} />
          <FormField label="Linktree URL" value={form.linktreeUrl || ""} onChange={(v) => upd("linktreeUrl", v)} />
          <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
          <div className="flex gap-4">
            <FormField label="Primary Contact" type="checkbox" checked={!!form.isPrimary} onChange={(v) => upd("isPrimary", v)} />
            <FormField label="Use for Attribution" type="checkbox" checked={!!form.shouldAttribute} onChange={(v) => upd("shouldAttribute", v)} />
          </div>
        </>)}
      />

      {/* Addresses */}
      <CrudSection<Address> title="Addresses" clientId={client.id} entityPath="addresses"
        emptyForm={() => ({ label: "", streetAddress: "", city: "", state: "", postalCode: "", locationType: "Main", notes: "", isPrimary: false } as Partial<Address>)}
        renderItem={(a, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{a.label}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-surface text-dim">{a.locationType}</span>
              {a.isPrimary && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Primary</span>}
            </div>
            <div className="text-sm text-muted">{[a.streetAddress, a.city, a.state, a.postalCode].filter(Boolean).join(", ")}</div>
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Label" value={form.label || ""} onChange={(v) => upd("label", v)} required placeholder="e.g. Main Office" />
            <FormField label="Location Type" value={form.locationType || "Main"} onChange={(v) => upd("locationType", v)} placeholder="Main, Satellite, Home, Other" />
          </div>
          <FormField label="Street Address" value={form.streetAddress || ""} onChange={(v) => upd("streetAddress", v)} />
          <div className="grid grid-cols-3 gap-4">
            <FormField label="City" value={form.city || ""} onChange={(v) => upd("city", v)} />
            <FormField label="State" value={form.state || ""} onChange={(v) => upd("state", v)} />
            <FormField label="Postal Code" value={form.postalCode || ""} onChange={(v) => upd("postalCode", v)} />
          </div>
          <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
          <FormField label="Primary Address" type="checkbox" checked={!!form.isPrimary} onChange={(v) => upd("isPrimary", v)} />
        </>)}
      />

      {/* Team Members */}
      <CrudSection<TeamMember> title="Team Members" clientId={client.id} entityPath="team-members" wide
        emptyForm={() => ({ fullName: "", role: "", email: "", phone: "", bio: "", linkedinUrl: "", facebookUrl: "", instagramUrl: "", useForAttribution: false, preferredContactMethod: "" } as Partial<TeamMember>)}
        renderItem={(m, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{m.fullName}</span>
              {m.role && <span className="text-xs text-muted">({m.role})</span>}
              {m.useForAttribution && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Attribution</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-dim">
              {m.email && <span>{m.email}</span>}
              {m.phone && <span>{m.phone}</span>}
            </div>
            {m.bio && <div className="text-xs text-muted mt-1">{m.bio}</div>}
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" value={form.fullName || ""} onChange={(v) => upd("fullName", v)} required />
            <FormField label="Role" value={form.role || ""} onChange={(v) => upd("role", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" value={form.email || ""} onChange={(v) => upd("email", v)} />
            <FormField label="Phone" value={form.phone || ""} onChange={(v) => upd("phone", v)} />
          </div>
          <FormField label="Bio" type="textarea" value={form.bio || ""} onChange={(v) => upd("bio", v)} />
          <FormField label="Preferred Contact Method" value={form.preferredContactMethod || ""} onChange={(v) => upd("preferredContactMethod", v)} />
          <div className="grid grid-cols-3 gap-4">
            <FormField label="LinkedIn URL" value={form.linkedinUrl || ""} onChange={(v) => upd("linkedinUrl", v)} />
            <FormField label="Facebook URL" value={form.facebookUrl || ""} onChange={(v) => upd("facebookUrl", v)} />
            <FormField label="Instagram URL" value={form.instagramUrl || ""} onChange={(v) => upd("instagramUrl", v)} />
          </div>
          <FormField label="Use for Attribution" type="checkbox" checked={!!form.useForAttribution} onChange={(v) => upd("useForAttribution", v)} />
        </>)}
      />

      {/* Competitors */}
      <CrudSection<Competitor> title="Competitors" clientId={client.id} entityPath="competitors"
        emptyForm={() => ({ companyName: "", url: "", usps: "", description: "", rank: null } as Partial<Competitor>)}
        renderItem={(c, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2">
              {c.rank && <span className="text-xs font-bold text-dim">#{c.rank}</span>}
              <span className="text-sm font-medium text-foreground">{c.companyName}</span>
              {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">{c.url}</a>}
            </div>
            {c.usps && <div className="text-xs text-muted mt-0.5">USPs: {c.usps}</div>}
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Company Name" value={form.companyName || ""} onChange={(v) => upd("companyName", v)} required />
          <FormField label="Website URL" value={form.url || ""} onChange={(v) => upd("url", v)} />
          <FormField label="Rank" type="number" value={form.rank?.toString() || ""} onChange={(v) => upd("rank", v ? parseInt(v) : null)} />
          <FormField label="USPs" type="textarea" value={form.usps || ""} onChange={(v) => upd("usps", v)} />
          <FormField label="Description" type="textarea" value={form.description || ""} onChange={(v) => upd("description", v)} />
        </>)}
      />

      {/* Differentiators */}
      <CrudSection<Differentiator> title="Differentiators" clientId={client.id} entityPath="differentiators"
        emptyForm={() => ({ category: "", title: "", description: "" } as Partial<Differentiator>)}
        renderItem={(d, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <span className="text-xs px-2 py-0.5 rounded bg-surface text-dim mr-2">{d.category}</span>
            {d.title && <span className="text-sm font-medium text-foreground">{d.title}: </span>}
            <span className="text-sm text-muted">{d.description}</span>
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Category" value={form.category || ""} onChange={(v) => upd("category", v)} required />
          <FormField label="Title" value={form.title || ""} onChange={(v) => upd("title", v)} />
          <FormField label="Description" type="textarea" value={form.description || ""} onChange={(v) => upd("description", v)} required />
        </>)}
      />

      {/* Buyer Personas */}
      <CrudSection<BuyerPersona> title="Buyer Personas" clientId={client.id} entityPath="buyer-personas" wide
        emptyForm={() => ({ personaName: "", age: null, gender: "", location: "", familyStatus: "", educationLevel: "", occupation: "", incomeLevel: "", communicationChannels: "", needsDescription: "", painPoints: "", gains: "", buyingFactors: "" } as Partial<BuyerPersona>)}
        renderItem={(p, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="text-sm font-medium text-foreground">{p.personaName}</div>
            <div className="text-xs text-muted">{[p.age && `Age: ${p.age}`, p.gender, p.occupation].filter(Boolean).join(" | ")}</div>
            {p.painPoints && <div className="text-xs text-dim mt-1">Pain Points: {p.painPoints}</div>}
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Persona Name" value={form.personaName || ""} onChange={(v) => upd("personaName", v)} required />
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Age" type="number" value={form.age?.toString() || ""} onChange={(v) => upd("age", v ? parseInt(v) : null)} />
            <FormField label="Gender" value={form.gender || ""} onChange={(v) => upd("gender", v)} />
            <FormField label="Location" value={form.location || ""} onChange={(v) => upd("location", v)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Family Status" value={form.familyStatus || ""} onChange={(v) => upd("familyStatus", v)} />
            <FormField label="Education Level" value={form.educationLevel || ""} onChange={(v) => upd("educationLevel", v)} />
            <FormField label="Income Level" value={form.incomeLevel || ""} onChange={(v) => upd("incomeLevel", v)} />
          </div>
          <FormField label="Occupation" value={form.occupation || ""} onChange={(v) => upd("occupation", v)} />
          <FormField label="Communication Channels" value={form.communicationChannels || ""} onChange={(v) => upd("communicationChannels", v)} />
          <FormField label="Needs" type="textarea" value={form.needsDescription || ""} onChange={(v) => upd("needsDescription", v)} />
          <FormField label="Pain Points" type="textarea" value={form.painPoints || ""} onChange={(v) => upd("painPoints", v)} />
          <FormField label="Gains" type="textarea" value={form.gains || ""} onChange={(v) => upd("gains", v)} />
          <FormField label="Buying Factors" type="textarea" value={form.buyingFactors || ""} onChange={(v) => upd("buyingFactors", v)} />
        </>)}
      />

      {/* Important Links */}
      <CrudSection<ImportantLink> title="Important Links" clientId={client.id} entityPath="important-links"
        emptyForm={() => ({ linkType: "", url: "", label: "", notes: "" } as Partial<ImportantLink>)}
        renderItem={(l, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs px-2 py-0.5 rounded bg-surface text-dim min-w-[80px] text-center">{l.linkType}</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate">{l.label || l.url}</a>
            </div>
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Link Type" value={form.linkType || ""} onChange={(v) => upd("linkType", v)} required placeholder="e.g. GBP, Facebook, Yelp" />
          <FormField label="URL" value={form.url || ""} onChange={(v) => upd("url", v)} required />
          <FormField label="Label" value={form.label || ""} onChange={(v) => upd("label", v)} placeholder="Display label (optional)" />
          <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
        </>)}
      />

      {/* Logins & Accounts */}
      <CrudSection<Login> title="Logins & Accounts" clientId={client.id} entityPath="logins"
        emptyForm={() => ({ platform: "", username: "", loginUrl: "", notes: "", accessLevel: "" } as Partial<Login>)}
        deleteWarning="This will permanently delete this login record."
        renderItem={(l, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="text-sm font-medium text-foreground">{l.platform}</div>
            <div className="flex flex-wrap gap-3 text-xs text-dim mt-1">
              {l.username && <span>User: {l.username}</span>}
              {l.accessLevel && <span>Access: {l.accessLevel}</span>}
              {l.loginUrl && <a href={l.loginUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Login URL</a>}
            </div>
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Platform" value={form.platform || ""} onChange={(v) => upd("platform", v)} required placeholder="e.g. WordPress, Google Ads" />
          <FormField label="Username" value={form.username || ""} onChange={(v) => upd("username", v)} />
          <FormField label="Login URL" value={form.loginUrl || ""} onChange={(v) => upd("loginUrl", v)} />
          <FormField label="Access Level" value={form.accessLevel || ""} onChange={(v) => upd("accessLevel", v)} placeholder="e.g. Admin, Editor" />
          <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
        </>)}
      />
    </div>
  );
}

// ── Campaigns Tab (with inline deliverables) ─

function CampaignsTab({ clientId }: { clientId: number }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Campaign[]>(`/cm/campaigns?clientId=${clientId}`),
      api<Deliverable[]>(`/cm/clients/${clientId}/campaign-deliverables`),
    ]).then(([c, d]) => {
      setCampaigns(c);
      setDeliverables(d);
    }).catch(console.error).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-sm text-muted">Loading campaigns...</div>;

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const statusColor = (s: string) =>
    s === "active" ? "bg-success/10 text-success" :
    s === "paused" ? "bg-warning/10 text-warning" :
    s === "completed" ? "bg-accent/10 text-accent" : "bg-surface-2 text-dim";

  const priorityColor = (p: string) =>
    p === "high" ? "text-destructive" : p === "medium" ? "text-warning" : "text-dim";

  return (
    <div className="space-y-4">
      {campaigns.length === 0 ? (
        <div className="text-muted">No campaigns yet.</div>
      ) : campaigns.map((c) => {
        const isOpen = expanded.has(c.id);
        const camDels = deliverables.filter((d) => d.campaignId === c.id);
        return (
          <div key={c.id} className="bg-surface border border-border rounded-md">
            <button onClick={() => toggle(c.id)} className="w-full text-left p-5 flex items-start justify-between hover:bg-surface-2/50 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">{c.campaignName}</h3>
                  <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize", statusColor(c.status))}>{c.status}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-dim">
                  {c.campaignType && <span className="px-2 py-0.5 rounded bg-surface-2">{c.campaignType}</span>}
                  {c.platforms && <span className="px-2 py-0.5 rounded bg-surface-2">{c.platforms}</span>}
                  {c.budget && <span className="px-2 py-0.5 rounded bg-surface-2">${c.budget}</span>}
                  {c.durationType && <span className="px-2 py-0.5 rounded bg-surface-2">{c.durationType}</span>}
                  {camDels.length > 0 && <span className="px-2 py-0.5 rounded bg-accent/10 text-accent">{camDels.length} deliverable{camDels.length !== 1 ? "s" : ""}</span>}
                </div>
              </div>
              <span className="text-dim text-xs mt-1">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
                {/* Campaign Details */}
                <FieldGrid fields={[
                  { label: "Services Promoted", value: c.servicesPromoted },
                  { label: "USPs", value: c.usps },
                  { label: "Audience Targeting", value: c.audienceTargeting },
                  { label: "Geo Targeting", value: c.geoTargeting },
                  { label: "Demographics - Gender", value: c.demographicsGender },
                  { label: "Demographics - Age", value: c.demographicsAge },
                  { label: "Demographics - Location", value: c.demographicsLocation },
                  { label: "Demographics - Interests", value: c.demographicsInterests },
                  { label: "Ad Types", value: c.adTypes },
                  { label: "Creative Style", value: c.creativeStyle },
                  { label: "CTAs", value: c.ctas },
                  { label: "Daily Budget", value: currency(c.dailyBudget) },
                  { label: "Total Budget", value: currency(c.totalBudget) },
                  { label: "Start Date", value: c.startDate },
                  { label: "End Date", value: c.endDate },
                  { label: "Expected Outcomes", value: c.expectedOutcomes },
                ]} />
                {c.notes && <div className="text-xs text-muted mt-2">{c.notes}</div>}

                {/* Deliverables */}
                {camDels.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Deliverables</h4>
                    <div className="space-y-2">
                      {camDels.map((d) => (
                        <div key={d.id} className="flex items-center justify-between bg-surface-2 rounded-md px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full",
                              d.status === "completed" || d.status === "live" ? "bg-success" :
                              d.status === "in_progress" || d.status === "in_review" ? "bg-accent" :
                              d.status === "revision" ? "bg-warning" : "bg-dim"
                            )} />
                            <span className="text-sm text-foreground">{d.title}</span>
                            <span className="text-xs text-dim">({d.deliverableType})</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            {d.assignedTo && <span className="text-muted">{d.assignedTo}</span>}
                            {d.dueDate && <span className="text-dim">{d.dueDate.split("T")[0]}</span>}
                            <span className={cn("font-medium capitalize", priorityColor(d.priority))}>{d.priority}</span>
                            <span className={cn("px-2 py-0.5 rounded capitalize",
                              d.status === "completed" || d.status === "live" ? "bg-success/10 text-success" :
                              d.status === "in_progress" ? "bg-accent/10 text-accent" : "bg-surface text-dim"
                            )}>{d.status.replace(/_/g, " ")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Marketing Plan Tab ───────────────────────

function MarketingPlanTab({ clientId }: { clientId: number }) {
  const [items, setItems] = useState<MarketingPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<MarketingPlanItem[]>(`/cm/clients/${clientId}/marketing-plan`).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-sm text-muted">Loading marketing plan...</div>;
  if (items.length === 0) return <div className="text-muted">No marketing plan items yet.</div>;

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        const included = catItems.filter((i) => i.isIncluded).length;
        return (
          <Section key={cat} title={`${cat} (${included}/${catItems.length} included)`}>
            <div className="space-y-2">
              {catItems.map((item) => (
                <div key={item.id} className={cn("flex items-center justify-between text-sm px-3 py-2 rounded-md",
                  item.isIncluded ? "bg-success/5" : "bg-surface-2")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("w-4 h-4 rounded border flex items-center justify-center text-xs",
                      item.isIncluded ? "bg-success/20 border-success text-success" : "border-dim text-transparent"
                    )}>{item.isIncluded ? "✓" : ""}</span>
                    <span className={cn("text-foreground", !item.isIncluded && "text-dim")}>{item.item}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dim">
                    {item.quantity && <span>Qty: {item.quantity}</span>}
                    {item.completionTarget && <span>Target: {item.completionTarget.split("T")[0]}</span>}
                    {item.notes && <span className="max-w-[200px] truncate">{item.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}

// ── Content Guide Tab ────────────────────────

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
      { label: "Approved Terminology", value: guide.approvedTerminology }, { label: "Restrictions", value: guide.restrictions },
    ]},
    { title: "USPs & Positioning", fields: [
      { label: "Unique Selling Points", value: guide.uniqueSellingPoints }, { label: "Guarantees", value: guide.guarantees },
      { label: "Competitive Advantages", value: guide.competitiveAdvantages },
    ]},
    { title: "Visual Identity", fields: [
      { label: "Brand Colors", value: guide.brandColors }, { label: "Fonts", value: guide.fonts },
      { label: "Logo Guidelines", value: guide.logoGuidelines }, { label: "Design Inspiration", value: guide.designInspiration },
      { label: "Stock Photography", value: guide.useStockPhotography ? "Yes" : null }, { label: "Image Source Notes", value: guide.imageSourceNotes },
    ]},
    { title: "Target Audience", fields: [
      { label: "Audience Summary", value: guide.targetAudienceSummary }, { label: "Demographics", value: guide.demographics },
      { label: "Psychographics", value: guide.psychographics },
    ]},
    { title: "Content Strategy", fields: [
      { label: "Focus Topics", value: guide.focusTopics }, { label: "SEO Keywords", value: guide.seoKeywords },
      { label: "Content Themes", value: guide.contentThemes }, { label: "Messaging Priorities", value: guide.messagingPriorities },
      { label: "Content Purpose", value: guide.contentPurpose }, { label: "User Action Strategy", value: guide.userActionStrategy },
    ]},
    { title: "Social Proof", fields: [
      { label: "Featured Testimonials", value: guide.featuredTestimonials }, { label: "Success Stories", value: guide.successStories },
      { label: "Social Proof Notes", value: guide.socialProofNotes },
    ]},
    { title: "Ad Copy Guidelines", fields: [
      { label: "Ad Copy Guidelines", value: guide.adCopyGuidelines }, { label: "Preferred CTAs", value: guide.preferredCtas },
      { label: "Targeting Preferences", value: guide.targetingPreferences },
    ]},
    { title: "Promotions & Calendar", fields: [
      { label: "Promotions", value: guide.promotions }, { label: "Observed Holidays", value: guide.observedHolidays },
      { label: "Holiday Content Notes", value: guide.holidayContentNotes },
    ]},
    { title: "Resources", fields: [
      { label: "Brand Story", value: guide.brandStory }, { label: "Existing Collateral", value: guide.existingCollateral },
      { label: "Marketing Guide", value: guide.marketingGuide }, { label: "Writing Style Guide", value: guide.writingStyleGuide },
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

// ── Health Tab (Traffic Light) ───────────────

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

// ── Brand Story Tab ──────────────────────────

function BrandStoryTab({ clientId }: { clientId: number }) {
  const [story, setStory] = useState<BrandStory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<BrandStory>(`/cm/clients/${clientId}/brand-story`).then(setStory).catch(() => {}).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-sm text-muted">Loading brand story...</div>;
  if (!story) return <div className="text-muted">No brand story generated yet.</div>;

  const jsonSections = [
    { label: "Hero", data: story.heroSection },
    { label: "Problem", data: story.problemSection },
    { label: "Guide", data: story.guideSection },
    { label: "Plan", data: story.planSection },
    { label: "Call to Action", data: story.ctaSection },
    { label: "Success", data: story.successSection },
    { label: "Failure", data: story.failureSection },
    { label: "Brand Voice", data: story.brandVoiceSection },
    { label: "Visual Identity", data: story.visualIdentitySection },
    { label: "Content Strategy", data: story.contentStrategySection },
    { label: "Messaging", data: story.messagingSection },
    { label: "Implementation", data: story.implementationSection },
  ];

  const filledSections = jsonSections.filter((s) => s.data && Object.keys(s.data as object).length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize",
          story.status === "approved" ? "bg-success/10 text-success" :
          story.status === "reviewed" ? "bg-accent/10 text-accent" : "bg-surface-2 text-dim"
        )}>{story.status}</span>
      </div>

      {story.fullBrandStory && (
        <Section title="Full Brand Story">
          <div className="bg-surface border border-border rounded-md p-6">
            <div className="text-sm text-foreground whitespace-pre-wrap">{story.fullBrandStory}</div>
          </div>
        </Section>
      )}

      {filledSections.map((s) => (
        <Section key={s.label} title={s.label}>
          <div className="bg-surface-2 rounded-md p-4 space-y-2">
            {Object.entries(s.data as Record<string, unknown>).map(([key, val]) => (
              val ? (
                <div key={key}>
                  <div className="text-xs text-dim capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}</div>
                </div>
              ) : null
            ))}
          </div>
        </Section>
      ))}

      {!story.fullBrandStory && filledSections.length === 0 && (
        <div className="text-muted">Brand story content is empty. Generate one to get started.</div>
      )}
    </div>
  );
}
