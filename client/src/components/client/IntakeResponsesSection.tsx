import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ClipboardList,
  Building2,
  Target,
  Users,
  Sparkles,
  Megaphone,
  Globe,
} from "lucide-react";

interface IntakeData {
  hasIntakeData: boolean;
  rawIntake: Record<string, string> | null;
  submittedAt: string | null;
  storyStatus: string | null;
}

interface SectionConfig {
  title: string;
  icon: typeof Building2;
  color: string;
  fields: { key: string; label: string }[];
}

const INTAKE_SECTIONS: SectionConfig[] = [
  {
    title: "Business Basics",
    icon: Building2,
    color: "text-blue-400",
    fields: [
      { key: "companyName", label: "Company Name" },
      { key: "industry", label: "Industry / Niche" },
      { key: "yearFounded", label: "Year Founded" },
      { key: "location", label: "Location" },
      { key: "numberOfEmployees", label: "Number of Employees" },
      { key: "companyWebsite", label: "Website" },
      { key: "companyPhone", label: "Phone" },
      { key: "companyEmail", label: "Email" },
      { key: "domain", label: "Primary Domain" },
    ],
  },
  {
    title: "Products & Services",
    icon: Target,
    color: "text-emerald-400",
    fields: [
      { key: "primaryServices", label: "Primary Services" },
      { key: "secondaryServices", label: "Secondary Services" },
      { key: "serviceAreas", label: "Service Areas" },
      { key: "averageProjectValue", label: "Average Customer Value" },
      { key: "uniqueOfferings", label: "Unique Offerings" },
    ],
  },
  {
    title: "Target Audience",
    icon: Users,
    color: "text-purple-400",
    fields: [
      { key: "idealCustomerDescription", label: "Ideal Customer" },
      { key: "customerDemographics", label: "Demographics" },
      { key: "customerPainPoints", label: "Pain Points" },
      { key: "customerGoals", label: "Goals & Desires" },
      { key: "decisionMakingProcess", label: "Decision Making Process" },
      { key: "commonObjections", label: "Common Objections" },
    ],
  },
  {
    title: "Brand & Positioning",
    icon: Sparkles,
    color: "text-amber-400",
    fields: [
      { key: "missionStatement", label: "Mission Statement" },
      { key: "brandValues", label: "Brand Values" },
      { key: "brandPersonality", label: "Brand Personality" },
      { key: "competitiveAdvantages", label: "Competitive Advantages" },
      { key: "topCompetitors", label: "Top Competitors" },
      { key: "desiredPerception", label: "Desired Perception" },
    ],
  },
  {
    title: "Marketing & Goals",
    icon: Megaphone,
    color: "text-rose-400",
    fields: [
      { key: "currentMarketingChannels", label: "Current Channels" },
      { key: "currentMarketingBudget", label: "Marketing Budget" },
      { key: "bestLeadSources", label: "Best Lead Sources" },
      { key: "previousMarketingExperience", label: "Previous Experience" },
      { key: "crmSystem", label: "CRM System" },
      { key: "primaryMarketingGoals", label: "Marketing Goals" },
      { key: "targetTimeframe", label: "Target Timeframe" },
      { key: "revenueGoals", label: "Revenue Goals" },
      { key: "leadVolumeGoals", label: "Lead Volume Goals" },
      { key: "specificCampaignIdeas", label: "Campaign Ideas" },
      { key: "existingBrandAssets", label: "Brand Assets" },
      { key: "brandGuidelines", label: "Brand Guidelines" },
      { key: "contentPreferences", label: "Content Preferences" },
      { key: "socialMediaPresence", label: "Social Media" },
      { key: "testimonials", label: "Testimonials" },
    ],
  },
];

export function IntakeResponsesSection({ clientId, clientSlug }: { clientId: number; clientSlug?: string }) {
  const [data, setData] = useState<IntakeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<IntakeData>(`/cm/clients/${clientId}/intake`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const expandAll = () => {
    if (expandedSections.size === INTAKE_SECTIONS.length) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(INTAKE_SECTIONS.map((_, i) => i)));
    }
  };

  const copyOnboardingLink = () => {
    const slug = clientSlug || clientId;
    const url = `${window.location.origin}/onboarding/intake?clientId=${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <div className="text-sm text-muted">Loading intake data...</div>;

  if (!data?.hasIntakeData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Onboarding Intake
          </h3>
        </div>
        <div className="bg-surface border border-border rounded-lg p-6 text-center space-y-3">
          <p className="text-sm text-muted">No onboarding intake data has been submitted yet.</p>
          <p className="text-xs text-dim">Send the onboarding link to this client to collect their business information.</p>
          <Button size="sm" variant="outline" onClick={copyOnboardingLink}>
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied!" : "Copy Onboarding Link"}
          </Button>
        </div>
      </div>
    );
  }

  const intake = data.rawIntake || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Onboarding Intake
          </h3>
          {data.submittedAt && (
            <span className="text-xs text-dim">
              Submitted {new Date(data.submittedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-xs" onClick={expandAll}>
            {expandedSections.size === INTAKE_SECTIONS.length ? "Collapse All" : "Expand All"}
          </Button>
          <Button size="sm" variant="outline" onClick={copyOnboardingLink}>
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {INTAKE_SECTIONS.map((section, i) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(i);
          const filledCount = section.fields.filter((f) => intake[f.key]?.trim()).length;

          return (
            <div key={i} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(i)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${section.color}`} />
                  <span className="text-sm font-medium text-foreground">{section.title}</span>
                  <span className="text-xs text-dim bg-surface-2 px-2 py-0.5 rounded-full">
                    {filledCount}/{section.fields.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted" />
                )}
              </button>
              {isExpanded && (
                <div className="px-4 py-3 bg-surface-2 space-y-3 border-t border-border">
                  {section.fields.map((field) => {
                    const value = intake[field.key];
                    if (!value?.trim()) return (
                      <div key={field.key}>
                        <div className="text-xs text-dim">{field.label}</div>
                        <div className="text-sm text-muted italic">Not provided</div>
                      </div>
                    );
                    return (
                      <div key={field.key}>
                        <div className="text-xs text-dim">{field.label}</div>
                        <div className="text-sm text-foreground whitespace-pre-wrap">{value}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
