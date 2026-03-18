import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
interface Service { id: number; category: string; serviceName: string; offered: boolean; price: number | null; duration: string | null; description: string | null; }
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

      {tab === "info" && <InfoTab client={client} />}
      {tab === "services" && <ServicesTab clientId={client.id} />}
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

// ── Info Tab ─────────────────────────────────

function InfoTab({ client }: { client: Client }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [differentiators, setDifferentiators] = useState<Differentiator[]>([]);
  const [links, setLinks] = useState<ImportantLink[]>([]);
  const [logins, setLogins] = useState<Login[]>([]);
  const [personas, setPersonas] = useState<BuyerPersona[]>([]);

  useEffect(() => {
    Promise.all([
      api<Contact[]>(`/cm/clients/${client.id}/contacts`).catch(() => []),
      api<Address[]>(`/cm/clients/${client.id}/addresses`).catch(() => []),
      api<ServiceArea[]>(`/cm/clients/${client.id}/service-areas`).catch(() => []),
      api<TeamMember[]>(`/cm/clients/${client.id}/team-members`).catch(() => []),
      api<Competitor[]>(`/cm/clients/${client.id}/competitors`).catch(() => []),
      api<Differentiator[]>(`/cm/clients/${client.id}/differentiators`).catch(() => []),
      api<ImportantLink[]>(`/cm/clients/${client.id}/important-links`).catch(() => []),
      api<Login[]>(`/cm/clients/${client.id}/logins`).catch(() => []),
      api<BuyerPersona[]>(`/cm/clients/${client.id}/buyer-personas`).catch(() => []),
    ]).then(([c, a, sa, tm, comp, diff, lnk, log, bp]) => {
      setContacts(c); setAddresses(a); setServiceAreas(sa); setTeamMembers(tm);
      setCompetitors(comp); setDifferentiators(diff); setLinks(lnk); setLogins(log); setPersonas(bp);
    });
  }, [client.id]);

  return (
    <div className="space-y-8">
      {/* Company Information */}
      <Section title="Company Information">
        <FieldGrid fields={[
          { label: "Company Name", value: client.companyName },
          { label: "Legal Name", value: client.legalName },
          { label: "DBA / Trade Name", value: client.dbaName },
          { label: "Industry", value: client.industry },
          { label: "Business Type", value: client.businessType },
          { label: "Location", value: client.location },
          { label: "Time Zone", value: client.timeZone },
          { label: "Website", value: client.companyWebsite },
          { label: "Domain", value: client.domain },
          { label: "Domain Registrar", value: client.domainRegistrar },
          { label: "Date Founded", value: client.dateFounded },
          { label: "Year Founded", value: client.yearFounded },
          { label: "EIN", value: client.ein },
          { label: "CRM System", value: client.crmSystem },
          { label: "Local Service Area", value: client.isLocalServiceArea ? "Yes" : null },
          { label: "Display Address", value: client.displayAddress ? "Yes" : null },
          { label: "Telemedicine Offered", value: client.telemedicineOffered ? "Yes" : null },
        ]} />
      </Section>

      {/* Phone Numbers */}
      <Section title="Phone Numbers">
        <FieldGrid fields={[
          { label: "Company Phone", value: client.companyPhone },
          { label: "Main Phone", value: client.mainPhone },
          { label: "SMS Phone", value: client.smsPhone },
          { label: "Toll-Free", value: client.tollFreePhone },
          { label: "Fax", value: client.faxPhone },
        ]} />
      </Section>

      {/* Email Addresses */}
      <Section title="Email Addresses">
        <FieldGrid fields={[
          { label: "Company Email", value: client.companyEmail },
          { label: "Primary Email", value: client.primaryEmail },
          { label: "Inquiry Emails", value: client.inquiryEmails },
          { label: "Employment Email", value: client.employmentEmail },
        ]} />
      </Section>

      {/* Addresses */}
      {addresses.length > 0 && (
        <Section title="Addresses">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((a) => (
              <div key={a.id} className="bg-surface-2 rounded-md p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{a.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface text-dim">{a.locationType}</span>
                  {a.isPrimary && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Primary</span>}
                </div>
                <div className="text-sm text-muted">
                  {[a.streetAddress, a.city, a.state, a.postalCode].filter(Boolean).join(", ")}
                </div>
                {a.notes && <div className="text-xs text-dim mt-1">{a.notes}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Service Areas */}
      {serviceAreas.length > 0 && (
        <Section title="Service Areas">
          {serviceAreas.map((sa) => (
            <div key={sa.id} className="space-y-1 mb-3">
              {sa.targetCities && <div><span className="text-xs text-dim">Cities:</span> <span className="text-sm text-foreground">{sa.targetCities}</span></div>}
              {sa.targetCounties && <div><span className="text-xs text-dim">Counties:</span> <span className="text-sm text-foreground">{sa.targetCounties}</span></div>}
              {sa.notes && <div className="text-xs text-dim">{sa.notes}</div>}
            </div>
          ))}
        </Section>
      )}

      {/* Contacts */}
      {contacts.length > 0 && (
        <Section title="Contacts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map((c) => (
              <div key={c.id} className="bg-surface-2 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  {c.role && <span className="text-xs text-muted">({c.role})</span>}
                  {c.isPrimary && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Primary</span>}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-dim">
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}{c.phoneType ? ` (${c.phoneType})` : ""}</span>}
                  {c.wordpressEmail && <span>WP: {c.wordpressEmail}</span>}
                  {c.linktreeUrl && <a href={c.linktreeUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Linktree</a>}
                </div>
                {c.notes && <div className="text-xs text-dim mt-1">{c.notes}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Financial & Business Metrics */}
      <Section title="Financial & Business Metrics">
        <FieldGrid fields={[
          { label: "Number of Employees", value: client.numberOfEmployees },
          { label: "Number of Customers", value: client.numberOfCustomers },
          { label: "Desired New Clients", value: client.desiredNewClients },
          { label: "Avg Client Lifetime Value", value: currency(client.avgClientLifetimeValue) },
          { label: "Estimated Annual Revenue", value: currency(client.estimatedAnnualRevenue) },
          { label: "Target Revenue", value: currency(client.targetRevenue) },
          { label: "Current Marketing Spend", value: currency(client.currentMarketingSpend) },
          { label: "Current Ads Spend", value: currency(client.currentAdsSpend) },
          { label: "Payment Types", value: client.paymentTypesAccepted },
        ]} />
      </Section>

      {/* Ads & Targeting */}
      <Section title="Ads & Targeting">
        <FieldGrid fields={[
          { label: "Ads Marketing Budget", value: client.adsMarketingBudget },
          { label: "Ads Recruiting Budget", value: client.adsRecruitingBudget },
          { label: "Google Ads Conv Rate Target", value: pct(client.targetGoogleAdsConvRate) },
          { label: "Google Ads CPA Target", value: currency(client.targetGoogleAdsCpa) },
          { label: "Bing Ads Conv Rate Target", value: pct(client.targetBingAdsConvRate) },
          { label: "Bing Ads CPA Target", value: currency(client.targetBingAdsCpa) },
          { label: "Facebook Ads CPA Target", value: currency(client.targetFacebookAdsCpa) },
        ]} />
      </Section>

      {/* Operations */}
      <Section title="Operations">
        <FieldGrid fields={[
          { label: "Business Hours", value: client.businessHours },
          { label: "Holiday Hours", value: client.holidayHours },
          { label: "Service Seasonality", value: client.serviceSeasonality },
          { label: "Languages Spoken", value: client.languagesSpoken },
        ]} />
      </Section>

      {/* Background & Credentials */}
      <Section title="Background & Credentials">
        <FieldGrid fields={[
          { label: "Combined Years Experience", value: client.combinedYearsExperience },
          { label: "Business Facts", value: client.businessFacts },
          { label: "Affiliations & Associations", value: client.affiliationsAssociations },
          { label: "Certifications & Trainings", value: client.certificationsTrainings },
          { label: "Community Involvement", value: client.communityInvolvement },
        ]} />
      </Section>

      {/* Design & Branding */}
      <Section title="Design & Branding">
        <FieldGrid fields={[
          { label: "Color Scheme", value: client.colorScheme },
          { label: "Design Inspiration URLs", value: client.designInspirationUrls },
          { label: "Google Drive Link", value: client.googleDriveLink },
        ]} />
      </Section>

      {/* Team Members */}
      {teamMembers.length > 0 && (
        <Section title="Team Members">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teamMembers.map((m) => (
              <div key={m.id} className="bg-surface-2 rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{m.fullName}</span>
                  {m.role && <span className="text-xs text-muted">({m.role})</span>}
                  {m.useForAttribution && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Attribution</span>}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-dim">
                  {m.email && <span>{m.email}</span>}
                  {m.phone && <span>{m.phone}</span>}
                  {m.preferredContactMethod && <span>Prefers: {m.preferredContactMethod}</span>}
                </div>
                {m.bio && <div className="text-xs text-muted mt-1">{m.bio}</div>}
                <div className="flex gap-2 mt-1">
                  {m.linkedinUrl && <a href={m.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">LinkedIn</a>}
                  {m.facebookUrl && <a href={m.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Facebook</a>}
                  {m.instagramUrl && <a href={m.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Instagram</a>}
                </div>
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
              <div key={c.id} className="flex items-start gap-3 text-sm">
                {c.rank && <span className="text-xs font-bold text-dim w-6 pt-0.5">#{c.rank}</span>}
                <div>
                  <span className="font-medium text-foreground">{c.companyName}</span>
                  {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent ml-2 hover:underline">{c.url}</a>}
                  {c.usps && <div className="text-xs text-muted mt-0.5">USPs: {c.usps}</div>}
                  {c.description && <div className="text-xs text-dim mt-0.5">{c.description}</div>}
                </div>
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

      {/* Buyer Personas */}
      {personas.length > 0 && (
        <Section title="Buyer Personas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {personas.map((p) => (
              <div key={p.id} className="bg-surface-2 rounded-md p-4">
                <div className="text-sm font-medium text-foreground mb-2">{p.personaName}</div>
                <FieldGrid fields={[
                  { label: "Age", value: p.age },
                  { label: "Gender", value: p.gender },
                  { label: "Location", value: p.location },
                  { label: "Family Status", value: p.familyStatus },
                  { label: "Education", value: p.educationLevel },
                  { label: "Occupation", value: p.occupation },
                  { label: "Income Level", value: p.incomeLevel },
                  { label: "Channels", value: p.communicationChannels },
                ]} />
                {p.needsDescription && <div className="mt-2"><span className="text-xs text-dim">Needs:</span> <span className="text-xs text-muted">{p.needsDescription}</span></div>}
                {p.painPoints && <div><span className="text-xs text-dim">Pain Points:</span> <span className="text-xs text-muted">{p.painPoints}</span></div>}
                {p.gains && <div><span className="text-xs text-dim">Gains:</span> <span className="text-xs text-muted">{p.gains}</span></div>}
                {p.buyingFactors && <div><span className="text-xs text-dim">Buying Factors:</span> <span className="text-xs text-muted">{p.buyingFactors}</span></div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Important Links */}
      {links.length > 0 && (
        <Section title="Important Links">
          <div className="space-y-1">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-dim min-w-[80px] text-center">{l.linkType}</span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate">{l.label || l.url}</a>
                {l.notes && <span className="text-xs text-dim">({l.notes})</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Logins / Accounts */}
      {logins.length > 0 && (
        <Section title="Logins & Accounts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {logins.map((l) => (
              <div key={l.id} className="bg-surface-2 rounded-md p-3">
                <div className="text-sm font-medium text-foreground">{l.platform}</div>
                <div className="flex flex-wrap gap-3 text-xs text-dim mt-1">
                  {l.username && <span>User: {l.username}</span>}
                  {l.accessLevel && <span>Access: {l.accessLevel}</span>}
                  {l.loginUrl && <a href={l.loginUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Login URL</a>}
                </div>
                {l.notes && <div className="text-xs text-dim mt-1">{l.notes}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Services Tab ─────────────────────────────

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
                  {s.duration && <span className="text-muted ml-2 text-xs">({s.duration})</span>}
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
