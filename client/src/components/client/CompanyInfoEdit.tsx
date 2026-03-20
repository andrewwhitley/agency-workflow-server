import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { FormField } from "@/components/FormField";
import { BusinessHoursEditor } from "@/components/client/BusinessHoursEditor";
import { PaymentTypesEditor } from "@/components/client/PaymentTypesEditor";
import { Pencil } from "lucide-react";

interface Client {
  id: number;
  [key: string]: unknown;
}

interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "checkbox" | "select";
  options?: { value: string; label: string }[];
  // Pair with an adjacent period field
  periodKey?: string;
}

interface SectionConfig {
  title: string;
  fields: FieldConfig[];
  customEditors?: string[]; // keys for custom inline editors
}

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

const MONTH_OPTIONS = [
  { value: "", label: "—" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

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
      { key: "companyWebsite", label: "Website / Domain" },
      { key: "domainRegistrar", label: "Domain Registrar" },
      { key: "foundedMonth", label: "Founded Month", type: "select", options: MONTH_OPTIONS },
      { key: "yearFounded", label: "Founded Year", type: "number" },
      { key: "ein", label: "EIN" },
      { key: "crmSystem", label: "CRM System" },
      { key: "isLocalServiceArea", label: "Local Service Area", type: "checkbox" },
      { key: "displayAddress", label: "Display Address", type: "checkbox" },
      { key: "telemedicineOffered", label: "Telemedicine Offered", type: "checkbox" },
    ],
  },
  {
    title: "Financial & Business Metrics",
    fields: [
      { key: "numberOfEmployees", label: "Number of Employees", type: "number" },
      { key: "numberOfCustomers", label: "Number of Clients", type: "number", periodKey: "numberOfCustomersPeriod" },
      { key: "desiredNewClients", label: "Desired New Clients", type: "number", periodKey: "desiredNewClientsPeriod" },
      { key: "avgClientLifetimeValue", label: "Avg Client Lifetime Value", type: "number" },
      { key: "estimatedAnnualRevenue", label: "Estimated Revenue", type: "number", periodKey: "estimatedAnnualRevenuePeriod" },
      { key: "targetRevenue", label: "Target Revenue", type: "number", periodKey: "targetRevenuePeriod" },
      { key: "currentMarketingSpend", label: "Marketing Spend", type: "number", periodKey: "currentMarketingSpendPeriod" },
      { key: "currentAdsSpend", label: "Ads Spend", type: "number", periodKey: "currentAdsSpendPeriod" },
    ],
  },
  {
    title: "Operations",
    fields: [
      { key: "holidayHours", label: "Holiday Hours", type: "textarea" },
      { key: "serviceSeasonality", label: "Service Seasonality" },
      { key: "languagesSpoken", label: "Languages Spoken" },
    ],
    customEditors: ["businessHoursStructured", "paymentTypes"],
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
    section.fields.forEach((f) => {
      data[f.key] = client[f.key] ?? (f.type === "checkbox" ? false : "");
      if (f.periodKey) {
        data[f.periodKey] = client[f.periodKey] ?? "monthly";
      }
    });
    // Custom editors
    if (section.customEditors?.includes("businessHoursStructured")) {
      data["businessHoursStructured"] = client["businessHoursStructured"] ?? null;
    }
    if (section.customEditors?.includes("paymentTypes")) {
      data["paymentTypes"] = client["paymentTypes"] ?? null;
    }
    setForm(data);
    setEditSection(section);
  };

  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      // Filter out empty strings and unchanged defaults to avoid sending unnecessary fields
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(form)) {
        if (val === "" || val === undefined) continue;
        payload[key] = val;
      }
      const updated = await api<Client>(`/cm/clients/${client.id}`, { method: "PUT", body: JSON.stringify(payload) });
      onUpdate(updated);
      setEditSection(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setPending(false);
  };

  const upd = (key: string, val: unknown) => setForm((p) => ({ ...p, [key]: val }));

  const currency = (val: unknown) => {
    if (val == null || val === "") return null;
    return `$${Number(val).toLocaleString()}`;
  };

  const periodLabel = (key: string) => {
    const v = client[key];
    if (!v || v === "monthly") return "/mo";
    if (v === "annual") return "/yr";
    if (v === "weekly") return "/wk";
    return "";
  };

  const displayVal = (f: FieldConfig, val: unknown) => {
    if (f.type === "checkbox") return val ? "Yes" : null;
    if (val == null || val === "") return null;
    if (f.type === "select" && f.options) {
      const opt = f.options.find((o) => String(o.value) === String(val));
      return opt ? opt.label : String(val);
    }
    if (f.key.includes("Revenue") || f.key.includes("Spend") || f.key.includes("Budget") || f.key.includes("Cpa") || f.key.includes("LifetimeValue")) {
      const suffix = f.periodKey ? periodLabel(f.periodKey) : "";
      return `${currency(val)}${suffix}`;
    }
    if (f.key.includes("ConvRate")) return `${val}%`;
    if (f.periodKey) {
      return `${val}${periodLabel(f.periodKey)}`;
    }
    return String(val);
  };

  const displayCustom = (key: string): string | null => {
    const val = client[key];
    if (!val || typeof val !== "object") return null;
    if (key === "businessHoursStructured") {
      const h = val as Record<string, { open?: string; close?: string; closed?: boolean }>;
      return Object.entries(h).map(([day, d]) => d.closed ? `${day}: Closed` : `${day}: ${d.open || "?"}-${d.close || "?"}`).join("\n");
    }
    if (key === "paymentTypes") {
      const p = val as { types?: string[]; other?: string };
      const parts = [...(p.types || [])];
      if (p.other) parts.push(p.other);
      return parts.join(", ") || null;
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {SECTIONS.map((section) => {
        const filled = section.fields.filter((f) => {
          const v = client[f.key];
          if (f.type === "checkbox") return v === true;
          return v != null && v !== "";
        });
        const customFilled = (section.customEditors || []).filter((k) => displayCustom(k));

        return (
          <div key={section.title}>
            <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <Button size="sm" variant="ghost" onClick={() => openEdit(section)}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            </div>
            {filled.length === 0 && customFilled.length === 0 ? (
              <div className="text-sm text-muted">No data yet — click Edit to add.</div>
            ) : (
              <div className="space-y-4">
                {filled.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                    {filled.map((f) => (
                      <div key={f.key}>
                        <div className="text-xs text-dim">{f.label}</div>
                        <div className="text-sm text-foreground whitespace-pre-wrap">{displayVal(f, client[f.key])}</div>
                      </div>
                    ))}
                  </div>
                )}
                {customFilled.map((k) => (
                  <div key={k}>
                    <div className="text-xs text-dim mb-1">{k === "businessHoursStructured" ? "Business Hours" : "Payment Types"}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{displayCustom(k)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {editSection && (
        <FormDialog open={true} onOpenChange={() => { setEditSection(null); setError(null); }}
          title={`Edit ${editSection.title}`} onSubmit={submit} isPending={pending} wide>
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>}
          {editSection.fields.map((f) => {
            if (f.periodKey) {
              return (
                <div key={f.key} className="grid grid-cols-[1fr_auto] gap-2 items-end">
                  <FormField label={f.label} type={f.type === "number" ? "number" : "text"}
                    value={String(form[f.key] ?? "")}
                    onChange={(v: string) => upd(f.key, f.type === "number" ? (v ? parseFloat(v) : null) : v)} />
                  <FormField label="Period" type="select" value={String(form[f.periodKey] ?? "monthly")}
                    onChange={(v) => upd(f.periodKey!, v)} options={PERIOD_OPTIONS} />
                </div>
              );
            }
            if (f.type === "checkbox") {
              return <FormField key={f.key} label={f.label} type="checkbox" checked={!!form[f.key]} onChange={(v) => upd(f.key, v)} />;
            }
            if (f.type === "textarea") {
              return <FormField key={f.key} label={f.label} type="textarea" value={String(form[f.key] ?? "")} onChange={(v) => upd(f.key, v)} />;
            }
            if (f.type === "select" && f.options) {
              return <FormField key={f.key} label={f.label} type="select" value={String(form[f.key] ?? "")} onChange={(v) => upd(f.key, f.key === "foundedMonth" ? (v ? parseInt(v) : null) : v)} options={f.options} />;
            }
            return (
              <FormField key={f.key} label={f.label} type={f.type || "text"}
                value={String(form[f.key] ?? "")}
                onChange={(v: string) => upd(f.key, f.type === "number" ? (v ? parseFloat(v) : null) : v)} />
            );
          })}

          {/* Custom editors for Operations section */}
          {editSection.customEditors?.includes("businessHoursStructured") && (
            <BusinessHoursEditor value={form["businessHoursStructured"]} onChange={(v) => upd("businessHoursStructured", v)} />
          )}
          {editSection.customEditors?.includes("paymentTypes") && (
            <PaymentTypesEditor value={form["paymentTypes"]} onChange={(v) => upd("paymentTypes", v)} />
          )}
        </FormDialog>
      )}
    </div>
  );
}
