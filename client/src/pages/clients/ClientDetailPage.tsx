import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import {
  Pencil, Share2, Link2, Unlink, RefreshCw, ChevronDown, ChevronRight,
  Users, AlertTriangle, Shield, Compass, MousePointerClick, Trophy, Skull,
  MessageSquare, Eye, FileText, Palette, Rocket, Download, Check, X, Sparkles,
  BookOpen, Wand2, Target, Copy, Unlink as Unlink2,
} from "lucide-react";
import { CompanyInfoEdit } from "@/components/client/CompanyInfoEdit";
import { ServicesSection } from "@/components/client/ServicesSection";
import { CampaignsSection } from "@/components/client/CampaignsSection";
import { MarketingPlanSection } from "@/components/client/MarketingPlanSection";
import { ContentGuideSection } from "@/components/client/ContentGuideSection";
import { CrudSection, CrudItem } from "@/components/client/CrudSection";
import { FormField } from "@/components/FormField";
import { IntakeResponsesSection } from "@/components/client/IntakeResponsesSection";

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
  foundedMonth: number | null;
  businessHoursStructured: unknown;
  paymentTypes: unknown;
  numberOfCustomersPeriod: string | null;
  desiredNewClientsPeriod: string | null;
  estimatedAnnualRevenuePeriod: string | null;
  targetRevenuePeriod: string | null;
  currentMarketingSpendPeriod: string | null;
  currentAdsSpendPeriod: string | null;
  status: string;
  fieldSources: Record<string, string> | null;
  [key: string]: unknown;
}

interface PhoneNumber { id: number; label: string; phoneNumber: string; isSmsCapable: boolean; isPrimary: boolean; notes: string | null; }
interface EmailAddress { id: number; label: string; emailAddress: string; isPrimary: boolean; notes: string | null; }
interface Contact { id: number; name: string; role: string | null; email: string | null; phone: string | null; phoneType: string | null; notes: string | null; isPrimary: boolean; shouldAttribute: boolean; linktreeUrl: string | null; wordpressEmail: string | null; marketingRole: string | null; preferredContactMethod: string | null; responseTime: string | null; approvalAuthority: boolean; gravatarEmail: string | null; }
interface Address { id: number; label: string; streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null; locationType: string; notes: string | null; isPrimary: boolean; }
interface Service { id: number; category: string; serviceName: string; offered: boolean; price: number | null; duration: string | null; description: string | null; descriptionLong: string | null; idealPatientProfile: string | null; goodFitCriteria: string | null; notGoodFitCriteria: string | null; targetAgeRange: string | null; targetGender: string | null; targetConditions: string | null; targetInterests: string | null; serviceAreaCities: string | null; differentiators: string | null; expectedOutcomes: string | null; commonConcerns: string | null; parentServiceId: number | null; sortOrder: number; }
interface ServiceArea { id: number; targetCities: string | null; targetCounties: string | null; notes: string | null; }
interface TeamMember { id: number; fullName: string; role: string | null; email: string | null; phone: string | null; photoUrl: string | null; linkedinUrl: string | null; facebookUrl: string | null; instagramUrl: string | null; bio: string | null; useForAttribution: boolean; preferredContactMethod: string | null; specialties: string | null; credentials: string | null; servicesOffered: string | null; gravatarEmail: string | null; tiktokUrl: string | null; twitterUrl: string | null; youtubeUrl: string | null; websiteUrl: string | null; education: string | null; yearsExperience: number | null; professionalMemberships: string | null; languagesSpoken: string | null; acceptingNewPatients: boolean; linktreeUrl: string | null; }
interface Competitor { id: number; companyName: string; url: string | null; usps: string | null; description: string | null; rank: number | null; }
interface Differentiator { id: number; category: string; title: string | null; description: string; }
interface ImportantLink { id: number; linkType: string; url: string; label: string | null; notes: string | null; }
interface BuyerPersona { id: number; personaName: string; age: number | null; gender: string | null; location: string | null; familyStatus: string | null; educationLevel: string | null; occupation: string | null; incomeLevel: string | null; communicationChannels: string | null; needsDescription: string | null; painPoints: string | null; gains: string | null; buyingFactors: string | null; }
interface Login { id: number; platform: string; username: string | null; loginUrl: string | null; notes: string | null; accessLevel: string | null; }
interface Campaign { id: number; campaignName: string; campaignType: string | null; status: string; platforms: string | null; durationType: string | null; servicesPromoted: string | null; usps: string | null; demographicsGender: string | null; demographicsAge: string | null; demographicsLocation: string | null; demographicsInterests: string | null; audienceTargeting: string | null; geoTargeting: string | null; adTypes: string | null; creativeStyle: string | null; ctas: string | null; budget: number | null; dailyBudget: number | null; totalBudget: number | null; startDate: string | null; endDate: string | null; expectedOutcomes: string | null; notes: string | null; }
interface Deliverable { id: number; campaignId: number; title: string; deliverableType: string; status: string; priority: string; description: string | null; assignedTo: string | null; dueDate: string | null; completedAt: string | null; notes: string | null; }
interface MarketingPlanItem { id: number; category: string; item: string; isIncluded: boolean; quantity: number | null; notes: string | null; completionTarget: string | null; }
interface ContentGuidelines { brandVoice: string | null; tone: string | null; writingStyle: string | null; dosAndDonts: string | null; approvedTerminology: string | null; restrictions: string | null; uniqueSellingPoints: string | null; guarantees: string | null; competitiveAdvantages: string | null; brandColors: string | null; fonts: string | null; logoGuidelines: string | null; designInspiration: string | null; targetAudienceSummary: string | null; demographics: string | null; psychographics: string | null; focusTopics: string | null; seoKeywords: string | null; contentThemes: string | null; messagingPriorities: string | null; featuredTestimonials: string | null; successStories: string | null; socialProofNotes: string | null; adCopyGuidelines: string | null; preferredCtas: string | null; targetingPreferences: string | null; promotions: string | null; observedHolidays: string | null; holidayContentNotes: string | null; brandStory: string | null; contentPurpose: string | null; userActionStrategy: string | null; existingCollateral: string | null; useStockPhotography: boolean; imageSourceNotes: string | null; marketingGuide: string | null; writingStyleGuide: string | null; [key: string]: unknown; }
interface BrandStory { id: number; status: string; heroSection: unknown; problemSection: unknown; guideSection: unknown; planSection: unknown; ctaSection: unknown; successSection: unknown; failureSection: unknown; brandVoiceSection: unknown; visualIdentitySection: unknown; contentStrategySection: unknown; messagingSection: unknown; implementationSection: unknown; fullBrandStory: string | null; shareToken: string | null; }
interface HealthEntry { id: number; departmentName: string; status: string; notes: string | null; weekOf: string; icon: string | null; color: string | null; }

// ── Tabs ─────────────────────────────────────

const TABS = ["info", "services", "campaigns", "deliverables", "content-guide", "health", "brand-story"] as const;
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
          {(client.companyWebsite || client.domain) && <span>| {client.companyWebsite || client.domain}</span>}
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

      {tab === "info" && <InfoTab client={client} onClientUpdate={(c) => setClient(c as Client)} />}
      {tab === "services" && <ServicesSection clientId={client.id} />}
      {tab === "campaigns" && <CampaignsSection clientId={client.id} />}
      {tab === "deliverables" && <MarketingPlanSection clientId={client.id} />}
      {tab === "content-guide" && (
        <div className="space-y-8">
          <IntakeResponsesSection clientId={client.id} clientSlug={client.slug} />
          <ImportDocumentsSection clientId={client.id} onComplete={() => {}} />
          <ContentGuideSection clientId={client.id} />
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
              <FormField label="Needs" type="textarea" value={form.needsDescription || ""} onChange={(v) => upd("needsDescription", v)} />
              <FormField label="Pain Points" type="textarea" value={form.painPoints || ""} onChange={(v) => upd("painPoints", v)} />
              <FormField label="Gains" type="textarea" value={form.gains || ""} onChange={(v) => upd("gains", v)} />
              <FormField label="Buying Factors" type="textarea" value={form.buyingFactors || ""} onChange={(v) => upd("buyingFactors", v)} />
            </>)}
          />
        </div>
      )}
      {tab === "health" && <HealthTab clientId={client.id} />}
      {tab === "brand-story" && (
        <BrandStoryTab clientId={client.id} clientName={client.companyName} />
      )}
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
      <CompanyInfoEdit client={client as { id: number; [key: string]: unknown }} onUpdate={(c) => onClientUpdate(c as Client)} />

      {/* Phone Numbers */}
      <CrudSection<PhoneNumber> title="Phone Numbers" clientId={client.id} entityPath="phone-numbers"
        emptyForm={() => ({ label: "Main", phoneNumber: "", isSmsCapable: false, isPrimary: false, notes: "" } as Partial<PhoneNumber>)}
        renderItem={(p, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-surface text-dim">{p.label}</span>
              <span className="text-sm font-medium text-foreground">{p.phoneNumber}</span>
              {p.isPrimary && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Primary</span>}
              {p.isSmsCapable && <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success">SMS</span>}
            </div>
            {p.notes && <div className="text-xs text-muted mt-0.5">{p.notes}</div>}
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Label" type="select" value={form.label || "Main"}
            onChange={(v) => upd("label", v)}
            options={[
              { value: "Main", label: "Main" },
              { value: "Toll-Free", label: "Toll-Free" },
              { value: "Fax", label: "Fax" },
              { value: "After Hours", label: "After Hours" },
              { value: "Other", label: "Other" },
            ]} />
          <FormField label="Phone Number" value={form.phoneNumber || ""} onChange={(v) => upd("phoneNumber", v)} required />
          <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
          <div className="flex gap-4">
            <FormField label="Primary" type="checkbox" checked={!!form.isPrimary} onChange={(v) => upd("isPrimary", v)} />
            {form.label !== "Fax" && (
              <FormField label="SMS Capable" type="checkbox" checked={!!form.isSmsCapable} onChange={(v) => upd("isSmsCapable", v)} />
            )}
          </div>
        </>)}
      />

      {/* Email Addresses */}
      <CrudSection<EmailAddress> title="Email Addresses" clientId={client.id} entityPath="email-addresses"
        emptyForm={() => ({ label: "General", emailAddress: "", isPrimary: false, notes: "" } as Partial<EmailAddress>)}
        renderItem={(e, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-surface text-dim">{e.label}</span>
              <span className="text-sm font-medium text-foreground">{e.emailAddress}</span>
              {e.isPrimary && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Primary</span>}
            </div>
            {e.notes && <div className="text-xs text-muted mt-0.5">{e.notes}</div>}
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Label" type="select" value={form.label || "General"}
            onChange={(v) => upd("label", v)}
            options={[
              { value: "General", label: "General" },
              { value: "Inquiries", label: "Inquiries" },
              { value: "Employment", label: "Employment" },
              { value: "Billing", label: "Billing" },
              { value: "Scheduling", label: "Scheduling" },
              { value: "Other", label: "Other" },
            ]} />
          <FormField label="Email Address" type="email" value={form.emailAddress || ""} onChange={(v) => upd("emailAddress", v)} required />
          <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
          <FormField label="Primary" type="checkbox" checked={!!form.isPrimary} onChange={(v) => upd("isPrimary", v)} />
        </>)}
      />

      {/* Marketing Contacts */}
      <CrudSection<Contact> title="Marketing Contacts" clientId={client.id} entityPath="contacts"
        emptyForm={() => ({ name: "", role: "", email: "", phone: "", phoneType: "", notes: "", isPrimary: false, marketingRole: "", preferredContactMethod: "", responseTime: "", approvalAuthority: false } as Partial<Contact>)}
        renderItem={(c, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{c.name}</span>
              {c.role && <span className="text-xs text-muted">({c.role})</span>}
              {c.isPrimary && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Primary</span>}
              {c.approvalAuthority && <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning">Approver</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-dim">
              {c.email && <span>{c.email}</span>}
              {c.phone && <span>{c.phone}{c.phoneType ? ` (${c.phoneType})` : ""}</span>}
              {c.preferredContactMethod && <span>Prefers: {c.preferredContactMethod}</span>}
              {c.responseTime && <span>Response: {c.responseTime}</span>}
            </div>
            {c.marketingRole && <div className="text-xs text-accent mt-0.5">{c.marketingRole}</div>}
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Name" value={form.name || ""} onChange={(v) => upd("name", v)} required />
          <FormField label="Role / Title" value={form.role || ""} onChange={(v) => upd("role", v)} placeholder="e.g. Office Manager, Owner" />
          <FormField label="Marketing Coordination Role" value={form.marketingRole || ""} onChange={(v) => upd("marketingRole", v)} placeholder="e.g. Approves content, Reviews ads, Provides photos" />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" type="email" value={form.email || ""} onChange={(v) => upd("email", v)} />
            <FormField label="Phone" value={form.phone || ""} onChange={(v) => upd("phone", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Preferred Contact Method" type="select" value={form.preferredContactMethod || ""}
              onChange={(v) => upd("preferredContactMethod", v)}
              options={[
                { value: "", label: "—" },
                { value: "Email", label: "Email" },
                { value: "Phone", label: "Phone" },
                { value: "Text", label: "Text" },
                { value: "Slack", label: "Slack" },
                { value: "Other", label: "Other" },
              ]} />
            <FormField label="Response Time" value={form.responseTime || ""} onChange={(v) => upd("responseTime", v)} placeholder="e.g. Same day, 24-48hrs" />
          </div>
          <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
          <div className="flex gap-4">
            <FormField label="Primary Contact" type="checkbox" checked={!!form.isPrimary} onChange={(v) => upd("isPrimary", v)} />
            <FormField label="Approval Authority" type="checkbox" checked={!!form.approvalAuthority} onChange={(v) => upd("approvalAuthority", v)} />
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

      {/* Team Members (Bio-Page Focused) */}
      <CrudSection<TeamMember> title="Team Members" clientId={client.id} entityPath="team-members" wide
        emptyForm={() => ({ fullName: "", role: "", email: "", phone: "", bio: "", linkedinUrl: "", facebookUrl: "", instagramUrl: "", tiktokUrl: "", twitterUrl: "", youtubeUrl: "", websiteUrl: "", useForAttribution: false, gravatarEmail: "", specialties: "", credentials: "", servicesOffered: "", education: "", yearsExperience: null, professionalMemberships: "", languagesSpoken: "", acceptingNewPatients: true, linktreeUrl: "" } as Partial<TeamMember>)}
        renderItem={(m, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{m.fullName}</span>
              {m.role && <span className="text-xs text-muted">({m.role})</span>}
              {m.useForAttribution && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Attribution</span>}
              {m.acceptingNewPatients === false && <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning">Not Accepting Clients</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-dim">
              {m.email && <span>{m.email}</span>}
              {m.phone && <span>{m.phone}</span>}
              {m.credentials && <span>{m.credentials}</span>}
              {m.yearsExperience && <span>{m.yearsExperience}+ yrs</span>}
            </div>
            {m.bio && <div className="text-xs text-muted mt-1 line-clamp-2">{m.bio}</div>}
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" value={form.fullName || ""} onChange={(v) => upd("fullName", v)} required />
            <FormField label="Role / Title" value={form.role || ""} onChange={(v) => upd("role", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" value={form.email || ""} onChange={(v) => upd("email", v)} />
            <FormField label="Phone" value={form.phone || ""} onChange={(v) => upd("phone", v)} />
          </div>
          <FormField label="Gravatar Email" type="email" value={form.gravatarEmail || ""} onChange={(v) => upd("gravatarEmail", v)} />
          <FormField label="Credentials" value={form.credentials || ""} onChange={(v) => upd("credentials", v)} placeholder="e.g. DC, DACNB, MS" />
          <FormField label="Specialties" type="textarea" value={form.specialties || ""} onChange={(v) => upd("specialties", v)} />
          <FormField label="Services Offered" type="textarea" value={form.servicesOffered || ""} onChange={(v) => upd("servicesOffered", v)} />
          <FormField label="Bio" type="textarea" value={form.bio || ""} onChange={(v) => upd("bio", v)} rows={5} />
          <FormField label="Education" type="textarea" value={form.education || ""} onChange={(v) => upd("education", v)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Years of Experience" type="number" value={form.yearsExperience?.toString() || ""} onChange={(v) => upd("yearsExperience", v ? parseInt(v) : null)} />
            <FormField label="Languages Spoken" value={form.languagesSpoken || ""} onChange={(v) => upd("languagesSpoken", v)} />
          </div>
          <FormField label="Professional Memberships" type="textarea" value={form.professionalMemberships || ""} onChange={(v) => upd("professionalMemberships", v)} />
          <FormField label="Photo URL" value={form.photoUrl || ""} onChange={(v) => upd("photoUrl", v)} />
          <FormField label="Linktree URL" value={form.linktreeUrl || ""} onChange={(v) => upd("linktreeUrl", v)} />
          <div className="grid grid-cols-3 gap-4">
            <FormField label="LinkedIn" value={form.linkedinUrl || ""} onChange={(v) => upd("linkedinUrl", v)} />
            <FormField label="Facebook" value={form.facebookUrl || ""} onChange={(v) => upd("facebookUrl", v)} />
            <FormField label="Instagram" value={form.instagramUrl || ""} onChange={(v) => upd("instagramUrl", v)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="TikTok" value={form.tiktokUrl || ""} onChange={(v) => upd("tiktokUrl", v)} />
            <FormField label="Twitter/X" value={form.twitterUrl || ""} onChange={(v) => upd("twitterUrl", v)} />
            <FormField label="YouTube" value={form.youtubeUrl || ""} onChange={(v) => upd("youtubeUrl", v)} />
          </div>
          <FormField label="Website" value={form.websiteUrl || ""} onChange={(v) => upd("websiteUrl", v)} />
          <div className="flex gap-4">
            <FormField label="Use for Attribution" type="checkbox" checked={!!form.useForAttribution} onChange={(v) => upd("useForAttribution", v)} />
            <FormField label="Accepting New Clients" type="checkbox" checked={form.acceptingNewPatients !== false} onChange={(v) => upd("acceptingNewPatients", v)} />
          </div>
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

      <CrudSection<ImportantLink> title="Important Links" clientId={client.id} entityPath="important-links"
        collapsible defaultCollapsed
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
        collapsible defaultCollapsed
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

// ── Health Tab (Traffic Light) ───────────────

function HealthTab({ clientId }: { clientId: number }) {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEntry, setEditEntry] = useState<HealthEntry | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [pending, setPending] = useState(false);

  const reload = useCallback(() => {
    Promise.all([
      api<HealthEntry[]>(`/cm/traffic-light/health?clientId=${clientId}`).catch(() => []),
      api<{ id: number; name: string }[]>(`/cm/traffic-light/departments`).catch(() => []),
    ]).then(([e, d]) => { setEntries(e); setDepartments(d); }).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const openEdit = (e: HealthEntry) => { setEditEntry(e); setEditStatus(e.status); setEditNotes(e.notes || ""); };
  const submitEdit = async () => {
    if (!editEntry) return;
    setPending(true);
    try {
      await api(`/cm/traffic-light/health`, { method: "POST", body: JSON.stringify({
        clientId, departmentId: editEntry.id, weekOf: editEntry.weekOf, status: editStatus, notes: editNotes,
      })});
      setEditEntry(null);
      reload();
    } catch (e) { console.error(e); }
    setPending(false);
  };

  if (loading) return <div className="text-sm text-muted">Loading health status...</div>;

  const latestWeek = entries.length > 0 ? entries[0].weekOf : null;
  const latest = entries.filter((e) => e.weekOf === latestWeek);

  const statusColors: Record<string, string> = {
    green: "bg-success", yellow: "bg-warning", red: "bg-destructive", na: "bg-dim",
  };

  return (
    <div>
      {latest.length === 0 ? (
        <div className="text-muted">No health entries yet. Use the Weekly Check-in page to add status.</div>
      ) : (
        <>
          <div className="text-sm text-muted mb-4">Week of {latestWeek}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {latest.map((e) => (
              <button key={e.id} onClick={() => openEdit(e)}
                className="bg-surface border border-border rounded-md p-4 text-left hover:border-accent/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("w-3 h-3 rounded-full", statusColors[e.status] || "bg-dim")} />
                  <span className="text-sm font-medium text-foreground">{e.departmentName}</span>
                </div>
                {e.notes && <p className="text-xs text-muted">{e.notes}</p>}
              </button>
            ))}
          </div>
        </>
      )}

      {editEntry && (
        <FormDialog open={true} onOpenChange={() => setEditEntry(null)}
          title={`Edit ${editEntry.departmentName} — ${editEntry.weekOf}`}
          onSubmit={submitEdit} isPending={pending}>
          <div className="flex gap-3">
            {["green", "yellow", "red", "na"].map((s) => (
              <button key={s} type="button" onClick={() => setEditStatus(s)}
                className={cn("flex items-center gap-2 px-3 py-2 rounded-md border text-sm capitalize transition-colors",
                  editStatus === s ? "border-accent bg-accent/10 font-medium" : "border-border hover:bg-surface-2")}>
                <span className={cn("w-3 h-3 rounded-full", statusColors[s])} />
                {s === "na" ? "N/A" : s}
              </button>
            ))}
          </div>
          <FormField label="Notes" type="textarea" value={editNotes} onChange={setEditNotes} rows={3} />
        </FormDialog>
      )}
    </div>
  );
}

// ── Import Documents Section ──────────────────────────────────

function ImportDocumentsSection({ clientId, onComplete }: { clientId: number; onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [docIds, setDocIds] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    const ids = docIds.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<Record<string, unknown>>(`/cm/clients/${clientId}/import`, {
        method: "POST",
        body: JSON.stringify({ documentIds: ids, generateStory: false, enrichFromWeb: true }),
      });
      setResult(res);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
    setImporting(false);
  };

  if (!isOpen) {
    return (
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
          <FileText className="h-3 w-3 mr-1.5" /> Import from Documents
        </Button>
        <span className="text-xs text-dim">Paste Google Doc/Sheet IDs to auto-fill the content guide</span>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" /> Import from Documents
        </h3>
        <Button size="sm" variant="ghost" onClick={() => { setIsOpen(false); setResult(null); setError(null); }}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-xs text-dim">
        Paste Google Doc or Sheet IDs/URLs (one per line or comma-separated). AI will extract
        business data and fill in the content guide fields automatically.
      </p>
      <textarea
        value={docIds}
        onChange={(e) => setDocIds(e.target.value)}
        placeholder={"Paste document IDs or URLs here...\ne.g., 1h5L...abc\nhttps://docs.google.com/document/d/1WWj..."}
        className="w-full min-h-[100px] text-sm bg-surface-2 text-foreground border border-border rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleImport} disabled={importing || !docIds.trim()}>
          {importing ? (
            <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> Importing...</>
          ) : (
            <><Sparkles className="h-3 w-3 mr-1.5" /> Extract & Import</>
          )}
        </Button>
        {importing && <span className="text-xs text-dim">This may take 30-60 seconds...</span>}
      </div>
      {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>}
      {result && (
        <div className="text-sm bg-success/10 border border-success/20 rounded-md px-3 py-2 text-success">
          Import complete! {(result as any).summary?.fieldsExtracted || 0} fields extracted,{" "}
          {(result as any).summary?.fieldsEnriched || 0} enriched from web.
          {Object.entries((result as any).summary?.entitiesCreated || {}).map(([k, v]) => (
            <span key={k} className="ml-2">{String(v)} {k}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Brand Story Tab (full generation + editing) ───────────────

const BRAND_STORY_SECTIONS = [
  { key: "heroSection", title: "Your Customer", framework: "Brand Story" },
  { key: "problemSection", title: "The Problem You Solve", framework: "Brand Story" },
  { key: "guideSection", title: "Why You (Your Authority)", framework: "Brand Story" },
  { key: "planSection", title: "Your Process", framework: "Brand Story" },
  { key: "ctaSection", title: "Calls to Action", framework: "Brand Story" },
  { key: "successSection", title: "The Transformation", framework: "Brand Story" },
  { key: "failureSection", title: "What's at Stake", framework: "Brand Story" },
  { key: "brandVoiceSection", title: "Brand Voice & Personality", framework: "Brand Identity" },
  { key: "visualIdentitySection", title: "Visual Identity", framework: "Brand Identity" },
  { key: "contentStrategySection", title: "Content Strategy", framework: "Thought Leadership" },
  { key: "messagingSection", title: "Core Messaging", framework: "Messaging" },
  { key: "implementationSection", title: "Implementation Roadmap", framework: "Strategy" },
] as const;

const sectionIcons: Record<string, React.ElementType> = {
  heroSection: Users, problemSection: AlertTriangle, guideSection: Shield,
  planSection: Compass, ctaSection: MousePointerClick, successSection: Trophy,
  failureSection: Skull, brandVoiceSection: MessageSquare, visualIdentitySection: Eye,
  contentStrategySection: FileText, messagingSection: Palette, implementationSection: Rocket,
};

const sectionColors: Record<string, string> = {
  heroSection: "text-blue-500", problemSection: "text-red-500", guideSection: "text-emerald-500",
  planSection: "text-amber-500", ctaSection: "text-purple-500", successSection: "text-green-500",
  failureSection: "text-rose-500", brandVoiceSection: "text-pink-500", visualIdentitySection: "text-indigo-500",
  contentStrategySection: "text-cyan-500", messagingSection: "text-orange-500", implementationSection: "text-teal-500",
};

const frameworkBadgeColors: Record<string, string> = {
  "Brand Story": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Brand Identity": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Thought Leadership": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Messaging: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  Strategy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

interface SectionData { title: string; framework: string; content: string; generatedAt: string | null; editedAt: string | null; isEdited: boolean; }
interface BrandStoryData {
  story: BrandStory | null;
  buyerPersonas: Array<Record<string, unknown>>;
  brandColors: string | null;
  client: Record<string, unknown> | null;
}

function parseColorString(colorStr: string): { name: string; hex: string }[] {
  const colors: { name: string; hex: string }[] = [];
  if (!colorStr) return colors;
  const lines = colorStr.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    const hexMatch = line.match(/#([0-9A-Fa-f]{3,8})\b/);
    if (hexMatch) {
      let name = line.replace(hexMatch[0], "").replace(/[():]/g, "").trim();
      if (!name) name = hexMatch[0];
      colors.push({ name, hex: hexMatch[0] });
    }
  }
  return colors;
}

function ColorSwatches({ colorStr }: { colorStr: string }) {
  const colors = parseColorString(colorStr);
  if (colors.length === 0) return null;
  return (
    <div className="p-4 rounded-lg bg-surface-2 border border-border">
      <h4 className="text-xs font-semibold text-dim uppercase mb-3 flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5" /> Brand Colors
      </h4>
      <div className="flex flex-wrap gap-3">
        {colors.map((color, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-lg border border-border" style={{ backgroundColor: color.hex }} title={`${color.name}: ${color.hex}`} />
            <span className="text-[10px] font-medium text-dim max-w-[60px] text-center truncate">{color.name}</span>
            <span className="text-[9px] font-mono text-dim/70">{color.hex}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuyerPersonaCard({ persona }: { persona: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-md border-l-4 border-l-purple-400 bg-surface">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 hover:bg-surface-2 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-foreground">{String(persona.personaName || "")}</h4>
            {persona.age && <span className="text-xs text-dim">Age: {String(persona.age)}{persona.gender ? `, ${String(persona.gender)}` : ""}</span>}
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border space-y-2 text-sm">
          {["description", "painPoints", "needsDescription", "gains", "buyingFactors"].map((field) =>
            persona[field] ? (
              <div key={field}>
                <span className="text-xs font-semibold text-dim uppercase">{field.replace(/([A-Z])/g, " $1").trim()}</span>
                <p className="mt-0.5 text-foreground">{String(persona[field])}</p>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function BrandStoryTab({ clientId, clientName }: { clientId: number; clientName: string }) {
  const [data, setData] = useState<BrandStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [regenerateContext, setRegenerateContext] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [regenSectionLoading, setRegenSectionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"brandscript" | "full">("brandscript");

  const reload = useCallback(() => {
    api<BrandStoryData>(`/cm/clients/${clientId}/brand-story`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const story = data?.story;
  const buyerPersonas = data?.buyerPersonas || [];
  const brandColors = data?.brandColors || null;
  const hasGeneratedStory = story && story.status !== "draft";

  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMsg("Generating brand story... This may take 1-2 minutes.");
    try {
      await api(`/cm/clients/${clientId}/brand-story/generate`, { method: "POST" });
      setStatusMsg("Brand story generated!");
      reload();
    } catch (e) { setStatusMsg("Generation failed. Please try again."); console.error(e); }
    setGenerating(false);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleRegenerateAll = async () => {
    if (!confirm("Regenerate all sections? This will overwrite existing content.")) return;
    await handleGenerate();
  };

  const handleRegenerateSection = async (sectionKey: string) => {
    setRegenSectionLoading(true);
    try {
      await api(`/cm/clients/${clientId}/brand-story/regenerate-section`, {
        method: "POST", body: JSON.stringify({ sectionKey, additionalContext: regenerateContext || undefined }),
      });
      setRegeneratingSection(null);
      setRegenerateContext("");
      reload();
    } catch (e) { console.error(e); }
    setRegenSectionLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!editingSection || !story) return;
    setSavingSection(true);
    try {
      await api(`/cm/brand-story/${story.id}/section`, {
        method: "PUT", body: JSON.stringify({ sectionKey: editingSection, content: editContent }),
      });
      setEditingSection(null);
      reload();
    } catch (e) { console.error(e); }
    setSavingSection(false);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!story) return;
    try {
      await api(`/cm/brand-story/${story.id}/status`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      reload();
    } catch (e) { console.error(e); }
  };

  const handleShare = async () => {
    if (!story) return;
    try {
      const result = await api<BrandStory>(`/cm/brand-story/${story.id}/share`, { method: "POST" });
      if (result?.shareToken) {
        navigator.clipboard.writeText(`${window.location.origin}/brand-story/${result.shareToken}`);
      }
      reload();
    } catch (e) { console.error(e); }
  };

  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    setStatusMsg("Generating BrandScript... This may take 30-60 seconds.");
    try {
      await api(`/cm/clients/${clientId}/brand-story/generate-brandscript`, { method: "POST" });
      setStatusMsg("BrandScript generated!");
      reload();
    } catch (e) { setStatusMsg("BrandScript generation failed. Please try again."); console.error(e); }
    setGeneratingScript(false);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleRevokeShare = async () => {
    if (!story) return;
    try {
      await api(`/cm/brand-story/${story.id}/share`, { method: "DELETE" });
      reload();
    } catch (e) { console.error(e); }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const expandAll = () => setExpandedSections(new Set(BRAND_STORY_SECTIONS.map((s) => s.key)));
  const collapseAll = () => setExpandedSections(new Set());

  // Simple markdown to HTML converter
  const mdToHtml = (md: string): string => {
    return md
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline color chip next to hex codes
      .replace(/(#[0-9A-Fa-f]{6})\b/g, '<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:$1;border:1px solid rgba(128,128,128,0.2);vertical-align:middle"></span><code style="font-size:0.85em">$1</code></span>')
      // Bullet lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      // Numbered lists
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      // Paragraphs (double newlines)
      .replace(/\n\n+/g, '</p><p>')
      // Single newlines within text (not after block elements)
      .replace(/([^>])\n([^<])/g, '$1<br>$2')
      // Wrap in paragraph
      .replace(/^(?!<)/, '<p>')
      .replace(/(?!>)$/, '</p>')
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/<p>\s*(<[hul])/g, '$1')
      .replace(/(<\/[hul][^>]*>)\s*<\/p>/g, '$1');
  };

  const handleExportPDF = () => {
    if (!story) return;
    const brandColorsParsed = brandColors ? parseColorString(brandColors) : [];
    const primary = brandColorsParsed.length > 0 ? brandColorsParsed[0].hex : "#c9a96e";
    const accent = brandColorsParsed.length > 1 ? brandColorsParsed[1].hex : "#4a90d9";
    const dark = brandColorsParsed.length > 2 ? brandColorsParsed[2].hex : "#1a1f2e";
    const clientInfo = data?.client;
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    let sectionNum = 0;
    // Extract colors and fonts from Visual Identity content for PDF rendering
    const buildVisualIdentityPdf = (content: string): string => {
      const hexRegex = /#[0-9A-Fa-f]{6}/g;
      const contentLines = content.split("\n");
      const pdfColors: { hex: string; name: string; usage: string }[] = [];
      for (let i = 0; i < contentLines.length; i++) {
        const hexMatches = contentLines[i].match(hexRegex);
        if (hexMatches) {
          for (const hex of hexMatches) {
            const nm = contentLines[i].match(/\*\*(.+?)\*\*/);
            const name = nm ? nm[1].replace(/[*:]/g, "").trim() : contentLines[i].split("(")[0].replace(/[*#\-]/g, "").trim();
            let usage = "";
            for (let j = i + 1; j < Math.min(i + 5, contentLines.length); j++) {
              if (contentLines[j].toLowerCase().includes("usage:")) { usage = contentLines[j].replace(/.*[Uu]sage:\s*/, "").trim(); break; }
            }
            if (!pdfColors.find((c) => c.hex.toLowerCase() === hex.toLowerCase())) {
              pdfColors.push({ hex, name: name.substring(0, 40), usage });
            }
          }
        }
      }
      const pdfFonts: { name: string; type: string }[] = [];
      const fontNames = ["Montserrat", "Lora", "Open Sans", "Crimson Text", "Playfair Display", "Inter", "Raleway", "Poppins", "Sacramento", "Dancing Script"];
      for (const line of contentLines) {
        if (line.toLowerCase().includes("heading") && line.includes(":")) {
          for (const fn of fontNames) { if (line.includes(fn) && !pdfFonts.find((f) => f.name === fn)) pdfFonts.push({ name: fn, type: "Heading" }); }
        }
        if (line.toLowerCase().includes("body") && line.includes(":")) {
          for (const fn of fontNames) { if (line.includes(fn) && !pdfFonts.find((f) => f.name === fn)) pdfFonts.push({ name: fn, type: "Body" }); }
        }
      }

      let html = "";
      if (pdfColors.length > 0) {
        html += `<div style="margin-bottom:28px"><h3 style="font-family:'Playfair Display',serif;font-size:14pt;color:#1a1a1a;margin-bottom:16px">Color Palette</h3><div style="display:flex;flex-wrap:wrap;gap:16px">`;
        for (const c of pdfColors) {
          html += `<div style="width:160px;border-radius:8px;border:1px solid #e5e5e5;overflow:hidden">
            <div style="height:60px;background:${c.hex}"></div>
            <div style="padding:8px 10px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:9pt;font-weight:600;color:#333">${c.name}</span>
                <span style="font-size:8pt;font-family:monospace;color:#999">${c.hex}</span>
              </div>
              ${c.usage ? `<div style="font-size:7.5pt;color:#888;margin-top:4px">${c.usage}</div>` : ""}
            </div></div>`;
        }
        html += `</div></div>`;
      }
      if (pdfFonts.length > 0) {
        const fontImport = pdfFonts.map((f) => `family=${f.name.replace(/ /g, "+")}:wght@400;600;700`).join("&");
        html += `<style>@import url('https://fonts.googleapis.com/css2?${fontImport}&display=swap');</style>`;
        html += `<div style="margin-bottom:28px"><h3 style="font-family:'Playfair Display',serif;font-size:14pt;color:#1a1a1a;margin-bottom:16px">Typography</h3><div style="display:flex;flex-wrap:wrap;gap:16px">`;
        for (const f of pdfFonts) {
          html += `<div style="flex:1;min-width:220px;border-radius:8px;border:1px solid #e5e5e5;padding:16px">
            <div style="font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${primary};margin-bottom:8px">${f.type} — ${f.name}</div>
            <div style="font-family:'${f.name}',sans-serif;font-size:20pt;font-weight:700;color:#1a1a1a">The quick brown fox</div>
            <div style="font-family:'${f.name}',sans-serif;font-size:12pt;color:#555;margin-top:4px">jumps over the lazy dog — 0123456789</div>
            <div style="font-family:'${f.name}',sans-serif;font-size:9pt;color:#999;margin-top:4px">ABCDEFGHIJKLM abcdefghijklm</div>
          </div>`;
        }
        html += `</div></div>`;
      }
      // Add the rest of the content as rendered markdown
      html += mdToHtml(content);
      return html;
    };

    const sectionsHtml = BRAND_STORY_SECTIONS.map((def) => {
      const sd = (story as Record<string, unknown>)[def.key] as SectionData | undefined;
      if (!sd?.content) return "";
      sectionNum++;
      const num = String(sectionNum).padStart(2, "0");
      const rendered = def.key === "visualIdentitySection" ? buildVisualIdentityPdf(sd.content) : mdToHtml(sd.content);
      return `<div class="section-page"><div class="section-header-bar"><div class="section-number">${num}</div><div class="section-meta"><span class="section-cat">${def.framework}</span><h2 class="section-title">${sd.title || def.title}</h2></div></div><div class="section-body">${rendered}</div></div>`;
    }).filter(Boolean).join("");

    let tocNum = 0;
    const tocItems = BRAND_STORY_SECTIONS.map((def) => {
      const sd = (story as Record<string, unknown>)[def.key] as SectionData | undefined;
      if (!sd?.content) return "";
      tocNum++;
      return `<tr><td class="toc-num">${String(tocNum).padStart(2, "0")}</td><td class="toc-title">${sd.title || def.title}</td><td class="toc-cat">${def.framework}</td></tr>`;
    }).filter(Boolean).join("");

    const infoPairs: [string, string][] = [];
    if (clientInfo) {
      if (clientInfo.industry) infoPairs.push(["Industry", String(clientInfo.industry)]);
      if (clientInfo.companyWebsite) infoPairs.push(["Website", String(clientInfo.companyWebsite)]);
      if (clientInfo.companyPhone) infoPairs.push(["Phone", String(clientInfo.companyPhone)]);
      if (clientInfo.location) infoPairs.push(["Location", String(clientInfo.location)]);
    }
    const infoGrid = infoPairs.map(([l, v]) => `<div class="ci"><span class="ci-label">${l}</span><span class="ci-value">${v}</span></div>`).join("");
    const swatchHtml = brandColorsParsed.map((c) => `<div class="sw"><div class="sw-dot" style="background:${c.hex}"></div><span class="sw-name">${c.name}</span><span class="sw-hex">${c.hex}</span></div>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${clientName} — Brand Story</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;600;700&display=swap');
@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;font-size:10.5pt;line-height:1.8;color:#d4d4d8;background:#0c0c14;-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* Cover */
.cover{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:linear-gradient(160deg,#0c0c14 0%,#131320 35%,#0f1628 65%,#0c0c14 100%);padding:60px 50px;page-break-after:always;border-bottom:4px solid ${primary}}
.cover h1{font-family:'Playfair Display',serif;font-size:42pt;font-weight:700;color:#fff;line-height:1.15;margin-bottom:8px}
.cover-eyebrow{font-size:9pt;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:${primary};margin-bottom:20px}
.cover-rule{width:60px;height:3px;background:${primary};border-radius:2px;margin:20px auto}
.cover-subtitle{font-size:13pt;font-weight:300;color:rgba(255,255,255,.55);letter-spacing:.04em}
.ci-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 32px;margin-top:36px;padding:20px 28px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.ci{display:flex;flex-direction:column;align-items:center}
.ci-label{font-size:6.5pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${primary};margin-bottom:3px}
.ci-value{font-size:9.5pt;font-weight:500;color:rgba(255,255,255,.85)}
.sw-row{display:flex;justify-content:center;gap:24px;margin-top:32px}
.sw{display:flex;flex-direction:column;align-items:center;gap:6px}
.sw-dot{width:44px;height:44px;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid rgba(255,255,255,.1)}
.sw-name{font-size:7.5pt;font-weight:600;color:rgba(255,255,255,.7)}
.sw-hex{font-size:6.5pt;font-family:'SF Mono',Consolas,monospace;color:rgba(255,255,255,.35)}
.cover-date{margin-top:32px;font-size:8.5pt;color:rgba(255,255,255,.3)}

/* TOC */
.toc-page{padding:60px 50px;page-break-after:always;min-height:100vh;background:#0c0c14}
.toc-page h2{font-family:'Playfair Display',serif;font-size:24pt;font-weight:700;color:#fff;margin-bottom:8px}
.toc-rule{width:40px;height:2.5px;background:${primary};border-radius:1px;margin-bottom:32px}
.toc-table{width:100%;border-collapse:collapse}
.toc-table tr{border-bottom:1px solid rgba(255,255,255,.04)}
.toc-num{width:36px;padding:12px 0;font-size:10pt;font-weight:700;color:${primary}}
.toc-title{padding:12px 0;font-size:10.5pt;font-weight:500;color:#e4e4e7}
.toc-cat{text-align:right;padding:12px 0;font-size:7pt;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35)}

/* Sections */
.section-page{padding:48px 50px 40px;background:#0c0c14;page-break-inside:avoid}
.section-page+.section-page{border-top:1px solid rgba(255,255,255,.04)}
.section-header-bar{display:flex;align-items:flex-start;gap:16px;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid rgba(255,255,255,.06)}
.section-number{font-family:'Playfair Display',serif;font-size:36pt;font-weight:700;color:${primary};line-height:1;opacity:.25;min-width:44px}
.section-meta{flex:1}
.section-cat{display:inline-block;font-size:6.5pt;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:${primary};background:${primary}18;padding:3px 10px;border-radius:3px;margin-bottom:6px}
.section-title{font-family:'Playfair Display',serif;font-size:22pt;font-weight:700;color:#fff;line-height:1.3;margin-top:2px}

/* Section body — rendered markdown */
.section-body{font-size:10.5pt;line-height:1.85;color:#a1a1aa}
.section-body p{margin-bottom:12px}
.section-body h3{font-family:'Playfair Display',serif;font-size:13pt;font-weight:700;color:#fff;margin:20px 0 8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
.section-body h4{font-size:11pt;font-weight:700;color:#e4e4e7;margin:16px 0 6px}
.section-body strong{color:#e4e4e7;font-weight:600}
.section-body em{color:#a1a1aa;font-style:italic}
.section-body code{font-size:0.85em;color:rgba(255,255,255,.5);background:rgba(255,255,255,.05);padding:1px 4px;border-radius:3px}
.section-body ul{margin:8px 0 16px 0;padding-left:20px;list-style:none}
.section-body ul li{position:relative;padding-left:16px;margin-bottom:6px}
.section-body ul li::before{content:'';position:absolute;left:0;top:8px;width:6px;height:6px;border-radius:50%;background:${primary};opacity:.6}
.section-body ol{margin:8px 0 16px 0;padding-left:24px}
.section-body ol li{margin-bottom:6px}

/* Footer */
.doc-footer{text-align:center;padding:28px 50px;font-size:7.5pt;color:rgba(255,255,255,.2);border-top:1px solid rgba(255,255,255,.04)}
.doc-footer span{color:${primary}}
</style></head><body>
<div class="cover">
<div class="cover-eyebrow">Brand Story Guide</div>
<h1>${clientName}</h1>
<div class="cover-rule"></div>
<div class="cover-subtitle">A comprehensive brand narrative and marketing framework</div>
<div class="ci-grid">${infoGrid}</div>
${swatchHtml ? `<div class="sw-row">${swatchHtml}</div>` : ""}
<div class="cover-date">Prepared ${dateStr}</div>
</div>
<div class="toc-page"><h2>Contents</h2><div class="toc-rule"></div><table class="toc-table">${tocItems}</table></div>
${sectionsHtml}
<div class="doc-footer">Confidential — Prepared exclusively for <span>${clientName}</span> · ${dateStr}</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      const a = document.createElement("a");
      a.href = url; a.download = `${clientName.replace(/[^a-zA-Z0-9]/g, "_")}_Brand_Story.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (loading) return <div className="text-sm text-dim">Loading brand story...</div>;

  const brandscript = (story as any)?.brandscript as Record<string, unknown> | null;
  const hasBrandScript = !!brandscript;
  const hasFullStory = story && story.status !== "draft" && !!story.heroSection;

  // ── Mode Toggle + Status ──

  const statusColors: Record<string, string> = {
    draft: "bg-surface-2 text-dim", generated: "bg-blue-500/10 text-blue-400",
    reviewed: "bg-amber-500/10 text-amber-400", approved: "bg-green-500/10 text-green-400",
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1">
          <button
            onClick={() => setViewMode("brandscript")}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors",
              viewMode === "brandscript" ? "bg-accent text-white" : "text-dim hover:text-foreground")}
          >
            BrandScript
          </button>
          <button
            onClick={() => setViewMode("full")}
            className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors",
              viewMode === "full" ? "bg-accent text-white" : "text-dim hover:text-foreground")}
          >
            Full Brand Story
          </button>
        </div>
        {story && (
          <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize", statusColors[story.status] || statusColors.draft)}>
            {story.status}
          </span>
        )}
      </div>

      {statusMsg && <p className="text-sm text-accent">{statusMsg}</p>}

      {/* ═══ BRANDSCRIPT VIEW ═══ */}
      {viewMode === "brandscript" && (
        <>
          {!hasBrandScript ? (
            <div className="border-2 border-dashed border-blue-500/30 rounded-lg bg-blue-500/5 p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Generate {clientName}'s BrandScript</h3>
              <p className="text-dim max-w-lg mx-auto text-sm">
                Create a concise 2-page BrandScript — the core 7-part messaging framework.
                Perfect for a quick deliverable or as the starting point before the full brand story.
              </p>
              <Button onClick={handleGenerateScript} disabled={generatingScript} className="px-8">
                {generatingScript ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating BrandScript...</>
                ) : (
                  <><Wand2 className="h-4 w-4 mr-2" /> Generate BrandScript</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Brand Colors */}
              {brandColors && <ColorSwatches colorStr={brandColors} />}

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={handleGenerateScript} disabled={generatingScript}>
                  {generatingScript ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />} Regenerate
                </Button>
                {story?.shareToken ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/brand-story/${story.shareToken}`);
                    }}><Copy className="h-3 w-3 mr-1" /> Copy Link</Button>
                    <Button size="sm" variant="ghost" className="text-red-400" onClick={handleRevokeShare}><Unlink className="h-3 w-3" /></Button>
                  </div>
                ) : story && (
                  <Button size="sm" variant="outline" onClick={handleShare}><Share2 className="h-3 w-3 mr-1" /> Share</Button>
                )}
                <Button size="sm" variant="outline" onClick={handleExportPDF}><Download className="h-3 w-3 mr-1" /> Export PDF</Button>
              </div>

              {/* One-Liner */}
              {brandscript.oneLiner && (
                <div className="bg-surface border border-border rounded-lg p-6">
                  <div className="text-xs font-semibold text-dim uppercase mb-2">One-Liner</div>
                  <div className="text-lg font-medium text-foreground">{String(brandscript.oneLiner)}</div>
                </div>
              )}

              {/* Character */}
              {brandscript.character && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-foreground">The Character (Customer)</span>
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{String(brandscript.character)}</div>
                </div>
              )}

              {/* Problem */}
              {brandscript.problem && typeof brandscript.problem === "object" && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-semibold text-foreground">The Problem</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["villain", "external", "internal", "philosophical"] as const).map((key) => {
                      const val = (brandscript.problem as Record<string, unknown>)[key];
                      if (!val) return null;
                      const labels: Record<string, string> = { villain: "Root Cause", external: "External", internal: "Internal", philosophical: "Philosophical" };
                      const colors: Record<string, string> = { villain: "border-l-red-500", external: "border-l-orange-400", internal: "border-l-amber-400", philosophical: "border-l-yellow-400" };
                      return (
                        <div key={key} className={`border-l-4 ${colors[key]} bg-surface-2 rounded-r-md p-3`}>
                          <div className="text-[10px] font-semibold text-dim uppercase mb-1">{labels[key]}</div>
                          <div className="text-sm text-foreground">{String(val)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Guide */}
              {brandscript.guide && typeof brandscript.guide === "object" && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-foreground">The Guide (You)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["empathy", "authority"] as const).map((key) => {
                      const val = (brandscript.guide as Record<string, unknown>)[key];
                      if (!val) return null;
                      return (
                        <div key={key} className="bg-surface-2 rounded-md p-3">
                          <div className="text-[10px] font-semibold text-dim uppercase mb-1">{key}</div>
                          <div className="text-sm text-foreground whitespace-pre-wrap">{String(val)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Plan */}
              {brandscript.plan && typeof brandscript.plan === "object" && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Compass className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-foreground">The Plan</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {(["step1", "step2", "step3"] as const).map((key, idx) => {
                      const val = (brandscript.plan as Record<string, unknown>)[key];
                      if (!val) return null;
                      return (
                        <div key={key} className="flex-1 bg-surface-2 rounded-md p-3 text-center">
                          <div className="text-lg font-bold text-accent mb-1">{idx + 1}</div>
                          <div className="text-sm text-foreground">{String(val)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTA */}
              {brandscript.callToAction && typeof brandscript.callToAction === "object" && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MousePointerClick className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-semibold text-foreground">Call to Action</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["direct", "transitional"] as const).map((key) => {
                      const val = (brandscript.callToAction as Record<string, unknown>)[key];
                      if (!val) return null;
                      return (
                        <div key={key} className={`rounded-md p-3 ${key === "direct" ? "bg-accent/10 border border-accent/20" : "bg-surface-2"}`}>
                          <div className="text-[10px] font-semibold text-dim uppercase mb-1">{key === "direct" ? "Direct CTA" : "Transitional CTA"}</div>
                          <div className="text-sm text-foreground font-medium">{String(val)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Success & Failure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {brandscript.success && (
                  <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-semibold text-foreground">Success</span>
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{String(brandscript.success)}</div>
                  </div>
                )}
                {brandscript.failure && (
                  <div className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Skull className="h-4 w-4 text-rose-400" />
                      <span className="text-sm font-semibold text-foreground">Failure</span>
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{String(brandscript.failure)}</div>
                  </div>
                )}
              </div>

              {/* Transformation */}
              {(brandscript.transformationBefore || brandscript.transformationAfter) && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="text-sm font-semibold text-foreground mb-3">The Transformation</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {brandscript.transformationBefore && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-md p-3">
                        <div className="text-[10px] font-semibold text-red-400 uppercase mb-1">Before</div>
                        <div className="text-sm text-foreground">{String(brandscript.transformationBefore)}</div>
                      </div>
                    )}
                    {brandscript.transformationAfter && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-md p-3">
                        <div className="text-[10px] font-semibold text-green-400 uppercase mb-1">After</div>
                        <div className="text-sm text-foreground">{String(brandscript.transformationAfter)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ FULL BRAND STORY VIEW ═══ */}
      {viewMode === "full" && !hasFullStory && (
        <div className="border-2 border-dashed border-blue-500/30 rounded-lg bg-blue-500/5 p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Generate {clientName}'s Full Brand Story</h3>
          <p className="text-dim max-w-lg mx-auto text-sm">
            Create a comprehensive 12-section Brand Story Guide covering customer messaging,
            content strategy, brand identity, and implementation roadmap.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 max-w-lg mx-auto">
            <p className="text-sm text-amber-300">This takes 1-2 minutes to generate all 12 sections.</p>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="px-8">
            {generating ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating Full Brand Story...</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" /> Generate Full Brand Story</>
            )}
          </Button>
        </div>
      )}

      {viewMode === "full" && hasFullStory && (
        <>
          {/* Full Story Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {story.status === "generated" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate("reviewed")}>
                <Check className="h-3 w-3 mr-1" /> Mark Reviewed
              </Button>
            )}
            {story.status === "reviewed" && (
              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate("approved")}>
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={expandAll}><ChevronDown className="h-3 w-3 mr-1" /> Expand All</Button>
            <Button size="sm" variant="outline" onClick={collapseAll}><ChevronRight className="h-3 w-3 mr-1" /> Collapse All</Button>
            {story.shareToken ? (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/brand-story/${story.shareToken}`);
                }}><Copy className="h-3 w-3 mr-1" /> Copy Link</Button>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={handleRevokeShare}><Unlink className="h-3 w-3" /></Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={handleShare}><Share2 className="h-3 w-3 mr-1" /> Share</Button>
            )}
            <Button size="sm" variant="outline" onClick={handleExportPDF}><Download className="h-3 w-3 mr-1" /> Export PDF</Button>
            <Button size="sm" variant="outline" onClick={handleRegenerateAll} disabled={generating}>
              {generating ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />} Regenerate All
            </Button>
          </div>

          {/* Buyer Personas */}
          {buyerPersonas.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-400" /> Buyer Personas
                <span className="text-[10px] px-1.5 py-0 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20">Audience</span>
              </h3>
              {buyerPersonas.map((p, i) => <BuyerPersonaCard key={i} persona={p} />)}
            </div>
          )}

          {/* Brand Colors */}
          {brandColors && <ColorSwatches colorStr={brandColors} />}

          {/* Sections */}
          <div className="space-y-3">
        {BRAND_STORY_SECTIONS.map((def) => {
          const sectionData = (story as Record<string, unknown>)[def.key] as SectionData | undefined;
          if (!sectionData?.content) return null;
          const isExpanded = expandedSections.has(def.key);
          const isEditing = editingSection === def.key;
          const isRegenerating = regeneratingSection === def.key;
          const Icon = sectionIcons[def.key] || BookOpen;
          const iconColor = sectionColors[def.key] || "text-dim";

          return (
            <div key={def.key} className={cn("border border-border rounded-md bg-surface transition-all", isExpanded && "ring-1 ring-blue-500/30")}>
              <button onClick={() => toggleSection(def.key)} className="w-full p-4 text-left hover:bg-surface-2 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-md bg-surface-2", iconColor)}><Icon className="h-4 w-4" /></div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{def.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[10px] px-1.5 py-0 rounded border", frameworkBadgeColors[def.framework] || "")}>{def.framework}</span>
                        {sectionData.isEdited && <span className="text-[10px] px-1.5 py-0 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">Edited</span>}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-dim" /> : <ChevronRight className="h-4 w-4 text-dim" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border">
                  {isEditing ? (
                    <div className="space-y-3 mt-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-h-[300px] font-mono text-sm bg-surface-2 text-foreground border border-border rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Edit this section in markdown..."
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={savingSection}>
                          {savingSection ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />} Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Large color palette for Visual Identity section */}
                      {def.key === "visualIdentitySection" && (() => {
                        const hexes: { hex: string; name: string }[] = [];
                        try {
                          const lines = sectionData.content.split("\n");
                          for (const line of lines) {
                            const m = line.match(/#[0-9A-Fa-f]{6}/g);
                            if (m) for (const hex of m) {
                              if (!hexes.find((h) => h.hex.toLowerCase() === hex.toLowerCase())) {
                                const bold = line.match(/\*\*(.+?)\*\*/);
                                const name = bold ? bold[1].replace(/[*:]/g, "").trim() : hex;
                                hexes.push({ hex, name: name.substring(0, 30) });
                              }
                            }
                          }
                        } catch {}
                        if (hexes.length === 0) return null;
                        return (
                          <div className="mt-4 mb-2 flex flex-wrap gap-3">
                            {hexes.map((c, i) => (
                              <div key={i} className="rounded-lg border border-border overflow-hidden bg-surface" style={{ width: 120 }}>
                                <div style={{ height: 80, background: c.hex }} />
                                <div className="px-2 py-1.5 text-center">
                                  <div className="text-[10px] font-semibold text-foreground truncate">{c.name}</div>
                                  <div className="text-[9px] font-mono text-dim">{c.hex}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="text-sm text-foreground mt-4 leading-relaxed [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-3 [&_h4]:mb-1 [&_strong]:text-foreground [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1 [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: mdToHtml(sectionData.content) }} />
                      <div className="border-t border-border mt-4 pt-4 flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingSection(def.key); setEditContent(sectionData.content); }}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        {isRegenerating ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              value={regenerateContext}
                              onChange={(e) => setRegenerateContext(e.target.value)}
                              placeholder="Optional: additional guidance..."
                              className="flex-1 text-sm bg-surface-2 text-foreground border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button size="sm" onClick={() => handleRegenerateSection(def.key)} disabled={regenSectionLoading}>
                              {regenSectionLoading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />} Regenerate
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setRegeneratingSection(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRegeneratingSection(def.key); setRegenerateContext(""); }}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Regenerate Section
                          </Button>
                        )}
                      </div>
                      {sectionData.generatedAt && (
                        <p className="text-[10px] text-dim mt-2">
                          Generated: {new Date(sectionData.generatedAt).toLocaleString()}
                          {sectionData.editedAt && ` · Edited: ${new Date(sectionData.editedAt).toLocaleString()}`}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
          </div>
        </>
      )}
    </div>
  );
}
