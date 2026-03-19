import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { Pencil, Share2, Link2, Unlink } from "lucide-react";
import { CompanyInfoEdit } from "@/components/client/CompanyInfoEdit";
import { ServicesSection } from "@/components/client/ServicesSection";
import { CampaignsSection } from "@/components/client/CampaignsSection";
import { MarketingPlanSection } from "@/components/client/MarketingPlanSection";
import { ContentGuideSection } from "@/components/client/ContentGuideSection";
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
interface TeamMember { id: number; fullName: string; role: string | null; email: string | null; phone: string | null; photoUrl: string | null; linkedinUrl: string | null; facebookUrl: string | null; instagramUrl: string | null; bio: string | null; useForAttribution: boolean; preferredContactMethod: string | null; specialties: string | null; credentials: string | null; servicesOffered: string | null; gravatarEmail: string | null; tiktokUrl: string | null; twitterUrl: string | null; youtubeUrl: string | null; websiteUrl: string | null; education: string | null; yearsExperience: number | null; professionalMemberships: string | null; languagesSpoken: string | null; acceptingNewPatients: boolean; }
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

      {/* Contacts (Marketing Contacts) */}
      <CrudSection<Contact> title="Marketing Contacts" clientId={client.id} entityPath="contacts"
        emptyForm={() => ({ name: "", role: "", email: "", phone: "", phoneType: "", notes: "", isPrimary: false, shouldAttribute: false, linktreeUrl: "", gravatarEmail: "", marketingRole: "", preferredContactMethod: "", responseTime: "", approvalAuthority: false } as Partial<Contact>)}
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
              {c.marketingRole && <span className="text-accent">{c.marketingRole}</span>}
            </div>
          </CrudItem>
        )}
        renderForm={(form, upd) => (<>
          <FormField label="Name" value={form.name || ""} onChange={(v) => upd("name", v)} required />
          <FormField label="Role / Title" value={form.role || ""} onChange={(v) => upd("role", v)} />
          <FormField label="Marketing Role" value={form.marketingRole || ""} onChange={(v) => upd("marketingRole", v)} placeholder="e.g. Approves content, Reviews ads" />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email" value={form.email || ""} onChange={(v) => upd("email", v)} />
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
          <FormField label="Gravatar Email" type="email" value={form.gravatarEmail || ""} onChange={(v) => upd("gravatarEmail", v)} />
          <FormField label="Linktree URL" value={form.linktreeUrl || ""} onChange={(v) => upd("linktreeUrl", v)} />
          <FormField label="Notes" type="textarea" value={form.notes || ""} onChange={(v) => upd("notes", v)} />
          <div className="flex gap-4">
            <FormField label="Primary Contact" type="checkbox" checked={!!form.isPrimary} onChange={(v) => upd("isPrimary", v)} />
            <FormField label="Approval Authority" type="checkbox" checked={!!form.approvalAuthority} onChange={(v) => upd("approvalAuthority", v)} />
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

      {/* Team Members (Bio-Page Focused) */}
      <CrudSection<TeamMember> title="Team Members" clientId={client.id} entityPath="team-members" wide
        emptyForm={() => ({ fullName: "", role: "", email: "", phone: "", bio: "", linkedinUrl: "", facebookUrl: "", instagramUrl: "", tiktokUrl: "", twitterUrl: "", youtubeUrl: "", websiteUrl: "", useForAttribution: false, gravatarEmail: "", specialties: "", credentials: "", servicesOffered: "", education: "", yearsExperience: null, professionalMemberships: "", languagesSpoken: "", acceptingNewPatients: true } as Partial<TeamMember>)}
        renderItem={(m, onEdit, onDelete) => (
          <CrudItem onEdit={onEdit} onDelete={onDelete}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">{m.fullName}</span>
              {m.role && <span className="text-xs text-muted">({m.role})</span>}
              {m.useForAttribution && <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Attribution</span>}
              {m.acceptingNewPatients === false && <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning">Not Accepting</span>}
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
            <FormField label="Accepting New Patients" type="checkbox" checked={form.acceptingNewPatients !== false} onChange={(v) => upd("acceptingNewPatients", v)} />
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

// ── Brand Story Tab (editable) ───────────────

function BrandStoryTab({ clientId }: { clientId: number }) {
  const [story, setStory] = useState<BrandStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editFullStory, setEditFullStory] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [pending, setPending] = useState(false);

  const reload = useCallback(() => {
    api<BrandStory>(`/cm/clients/${clientId}/brand-story`).then(setStory).catch(() => setStory(null)).finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  const openEdit = () => {
    setEditFullStory(story?.fullBrandStory || "");
    setEditStatus(story?.status || "draft");
    setEditOpen(true);
  };

  const submit = async () => {
    setPending(true);
    try {
      if (story) {
        await api(`/cm/brand-story/${story.id}`, { method: "PUT", body: JSON.stringify({ fullBrandStory: editFullStory, status: editStatus }) });
      } else {
        await api(`/cm/clients/${clientId}/brand-story`, { method: "POST", body: JSON.stringify({ fullBrandStory: editFullStory, status: editStatus }) });
      }
      setEditOpen(false);
      reload();
    } catch (e) { console.error(e); }
    setPending(false);
  };

  if (loading) return <div className="text-sm text-muted">Loading brand story...</div>;

  const jsonSections = story ? [
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
  ].filter((s) => s.data && Object.keys(s.data as object).length > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {story && (
            <span className={cn("text-xs px-2 py-0.5 rounded font-medium capitalize",
              story.status === "approved" ? "bg-success/10 text-success" :
              story.status === "reviewed" ? "bg-accent/10 text-accent" : "bg-surface-2 text-dim"
            )}>{story.status}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {story && (
            story.shareToken ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/brand-story/${story.shareToken}`);
                }}>
                  <Link2 className="h-3 w-3 mr-1" /> Copy Link
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => {
                  await api(`/cm/brand-story/${story.id}/share`, { method: "DELETE" });
                  reload();
                }}>
                  <Unlink className="h-3 w-3 mr-1" /> Revoke
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={async () => {
                await api(`/cm/brand-story/${story.id}/share`, { method: "POST" });
                reload();
              }}>
                <Share2 className="h-3 w-3 mr-1" /> Share
              </Button>
            )
          )}
          <Button size="sm" variant="outline" onClick={openEdit}>
            <Pencil className="h-3 w-3 mr-1" /> {story ? "Edit" : "Create"} Brand Story
          </Button>
        </div>
      </div>

      {story?.fullBrandStory && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">Full Brand Story</h3>
          <div className="bg-surface border border-border rounded-md p-6">
            <div className="text-sm text-foreground whitespace-pre-wrap">{story.fullBrandStory}</div>
          </div>
        </div>
      )}

      {jsonSections.map((s) => (
        <div key={s.label}>
          <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">{s.label}</h3>
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
        </div>
      ))}

      {!story && <div className="text-muted">No brand story yet. Click "Create Brand Story" to start.</div>}

      <FormDialog open={editOpen} onOpenChange={setEditOpen}
        title={story ? "Edit Brand Story" : "Create Brand Story"}
        onSubmit={submit} isPending={pending} wide>
        <FormField label="Status" value={editStatus} onChange={setEditStatus} placeholder="draft, generated, reviewed, approved" />
        <FormField label="Full Brand Story" type="textarea" value={editFullStory} onChange={setEditFullStory} rows={20} />
      </FormDialog>
    </div>
  );
}
