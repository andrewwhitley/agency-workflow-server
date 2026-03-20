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
      {tab === "content-guide" && <ContentGuideSection clientId={client.id} />}
      {tab === "health" && <HealthTab clientId={client.id} />}
      {tab === "brand-story" && (
        <div className="space-y-8">
          <IntakeResponsesSection clientId={client.id} clientSlug={client.slug} />
          <BrandStoryTab clientId={client.id} clientName={client.companyName} />
        </div>
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [regenerateContext, setRegenerateContext] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [regenSectionLoading, setRegenSectionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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

  const handleExportPDF = () => {
    if (!story) return;
    const brandColorsParsed = brandColors ? parseColorString(brandColors) : [];
    const primary = brandColorsParsed.length > 0 ? brandColorsParsed[0].hex : "#c9a96e";
    const accent = brandColorsParsed.length > 1 ? brandColorsParsed[1].hex : "#4a90d9";
    const clientInfo = data?.client;
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    let sectionNum = 0;
    const sectionsHtml = BRAND_STORY_SECTIONS.map((def) => {
      const sd = (story as Record<string, unknown>)[def.key] as SectionData | undefined;
      if (!sd?.content) return "";
      sectionNum++;
      const num = String(sectionNum).padStart(2, "0");
      return `<div class="section-page"><div class="section-header-bar"><div class="section-number">${num}</div><div class="section-meta"><span class="section-cat">${def.framework}</span><h2 class="section-title">${sd.title || def.title}</h2></div></div><div class="section-body"><pre style="white-space:pre-wrap;font-family:inherit;margin:0">${sd.content.replace(/</g, "&lt;")}</pre></div></div>`;
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700&display=swap');
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;font-size:10pt;line-height:1.75;color:#d4d4d8;background:#0c0c14;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cover{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:linear-gradient(160deg,#0c0c14 0%,#131320 35%,#0f1628 65%,#0c0c14 100%);padding:60px 50px;page-break-after:always;position:relative}
.cover h1{font-family:'Playfair Display',serif;font-size:38pt;font-weight:700;color:#fff;line-height:1.15;margin-bottom:8px}
.cover-eyebrow{font-size:8pt;font-weight:600;letter-spacing:.25em;text-transform:uppercase;color:${primary};margin-bottom:16px}
.cover-rule{width:50px;height:3px;background:${primary};border-radius:2px;margin:18px auto}
.cover-subtitle{font-size:12pt;font-weight:300;color:rgba(255,255,255,.55);letter-spacing:.04em}
.ci-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 28px;margin-top:32px;padding:18px 24px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.ci{display:flex;flex-direction:column;align-items:center}.ci-label{font-size:6pt;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${primary};opacity:.8;margin-bottom:3px}.ci-value{font-size:9pt;font-weight:500;color:rgba(255,255,255,.85)}
.sw-row{display:flex;justify-content:center;gap:20px;margin-top:28px}.sw{display:flex;flex-direction:column;align-items:center;gap:4px}.sw-dot{width:32px;height:32px;border-radius:50%}.sw-name{font-size:7pt;font-weight:600;color:rgba(255,255,255,.7)}.sw-hex{font-size:6pt;font-family:monospace;color:rgba(255,255,255,.35)}
.cover-date{margin-top:28px;font-size:8pt;color:rgba(255,255,255,.3)}
.toc-page{padding:50px;page-break-after:always;background:#0c0c14;min-height:100vh}
.toc-page h2{font-family:'Playfair Display',serif;font-size:22pt;font-weight:700;color:#fff;margin-bottom:6px}
.toc-rule{width:40px;height:2px;background:${primary};border-radius:1px;margin-bottom:28px}
.toc-table{width:100%;border-collapse:collapse}.toc-table tr{border-bottom:1px solid rgba(255,255,255,.04)}
.toc-num{width:30px;padding:10px 0;font-size:9pt;font-weight:700;color:${primary}}.toc-title{padding:10px 0;font-size:10pt;font-weight:500;color:#e4e4e7}.toc-cat{text-align:right;padding:10px 0;font-size:7pt;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.35)}
.section-page{padding:44px 50px 36px;background:#0c0c14;page-break-inside:avoid}.section-page+.section-page{border-top:1px solid rgba(255,255,255,.04)}
.section-header-bar{display:flex;align-items:flex-start;gap:14px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.06)}
.section-number{font-family:'Playfair Display',serif;font-size:30pt;font-weight:700;color:${primary};line-height:1;opacity:.25;min-width:40px}
.section-meta{flex:1}.section-cat{display:inline-block;font-size:6pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${primary};background:${primary}18;padding:2px 8px;border-radius:3px;margin-bottom:4px}
.section-title{font-family:'Playfair Display',serif;font-size:20pt;font-weight:700;color:#fff;line-height:1.3;margin-top:2px}
.section-body{font-size:10pt;line-height:1.8;color:#a1a1aa}
.doc-footer{text-align:center;padding:24px 50px;font-size:7pt;color:rgba(255,255,255,.2);border-top:1px solid rgba(255,255,255,.04)}
</style></head><body>
<div class="cover"><div class="cover-inner">
<div class="cover-eyebrow">Brand Story Guide</div><h1>${clientName}</h1><div class="cover-rule"></div>
<div class="cover-subtitle">A comprehensive brand narrative and marketing framework</div>
<div class="ci-grid">${infoGrid}</div><div class="sw-row">${swatchHtml}</div>
<div class="cover-date">Prepared ${dateStr}</div></div></div>
<div class="toc-page"><h2>Contents</h2><div class="toc-rule"></div><table class="toc-table">${tocItems}</table></div>
${sectionsHtml}
<div class="doc-footer">Confidential — Prepared exclusively for ${clientName} · ${dateStr}</div>
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

  // ── No story generated yet — show generate CTA ──

  if (!hasGeneratedStory) {
    return (
      <div className="space-y-6">
        {buyerPersonas.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="h-4 w-4 text-purple-400" /> Buyer Personas</h3>
            {buyerPersonas.map((p, i) => <BuyerPersonaCard key={i} persona={p} />)}
          </div>
        )}

        <div className="border-2 border-dashed border-blue-500/30 rounded-lg bg-blue-500/5 p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Generate {clientName}'s Brand Story</h3>
            <p className="text-dim max-w-lg mx-auto text-sm">
              Create a comprehensive Brand Story Guide using all the intake data, company info,
              and content guidelines. This generates 12 detailed sections covering your customer,
              messaging, content strategy, and implementation plan.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {[
              { label: "Customer & Problem", icon: Users, color: "text-blue-400" },
              { label: "Authority & Process", icon: Compass, color: "text-emerald-400" },
              { label: "Transformation", icon: Trophy, color: "text-amber-400" },
              { label: "Content Strategy", icon: FileText, color: "text-purple-400" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-surface-2">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-xs font-medium text-dim">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 max-w-lg mx-auto">
            <p className="text-sm text-amber-300">
              <strong>Note:</strong> Generation uses AI to create 12 detailed sections. This may take 1-2 minutes.
              {story?.status === "draft" && " Onboarding data has been collected and is ready to use."}
            </p>
          </div>
          {statusMsg && <p className="text-sm text-accent">{statusMsg}</p>}
          <Button onClick={handleGenerate} disabled={generating} className="px-8">
            {generating ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating Brand Story...</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-2" /> Generate Brand Story</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Brand Story Generated — full view ──

  const statusColors: Record<string, string> = {
    draft: "bg-surface-2 text-dim", generated: "bg-blue-500/10 text-blue-400",
    reviewed: "bg-amber-500/10 text-amber-400", approved: "bg-green-500/10 text-green-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-400" /> Brand Story
          </h2>
          <p className="text-sm text-dim mt-1">Complete brand messaging and content strategy guide</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize", statusColors[story.status] || statusColors.draft)}>
            {story.status}
          </span>
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
      </div>

      {statusMsg && <p className="text-sm text-accent">{statusMsg}</p>}

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
                      <div className="text-sm text-foreground whitespace-pre-wrap mt-4 leading-relaxed">{sectionData.content}</div>
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
    </div>
  );
}
