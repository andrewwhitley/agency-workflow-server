import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { FormField } from "@/components/FormField";
import { Pencil } from "lucide-react";

interface Client {
  id: number;
  [key: string]: unknown;
}

interface SectionConfig {
  title: string;
  fields: { key: string; label: string; type?: "text" | "number" | "textarea" | "checkbox"; }[];
}

const SECTIONS: SectionConfig[] = [
  {
    title: "Company Information",
    fields: [
      { key: "companyName", label: "Company Name" },
      { key: "legalName", label: "Legal Name" },
      { key: "dbaName", label: "DBA / Trade Name" },
      { key: "industry", label: "Industry" },
      { key: "businessType", label: "Business Type" },
      { key: "location", label: "Location" },
      { key: "timeZone", label: "Time Zone" },
      { key: "companyWebsite", label: "Website" },
      { key: "domain", label: "Domain" },
      { key: "domainRegistrar", label: "Domain Registrar" },
      { key: "dateFounded", label: "Date Founded" },
      { key: "yearFounded", label: "Year Founded", type: "number" },
      { key: "ein", label: "EIN" },
      { key: "crmSystem", label: "CRM System" },
      { key: "isLocalServiceArea", label: "Local Service Area", type: "checkbox" },
      { key: "displayAddress", label: "Display Address", type: "checkbox" },
      { key: "telemedicineOffered", label: "Telemedicine Offered", type: "checkbox" },
    ],
  },
  {
    title: "Phone Numbers",
    fields: [
      { key: "companyPhone", label: "Company Phone" },
      { key: "mainPhone", label: "Main Phone" },
      { key: "smsPhone", label: "SMS Phone" },
      { key: "tollFreePhone", label: "Toll-Free" },
      { key: "faxPhone", label: "Fax" },
    ],
  },
  {
    title: "Email Addresses",
    fields: [
      { key: "companyEmail", label: "Company Email" },
      { key: "primaryEmail", label: "Primary Email" },
      { key: "inquiryEmails", label: "Inquiry Emails" },
      { key: "employmentEmail", label: "Employment Email" },
    ],
  },
  {
    title: "Financial & Business Metrics",
    fields: [
      { key: "numberOfEmployees", label: "Number of Employees", type: "number" },
      { key: "numberOfCustomers", label: "Number of Customers", type: "number" },
      { key: "desiredNewClients", label: "Desired New Clients", type: "number" },
      { key: "avgClientLifetimeValue", label: "Avg Client Lifetime Value", type: "number" },
      { key: "estimatedAnnualRevenue", label: "Estimated Annual Revenue", type: "number" },
      { key: "targetRevenue", label: "Target Revenue", type: "number" },
      { key: "currentMarketingSpend", label: "Current Marketing Spend", type: "number" },
      { key: "currentAdsSpend", label: "Current Ads Spend", type: "number" },
      { key: "paymentTypesAccepted", label: "Payment Types" },
    ],
  },
  {
    title: "Ads & Targeting",
    fields: [
      { key: "adsMarketingBudget", label: "Ads Marketing Budget" },
      { key: "adsRecruitingBudget", label: "Ads Recruiting Budget" },
      { key: "targetGoogleAdsConvRate", label: "Google Ads Conv Rate Target", type: "number" },
      { key: "targetGoogleAdsCpa", label: "Google Ads CPA Target", type: "number" },
      { key: "targetBingAdsConvRate", label: "Bing Ads Conv Rate Target", type: "number" },
      { key: "targetBingAdsCpa", label: "Bing Ads CPA Target", type: "number" },
      { key: "targetFacebookAdsCpa", label: "Facebook Ads CPA Target", type: "number" },
    ],
  },
  {
    title: "Operations",
    fields: [
      { key: "businessHours", label: "Business Hours", type: "textarea" },
      { key: "holidayHours", label: "Holiday Hours", type: "textarea" },
      { key: "serviceSeasonality", label: "Service Seasonality" },
      { key: "languagesSpoken", label: "Languages Spoken" },
    ],
  },
  {
    title: "Background & Credentials",
    fields: [
      { key: "combinedYearsExperience", label: "Combined Years Experience", type: "number" },
      { key: "businessFacts", label: "Business Facts", type: "textarea" },
      { key: "affiliationsAssociations", label: "Affiliations & Associations", type: "textarea" },
      { key: "certificationsTrainings", label: "Certifications & Trainings", type: "textarea" },
      { key: "communityInvolvement", label: "Community Involvement", type: "textarea" },
    ],
  },
  {
    title: "Design & Branding",
    fields: [
      { key: "colorScheme", label: "Color Scheme" },
      { key: "designInspirationUrls", label: "Design Inspiration URLs", type: "textarea" },
      { key: "googleDriveLink", label: "Google Drive Link" },
    ],
  },
];

export function CompanyInfoEdit({ client, onUpdate }: { client: Client; onUpdate: (updated: Client) => void }) {
  const [editSection, setEditSection] = useState<SectionConfig | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState(false);

  const openEdit = (section: SectionConfig) => {
    const data: Record<string, unknown> = {};
    section.fields.forEach((f) => { data[f.key] = client[f.key] ?? (f.type === "checkbox" ? false : ""); });
    setForm(data);
    setEditSection(section);
  };

  const submit = async () => {
    setPending(true);
    try {
      const updated = await api<Client>(`/cm/clients/${client.id}`, { method: "PUT", body: JSON.stringify(form) });
      onUpdate(updated);
      setEditSection(null);
    } catch (e) { console.error(e); }
    setPending(false);
  };

  const upd = (key: string, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

  const currency = (val: unknown) => {
    if (val == null || val === "") return null;
    return `$${Number(val).toLocaleString()}`;
  };
  const pct = (val: unknown) => {
    if (val == null || val === "") return null;
    return `${val}%`;
  };

  const displayVal = (key: string, val: unknown, type?: string) => {
    if (type === "checkbox") return val ? "Yes" : null;
    if (val == null || val === "") return null;
    if (key.includes("Revenue") || key.includes("Spend") || key.includes("Budget") || key.includes("Cpa") || key.includes("LifetimeValue")) return currency(val);
    if (key.includes("ConvRate")) return pct(val);
    return String(val);
  };

  return (
    <div className="space-y-8">
      {SECTIONS.map((section) => {
        const filled = section.fields.filter((f) => {
          const v = client[f.key];
          if (f.type === "checkbox") return v === true;
          return v != null && v !== "";
        });

        return (
          <div key={section.title}>
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <Button size="sm" variant="ghost" onClick={() => openEdit(section)}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            </div>
            {filled.length === 0 ? (
              <div className="text-sm text-muted">No data yet — click Edit to add.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                {filled.map((f) => (
                  <div key={f.key}>
                    <div className="text-xs text-dim">{f.label}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{displayVal(f.key, client[f.key], f.type)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {editSection && (
        <FormDialog open={true} onOpenChange={() => setEditSection(null)}
          title={`Edit ${editSection.title}`} onSubmit={submit} isPending={pending} wide>
          {editSection.fields.map((f) =>
            f.type === "checkbox" ? (
              <FormField key={f.key} label={f.label} type="checkbox" checked={!!form[f.key]} onChange={(v) => upd(f.key, v)} />
            ) : f.type === "textarea" ? (
              <FormField key={f.key} label={f.label} type="textarea" value={String(form[f.key] ?? "")} onChange={(v) => upd(f.key, v)} />
            ) : (
              <FormField key={f.key} label={f.label} type={f.type || "text"} value={String(form[f.key] ?? "")} onChange={(v: string) => upd(f.key, f.type === "number" ? (v ? parseFloat(v) : null) : v)} />
            )
          )}
        </FormDialog>
      )}
    </div>
  );
}
