import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Check, Building2, Briefcase, Users, Target, FileText, Megaphone } from "lucide-react";

interface FormData {
  // Step 1: Company
  companyName: string; legalName: string; industry: string; location: string;
  companyWebsite: string; domain: string; companyPhone: string; companyEmail: string;
  dateFounded: string; businessType: string; ein: string;
  // Step 2: Operations
  numberOfEmployees: string; crmSystem: string; businessHours: string;
  timeZone: string; paymentTypesAccepted: string; languagesSpoken: string;
  // Step 3: Financial
  estimatedAnnualRevenue: string; targetRevenue: string; numberOfCustomers: string;
  desiredNewClients: string; avgClientLifetimeValue: string;
  currentMarketingSpend: string; currentAdsSpend: string;
  // Step 4: Background
  combinedYearsExperience: string; businessFacts: string;
  affiliationsAssociations: string; certificationsTrainings: string;
  communityInvolvement: string; serviceSeasonality: string;
  // Step 5: Services (text, will be parsed later)
  servicesOffered: string;
  // Step 6: Marketing Goals
  marketingGoals: string; targetAudience: string; competitorNames: string;
  uniqueSellingPoints: string; brandVoice: string;
  // Step 7: Branding
  colorScheme: string; designInspirationUrls: string;
}

const emptyForm: FormData = {
  companyName: "", legalName: "", industry: "", location: "",
  companyWebsite: "", domain: "", companyPhone: "", companyEmail: "",
  dateFounded: "", businessType: "", ein: "",
  numberOfEmployees: "", crmSystem: "", businessHours: "",
  timeZone: "", paymentTypesAccepted: "", languagesSpoken: "",
  estimatedAnnualRevenue: "", targetRevenue: "", numberOfCustomers: "",
  desiredNewClients: "", avgClientLifetimeValue: "",
  currentMarketingSpend: "", currentAdsSpend: "",
  combinedYearsExperience: "", businessFacts: "",
  affiliationsAssociations: "", certificationsTrainings: "",
  communityInvolvement: "", serviceSeasonality: "",
  servicesOffered: "",
  marketingGoals: "", targetAudience: "", competitorNames: "",
  uniqueSellingPoints: "", brandVoice: "",
  colorScheme: "", designInspirationUrls: "",
};

const STEPS = [
  { label: "Company Info", icon: Building2 },
  { label: "Operations", icon: Briefcase },
  { label: "Financial", icon: Target },
  { label: "Background", icon: FileText },
  { label: "Services", icon: Briefcase },
  { label: "Marketing", icon: Megaphone },
  { label: "Branding", icon: Target },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientSlug = searchParams.get("client");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savedClientId, setSavedClientId] = useState<number | null>(null);

  // If editing an existing client, load their data
  useEffect(() => {
    if (!clientSlug) return;
    api<Record<string, unknown>>(`/cm/clients/${clientSlug}`)
      .then((c) => {
        const f = { ...emptyForm };
        for (const [k, v] of Object.entries(c)) {
          if (k in f && v != null) (f as Record<string, string>)[k] = String(v);
        }
        setForm(f);
        if (typeof c.id === "number") setSavedClientId(c.id);
      })
      .catch(console.error);
  }, [clientSlug]);

  const upd = (k: keyof FormData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const [savedSlug, setSavedSlug] = useState<string | null>(clientSlug);
  const [error, setError] = useState<string | null>(null);

  const saveProgress = async () => {
    setSaving(true);
    setError(null);
    try {
      const excludeFromClient = ["servicesOffered", "marketingGoals", "competitorNames"];
      const guideFields = ["targetAudience", "uniqueSellingPoints", "brandVoice"];
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v && !excludeFromClient.includes(k) && !guideFields.includes(k)) {
          if (["numberOfEmployees", "numberOfCustomers", "desiredNewClients", "combinedYearsExperience"].includes(k)) {
            payload[k] = v ? parseInt(v) : null;
          } else if (["estimatedAnnualRevenue", "targetRevenue", "avgClientLifetimeValue", "currentMarketingSpend", "currentAdsSpend"].includes(k)) {
            payload[k] = v ? parseFloat(v) : null;
          } else {
            payload[k] = v;
          }
        }
      }

      let currentClientId = savedClientId;
      if (currentClientId) {
        await api(`/cm/clients/${currentClientId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        if (!form.companyName.trim()) { setError("Company name is required"); setSaving(false); return; }
        const client = await api<{ id: number; slug: string }>("/cm/clients", { method: "POST", body: JSON.stringify(payload) });
        currentClientId = client.id;
        setSavedClientId(client.id);
        setSavedSlug(client.slug);
      }

      // Save content guidelines if marketing fields filled
      if (currentClientId && (form.brandVoice || form.targetAudience || form.uniqueSellingPoints)) {
        await api(`/cm/clients/${currentClientId}/content-guidelines`, {
          method: "PUT",
          body: JSON.stringify({
            brandVoice: form.brandVoice,
            targetAudienceSummary: form.targetAudience,
            uniqueSellingPoints: form.uniqueSellingPoints,
          }),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      console.error(e);
    }
    setSaving(false);
  };

  const next = async () => {
    await saveProgress();
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const prev = () => { if (step > 0) setStep(step - 1); };

  const finish = async () => {
    await saveProgress();
    navigate(`/clients/${savedSlug || "unknown"}`);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">Client Onboarding</h2>
      <p className="text-sm text-muted mb-6">Complete each section to set up a new client profile</p>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <button key={i} onClick={() => setStep(i)}
              className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors",
                i === step ? "bg-accent text-white" :
                i < step ? "bg-success/10 text-success" : "bg-surface-2 text-dim")}>
              {i < step ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Form */}
      {error && <div className="bg-destructive/10 text-destructive text-sm rounded-md px-4 py-2">{error}</div>}
      <div className="bg-surface border border-border rounded-md p-6 space-y-4">
        {step === 0 && (<>
          <h3 className="text-sm font-semibold text-foreground mb-2">Company Information</h3>
          <Field label="Company Name *"><Input value={form.companyName} onChange={(e) => upd("companyName", e.target.value)} required /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Legal Name"><Input value={form.legalName} onChange={(e) => upd("legalName", e.target.value)} /></Field>
            <Field label="Industry"><Input value={form.industry} onChange={(e) => upd("industry", e.target.value)} placeholder="e.g. Healthcare" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location"><Input value={form.location} onChange={(e) => upd("location", e.target.value)} placeholder="City, State" /></Field>
            <Field label="Business Type"><Input value={form.businessType} onChange={(e) => upd("businessType", e.target.value)} /></Field>
          </div>
          <Field label="Website"><Input value={form.companyWebsite} onChange={(e) => upd("companyWebsite", e.target.value)} placeholder="https://example.com" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone"><Input value={form.companyPhone} onChange={(e) => upd("companyPhone", e.target.value)} /></Field>
            <Field label="Email"><Input value={form.companyEmail} onChange={(e) => upd("companyEmail", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date Founded"><Input value={form.dateFounded} onChange={(e) => upd("dateFounded", e.target.value)} /></Field>
            <Field label="EIN"><Input value={form.ein} onChange={(e) => upd("ein", e.target.value)} /></Field>
          </div>
        </>)}

        {step === 1 && (<>
          <h3 className="text-sm font-semibold text-foreground mb-2">Operations</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Number of Employees"><Input value={form.numberOfEmployees} onChange={(e) => upd("numberOfEmployees", e.target.value)} type="number" /></Field>
            <Field label="CRM System"><Input value={form.crmSystem} onChange={(e) => upd("crmSystem", e.target.value)} /></Field>
          </div>
          <Field label="Business Hours"><Textarea value={form.businessHours} onChange={(e) => upd("businessHours", e.target.value)} rows={3} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Time Zone"><Input value={form.timeZone} onChange={(e) => upd("timeZone", e.target.value)} /></Field>
            <Field label="Languages Spoken"><Input value={form.languagesSpoken} onChange={(e) => upd("languagesSpoken", e.target.value)} /></Field>
          </div>
          <Field label="Payment Types Accepted"><Input value={form.paymentTypesAccepted} onChange={(e) => upd("paymentTypesAccepted", e.target.value)} /></Field>
        </>)}

        {step === 2 && (<>
          <h3 className="text-sm font-semibold text-foreground mb-2">Financial Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Annual Revenue"><Input value={form.estimatedAnnualRevenue} onChange={(e) => upd("estimatedAnnualRevenue", e.target.value)} type="number" /></Field>
            <Field label="Target Revenue"><Input value={form.targetRevenue} onChange={(e) => upd("targetRevenue", e.target.value)} type="number" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current # of Clients"><Input value={form.numberOfCustomers} onChange={(e) => upd("numberOfCustomers", e.target.value)} type="number" /></Field>
            <Field label="Desired New Clients/Month"><Input value={form.desiredNewClients} onChange={(e) => upd("desiredNewClients", e.target.value)} type="number" /></Field>
          </div>
          <Field label="Avg Client Lifetime Value"><Input value={form.avgClientLifetimeValue} onChange={(e) => upd("avgClientLifetimeValue", e.target.value)} type="number" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Marketing Spend"><Input value={form.currentMarketingSpend} onChange={(e) => upd("currentMarketingSpend", e.target.value)} type="number" /></Field>
            <Field label="Current Ads Spend"><Input value={form.currentAdsSpend} onChange={(e) => upd("currentAdsSpend", e.target.value)} type="number" /></Field>
          </div>
        </>)}

        {step === 3 && (<>
          <h3 className="text-sm font-semibold text-foreground mb-2">Background & Credentials</h3>
          <Field label="Combined Years Experience"><Input value={form.combinedYearsExperience} onChange={(e) => upd("combinedYearsExperience", e.target.value)} type="number" /></Field>
          <Field label="Business Facts"><Textarea value={form.businessFacts} onChange={(e) => upd("businessFacts", e.target.value)} rows={3} placeholder="Key facts about the business" /></Field>
          <Field label="Affiliations & Associations"><Textarea value={form.affiliationsAssociations} onChange={(e) => upd("affiliationsAssociations", e.target.value)} rows={2} /></Field>
          <Field label="Certifications & Trainings"><Textarea value={form.certificationsTrainings} onChange={(e) => upd("certificationsTrainings", e.target.value)} rows={2} /></Field>
          <Field label="Community Involvement"><Textarea value={form.communityInvolvement} onChange={(e) => upd("communityInvolvement", e.target.value)} rows={2} /></Field>
          <Field label="Service Seasonality"><Input value={form.serviceSeasonality} onChange={(e) => upd("serviceSeasonality", e.target.value)} /></Field>
        </>)}

        {step === 4 && (<>
          <h3 className="text-sm font-semibold text-foreground mb-2">Services</h3>
          <p className="text-xs text-muted mb-3">List the main services offered. You can add detailed service profiles later in the client dashboard.</p>
          <Field label="Services Offered"><Textarea value={form.servicesOffered} onChange={(e) => upd("servicesOffered", e.target.value)} rows={8} placeholder="List services, one per line. Include pricing and descriptions if available." /></Field>
        </>)}

        {step === 5 && (<>
          <h3 className="text-sm font-semibold text-foreground mb-2">Marketing Goals & Strategy</h3>
          <Field label="Marketing Goals"><Textarea value={form.marketingGoals} onChange={(e) => upd("marketingGoals", e.target.value)} rows={3} placeholder="What does the client want to achieve?" /></Field>
          <Field label="Target Audience"><Textarea value={form.targetAudience} onChange={(e) => upd("targetAudience", e.target.value)} rows={3} placeholder="Who is the ideal client?" /></Field>
          <Field label="Competitors"><Textarea value={form.competitorNames} onChange={(e) => upd("competitorNames", e.target.value)} rows={2} placeholder="List main competitors, one per line" /></Field>
          <Field label="Unique Selling Points"><Textarea value={form.uniqueSellingPoints} onChange={(e) => upd("uniqueSellingPoints", e.target.value)} rows={3} placeholder="What makes this business different?" /></Field>
          <Field label="Brand Voice"><Textarea value={form.brandVoice} onChange={(e) => upd("brandVoice", e.target.value)} rows={2} placeholder="How should the brand sound? (e.g. professional, warm, authoritative)" /></Field>
        </>)}

        {step === 6 && (<>
          <h3 className="text-sm font-semibold text-foreground mb-2">Branding & Design</h3>
          <Field label="Color Scheme"><Textarea value={form.colorScheme} onChange={(e) => upd("colorScheme", e.target.value)} rows={2} placeholder="Brand colors with hex codes" /></Field>
          <Field label="Design Inspiration"><Textarea value={form.designInspirationUrls} onChange={(e) => upd("designInspirationUrls", e.target.value)} rows={3} placeholder="URLs of websites or designs the client likes" /></Field>
        </>)}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={prev} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-sm text-dim">Step {step + 1} of {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={saving}>
            {saving ? "Saving..." : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving}>
            {saving ? "Saving..." : "Complete Onboarding"} <Check className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
