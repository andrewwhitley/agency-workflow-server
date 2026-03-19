import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
  Building2,
  Users,
  Target,
  Megaphone,
  Globe,
  Send,
  Sparkles,
} from "lucide-react";

// ── Types ─────────────────────────────────────

interface IntakeFormData {
  // Section 1: Business Basics
  companyName: string;
  industry: string;
  yearFounded: string;
  location: string;
  numberOfEmployees: string;
  companyWebsite: string;
  companyPhone: string;
  companyEmail: string;
  domain: string;

  // Section 2: Products & Services
  primaryServices: string;
  secondaryServices: string;
  serviceAreas: string;
  averageProjectValue: string;
  uniqueOfferings: string;

  // Section 3: Target Audience
  idealCustomerDescription: string;
  customerDemographics: string;
  customerPainPoints: string;
  customerGoals: string;
  decisionMakingProcess: string;
  commonObjections: string;

  // Section 4: Brand & Positioning
  missionStatement: string;
  brandValues: string;
  brandPersonality: string;
  competitiveAdvantages: string;
  topCompetitors: string;
  desiredPerception: string;

  // Section 5: Marketing Current State
  currentMarketingChannels: string;
  currentMarketingBudget: string;
  bestLeadSources: string;
  previousMarketingExperience: string;
  crmSystem: string;

  // Section 6: Goals & Expectations
  primaryMarketingGoals: string;
  targetTimeframe: string;
  revenueGoals: string;
  leadVolumeGoals: string;
  specificCampaignIdeas: string;

  // Section 7: Content & Assets
  existingBrandAssets: string;
  brandGuidelines: string;
  contentPreferences: string;
  socialMediaPresence: string;
  testimonials: string;
}

const defaultFormData: IntakeFormData = {
  companyName: "",
  industry: "",
  yearFounded: "",
  location: "",
  numberOfEmployees: "",
  companyWebsite: "",
  companyPhone: "",
  companyEmail: "",
  domain: "",
  primaryServices: "",
  secondaryServices: "",
  serviceAreas: "",
  averageProjectValue: "",
  uniqueOfferings: "",
  idealCustomerDescription: "",
  customerDemographics: "",
  customerPainPoints: "",
  customerGoals: "",
  decisionMakingProcess: "",
  commonObjections: "",
  missionStatement: "",
  brandValues: "",
  brandPersonality: "",
  competitiveAdvantages: "",
  topCompetitors: "",
  desiredPerception: "",
  currentMarketingChannels: "",
  currentMarketingBudget: "",
  bestLeadSources: "",
  previousMarketingExperience: "",
  crmSystem: "",
  primaryMarketingGoals: "",
  targetTimeframe: "",
  revenueGoals: "",
  leadVolumeGoals: "",
  specificCampaignIdeas: "",
  existingBrandAssets: "",
  brandGuidelines: "",
  contentPreferences: "",
  socialMediaPresence: "",
  testimonials: "",
};

// ── Section & Step Definitions ─────────────────

interface StepDef {
  field: keyof IntakeFormData;
  label: string;
  type: "input" | "textarea";
  placeholder: string;
  example?: string;
  insight?: string;
  required?: boolean;
}

interface SectionDef {
  title: string;
  icon: typeof Building2;
  description: string;
  color: string;
  steps: StepDef[];
}

const SECTIONS: SectionDef[] = [
  {
    title: "Business Basics",
    icon: Building2,
    description: "Let's start with the fundamentals of your business.",
    color: "from-blue-500 to-blue-600",
    steps: [
      { field: "companyName", label: "Company Name", type: "input", placeholder: "Acme Marketing Co.", required: true, insight: "Your company name is the foundation of your brand identity. It will be used consistently across all marketing materials." },
      { field: "industry", label: "Industry / Niche", type: "input", placeholder: "e.g. Functional Medicine, SaaS, E-commerce", example: "Be specific! 'Functional Medicine for Women 35-55' is better than just 'Healthcare'", required: true },
      { field: "yearFounded", label: "Year Founded", type: "input", placeholder: "e.g. 2018" },
      { field: "location", label: "Primary Location / Service Area", type: "input", placeholder: "e.g. Austin, TX or Nationwide", example: "If you serve multiple areas, list your primary location and note 'also serving...'", required: true },
      { field: "numberOfEmployees", label: "Number of Employees", type: "input", placeholder: "e.g. 12" },
      { field: "companyWebsite", label: "Company Website", type: "input", placeholder: "https://www.example.com" },
      { field: "companyPhone", label: "Company Phone", type: "input", placeholder: "(555) 123-4567" },
      { field: "companyEmail", label: "Company Email", type: "input", placeholder: "info@example.com" },
      { field: "domain", label: "Primary Domain", type: "input", placeholder: "example.com", insight: "Your domain is your digital storefront. We'll analyze it for SEO opportunities and technical health." },
    ],
  },
  {
    title: "Products & Services",
    icon: Target,
    description: "Tell us about what you offer and how you deliver value.",
    color: "from-emerald-500 to-emerald-600",
    steps: [
      { field: "primaryServices", label: "Primary Services / Products", type: "textarea", placeholder: "List your main offerings...", example: "e.g. 'Comprehensive functional medicine consultations, hormone optimization programs, gut health restoration protocols, IV therapy'", required: true, insight: "Your primary services are what we'll lead with in your marketing. These should be your highest-value, most in-demand offerings." },
      { field: "secondaryServices", label: "Secondary Services / Products", type: "textarea", placeholder: "Any additional offerings...", example: "e.g. 'Nutritional counseling, supplements, lab testing, wellness workshops'" },
      { field: "serviceAreas", label: "Service Areas / Locations Served", type: "textarea", placeholder: "Where do you serve customers?", example: "e.g. 'Primary: Austin, TX metro area. Also serving: San Antonio, Dallas via telehealth'" },
      { field: "averageProjectValue", label: "Average Customer Value", type: "input", placeholder: "e.g. $5,000 per year", insight: "Knowing your average customer value helps us calculate ROI on marketing spend and set realistic acquisition cost targets." },
      { field: "uniqueOfferings", label: "What Makes Your Offerings Unique?", type: "textarea", placeholder: "What sets your products/services apart from competitors?", example: "e.g. 'We're the only practice in Austin offering DUTCH testing combined with personalized supplement protocols and monthly check-ins'" },
    ],
  },
  {
    title: "Target Audience",
    icon: Users,
    description: "Help us understand who your ideal customers are.",
    color: "from-purple-500 to-purple-600",
    steps: [
      { field: "idealCustomerDescription", label: "Describe Your Ideal Customer", type: "textarea", placeholder: "Who is your perfect customer? Paint a picture...", example: "e.g. 'Health-conscious women 35-55, professional, frustrated with conventional medicine, willing to invest $500+/mo in their health, active on Instagram/Facebook'", required: true, insight: "The more specific your ideal customer profile, the more targeted and effective your marketing will be. Think about your best existing customers." },
      { field: "customerDemographics", label: "Customer Demographics", type: "textarea", placeholder: "Age range, gender, income level, education, occupation...", example: "e.g. 'Women 35-55, household income $150k+, college-educated, professionals or business owners'" },
      { field: "customerPainPoints", label: "Customer Pain Points", type: "textarea", placeholder: "What problems are your customers trying to solve?", example: "e.g. 'Chronic fatigue, hormonal imbalances, digestive issues, feeling dismissed by traditional doctors, wanting root-cause solutions'", required: true, insight: "Pain points are the emotional drivers that make customers take action. These become the foundation of your messaging strategy." },
      { field: "customerGoals", label: "Customer Goals & Desires", type: "textarea", placeholder: "What do your customers want to achieve?", example: "e.g. 'Feel energized again, balance hormones naturally, lose stubborn weight, sleep through the night, have a trusted health partner'" },
      { field: "decisionMakingProcess", label: "How Do Customers Find & Choose You?", type: "textarea", placeholder: "Typical customer journey from awareness to purchase...", example: "e.g. 'Usually Google search or referral -> read reviews -> visit website -> book discovery call -> initial consultation -> become long-term patient'" },
      { field: "commonObjections", label: "Common Objections or Hesitations", type: "textarea", placeholder: "What concerns do potential customers have?", example: "e.g. 'Cost (not covered by insurance), time commitment, skepticism about functional medicine, already tried everything'" },
    ],
  },
  {
    title: "Brand & Positioning",
    icon: Sparkles,
    description: "Define how your brand should be perceived in the market.",
    color: "from-amber-500 to-amber-600",
    steps: [
      { field: "missionStatement", label: "Mission Statement", type: "textarea", placeholder: "What is your company's mission?", example: "e.g. 'To empower women to take control of their health through personalized, root-cause functional medicine that treats the whole person, not just symptoms'", insight: "Your mission statement guides all messaging decisions. It answers 'why does this company exist beyond making money?'" },
      { field: "brandValues", label: "Core Brand Values", type: "textarea", placeholder: "What values drive your business?", example: "e.g. 'Patient-first care, evidence-based protocols, holistic wellness, transparency, empowerment, continuous learning'" },
      { field: "brandPersonality", label: "Brand Personality & Tone", type: "textarea", placeholder: "If your brand were a person, how would they communicate?", example: "e.g. 'Warm and approachable but authoritative. Like a trusted friend who happens to be a brilliant doctor. Uses plain language, avoids jargon, empathetic but confident'", required: true },
      { field: "competitiveAdvantages", label: "Competitive Advantages", type: "textarea", placeholder: "What do you do better than anyone else?", example: "e.g. '15+ years experience, only board-certified functional medicine practice in Austin, proprietary wellness protocols, 95% patient retention rate'", required: true, insight: "Your competitive advantages become your key differentiators in all marketing campaigns. These are your 'unfair advantages.'" },
      { field: "topCompetitors", label: "Top Competitors", type: "textarea", placeholder: "Who are your main competitors?", example: "e.g. 'Austin Functional Medicine ($200-500/visit), HealthSpan Clinic (telehealth focus), local naturopaths'" },
      { field: "desiredPerception", label: "Desired Brand Perception", type: "textarea", placeholder: "How do you want people to think of your brand?", example: "e.g. 'The premier functional medicine practice in Austin - trusted, results-driven, caring, innovative, worth the investment'" },
    ],
  },
  {
    title: "Marketing Current State",
    icon: Megaphone,
    description: "Where are you now with your marketing efforts?",
    color: "from-rose-500 to-rose-600",
    steps: [
      { field: "currentMarketingChannels", label: "Current Marketing Channels", type: "textarea", placeholder: "What marketing are you currently doing?", example: "e.g. 'Website (WordPress), Google Business Profile, Instagram (2x/week posts), occasional Facebook ads, email newsletter (monthly), patient referral program'", insight: "Understanding your current marketing helps us identify quick wins and avoid duplicating efforts." },
      { field: "currentMarketingBudget", label: "Current Monthly Marketing Budget", type: "input", placeholder: "e.g. $3,000/month", example: "Include all marketing spend: ads, tools, freelancers, agency fees, etc." },
      { field: "bestLeadSources", label: "Best Current Lead Sources", type: "textarea", placeholder: "Where do your best customers come from?", example: "e.g. 'Google organic (35%), patient referrals (30%), Google Ads (20%), Instagram (10%), other (5%)'" },
      { field: "previousMarketingExperience", label: "Previous Marketing Experience", type: "textarea", placeholder: "What has worked? What hasn't? Any bad experiences?", example: "e.g. 'Tried SEO agency for 6 months - saw some improvement but felt they didn't understand our niche. Facebook ads worked well for events but not for patient acquisition.'", insight: "Learning from past marketing efforts helps us avoid repeating mistakes and double down on what works." },
      { field: "crmSystem", label: "CRM / Practice Management System", type: "input", placeholder: "e.g. GoHighLevel, HubSpot, Practice Better" },
    ],
  },
  {
    title: "Goals & Expectations",
    icon: Target,
    description: "What does success look like for your marketing?",
    color: "from-cyan-500 to-cyan-600",
    steps: [
      { field: "primaryMarketingGoals", label: "Primary Marketing Goals", type: "textarea", placeholder: "What are you hoping to achieve with marketing?", example: "e.g. '1) Increase new patient bookings from 8/month to 20/month, 2) Build brand awareness in Austin area, 3) Establish Dr. Smith as thought leader in functional medicine, 4) Reduce dependence on referrals'", required: true, insight: "Clear, measurable goals let us build a strategy with specific KPIs and a realistic timeline." },
      { field: "targetTimeframe", label: "Target Timeframe", type: "input", placeholder: "e.g. 6-12 months", example: "When do you want to see results? Be realistic - SEO takes 3-6 months, ads can show results in weeks." },
      { field: "revenueGoals", label: "Revenue Goals", type: "input", placeholder: "e.g. $1.5M annual revenue", example: "Where do you want revenue to be in 12 months?" },
      { field: "leadVolumeGoals", label: "Lead / Appointment Volume Goals", type: "input", placeholder: "e.g. 40 discovery calls per month", insight: "Lead volume goals help us calculate the funnel metrics needed: traffic -> leads -> appointments -> customers." },
      { field: "specificCampaignIdeas", label: "Specific Campaign or Project Ideas", type: "textarea", placeholder: "Any specific marketing projects you have in mind?", example: "e.g. 'New website design, Google Ads campaign for hormone therapy, monthly wellness blog, patient success story video series'" },
    ],
  },
  {
    title: "Content & Assets",
    icon: Globe,
    description: "What existing brand materials and content do you have?",
    color: "from-indigo-500 to-indigo-600",
    steps: [
      { field: "existingBrandAssets", label: "Existing Brand Assets", type: "textarea", placeholder: "What brand materials do you currently have?", example: "e.g. 'Logo (vector file), brand colors (#1E3A5F, #4CAF50), letterhead, business cards, brochure template'", insight: "An inventory of existing assets saves time and money. We can build on what you have instead of starting from scratch." },
      { field: "brandGuidelines", label: "Brand Guidelines", type: "textarea", placeholder: "Do you have documented brand guidelines?", example: "e.g. 'Basic logo usage guide exists but no formal brand book. We use Montserrat for headings and Open Sans for body text.'" },
      { field: "contentPreferences", label: "Content Preferences & Restrictions", type: "textarea", placeholder: "Any preferences for content style or topics to avoid?", example: "e.g. 'Prefer educational tone over salesy. Avoid making specific health claims. Dr. Smith wants to be featured in content. Prefer video over blog posts.'" },
      { field: "socialMediaPresence", label: "Social Media Presence", type: "textarea", placeholder: "List your social media accounts and follower counts...", example: "e.g. 'Instagram @drsmith_wellness (2.4k followers), Facebook /SmithFunctionalMedicine (1.1k likes), LinkedIn (personal, 500 connections), YouTube (just started, 50 subscribers)'" },
      { field: "testimonials", label: "Testimonials & Success Stories", type: "textarea", placeholder: "Do you have customer testimonials or case studies?", example: "e.g. 'About 20 Google reviews (4.8 stars), 5 written testimonials, 2 video testimonials, several before/after stories with permission to share'" },
    ],
  },
];

const TOTAL_STEPS = SECTIONS.reduce((acc, s) => acc + s.steps.length, 0);
const LOCAL_STORAGE_KEY = "onboarding-intake-draft";

// ── Component ─────────────────────────────────

export function PublicOnboardingPage() {
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get("clientId");

  const [formData, setFormData] = useState<IntakeFormData>(defaultFormData);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentStepInSection, setCurrentStepInSection] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(clientIdParam);
  const formRef = useRef<HTMLDivElement>(null);

  // Verify client on mount
  useEffect(() => {
    if (!clientIdParam) return;
    fetch(`/api/public/onboarding/verify/${clientIdParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.found) {
          setClientName(data.companyName);
          setResolvedClientId(String(data.numericId));
        }
      })
      .catch(console.error);
  }, [clientIdParam]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && parsed.companyName) {
          setFormData({ ...defaultFormData, ...parsed });
          setShowResumeBanner(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-save to localStorage
  const saveToLocal = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
    } catch { /* ignore */ }
  }, [formData]);

  useEffect(() => {
    const timer = setTimeout(saveToLocal, 500);
    return () => clearTimeout(timer);
  }, [saveToLocal]);

  // Get current absolute step index
  const getAbsoluteStep = () => {
    let step = 0;
    for (let i = 0; i < currentSection; i++) step += SECTIONS[i].steps.length;
    return step + currentStepInSection;
  };

  const absoluteStep = getAbsoluteStep();
  const progress = Math.round(((absoluteStep + 1) / TOTAL_STEPS) * 100);
  const section = SECTIONS[currentSection];
  const step = section.steps[currentStepInSection];
  const SectionIcon = section.icon;

  const updateField = (field: keyof IntakeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canGoNext = () => {
    if (step.required && !formData[step.field].trim()) return false;
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) return;
    if (currentStepInSection < section.steps.length - 1) {
      setCurrentStepInSection(currentStepInSection + 1);
    } else if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
      setCurrentStepInSection(0);
    }
    formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    if (currentStepInSection > 0) {
      setCurrentStepInSection(currentStepInSection - 1);
    } else if (currentSection > 0) {
      const prevSection = SECTIONS[currentSection - 1];
      setCurrentSection(currentSection - 1);
      setCurrentStepInSection(prevSection.steps.length - 1);
    }
    formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isLastStep = currentSection === SECTIONS.length - 1 && currentStepInSection === section.steps.length - 1;

  const handleSubmit = async () => {
    // Validate required fields
    const missing: string[] = [];
    for (const sec of SECTIONS) {
      for (const s of sec.steps) {
        if (s.required && !formData[s.field].trim()) {
          missing.push(s.label);
        }
      }
    }
    if (missing.length > 0) {
      alert(`Please fill in the following required fields:\n\n${missing.join("\n")}`);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { intakeData: formData };
      if (resolvedClientId) body.clientId = resolvedClientId;

      const res = await fetch("/api/public/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Submission failed");
      }

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSubmitted(true);
    } catch (err) {
      alert(`Failed to submit: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step.type === "input" && !e.shiftKey) {
      e.preventDefault();
      if (isLastStep) handleSubmit();
      else goNext();
    }
  };

  const dismissResumeBanner = () => {
    setShowResumeBanner(false);
  };

  const startFresh = () => {
    setFormData(defaultFormData);
    setCurrentSection(0);
    setCurrentStepInSection(0);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setShowResumeBanner(false);
  };

  // ── Success screen ─────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Onboarding Complete!</h1>
          <p className="text-slate-300 text-lg">
            Thank you for taking the time to share your business details. Our team will review your responses and begin building your customized marketing strategy.
          </p>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-left space-y-3">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">What Happens Next</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">1.</span>
                Our team reviews your intake responses within 24 hours
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">2.</span>
                We create your Brand Story using the StoryBrand framework
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">3.</span>
                You'll receive a strategy call invitation to review everything together
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">4.</span>
                Marketing campaigns launch based on your approved strategy
              </li>
            </ul>
          </div>
          {clientName && (
            <p className="text-sm text-slate-400">Submitted for: <span className="text-white font-medium">{clientName}</span></p>
          )}
        </div>
      </div>
    );
  }

  // ── Section completed count for nav ────────────

  const getSectionCompletion = (sectionIndex: number) => {
    const sec = SECTIONS[sectionIndex];
    const filled = sec.steps.filter((s) => formData[s.field].trim()).length;
    return { filled, total: sec.steps.length };
  };

  // ── Main form ───────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Resume Banner */}
      {showResumeBanner && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium">Welcome back! We found your saved progress.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={dismissResumeBanner}>
                Continue
              </Button>
              <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={startFresh}>
                Start Fresh
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-white">Client Onboarding</h1>
              {clientName && <p className="text-sm text-slate-400">{clientName}</p>}
            </div>
            <span className="text-sm text-slate-400">
              Step {absoluteStep + 1} of {TOTAL_STEPS}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 flex gap-8">
        {/* Section Nav (sidebar on desktop) */}
        <nav className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-28 space-y-1">
            {SECTIONS.map((sec, i) => {
              const { filled, total } = getSectionCompletion(i);
              const Icon = sec.icon;
              const isActive = i === currentSection;
              const isComplete = filled === total && total > 0;
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentSection(i); setCurrentStepInSection(0); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-3 ${
                    isActive ? "bg-slate-700/50 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-blue-400" : isComplete ? "text-emerald-400" : ""}`} />
                  <span className="flex-1 truncate">{sec.title}</span>
                  <span className={`text-xs ${isComplete ? "text-emerald-400" : "text-slate-500"}`}>
                    {filled}/{total}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Form Content */}
        <div ref={formRef} className="flex-1 min-w-0">
          {/* Section Header */}
          <div className="mb-8">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${section.color} text-white text-sm font-medium mb-4`}>
              <SectionIcon className="h-4 w-4" />
              {section.title}
            </div>
            <p className="text-slate-400 text-sm">{section.description}</p>
            {/* Section step dots */}
            <div className="flex gap-1.5 mt-4">
              {section.steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStepInSection(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStepInSection ? "w-8 bg-blue-400" :
                    formData[section.steps[i].field].trim() ? "w-4 bg-emerald-400/60" : "w-4 bg-slate-600"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Current Step */}
          <div className="space-y-4" onKeyDown={handleKeyDown}>
            <Label className="text-white text-base font-medium">
              {step.label}
              {step.required && <span className="text-rose-400 ml-1">*</span>}
            </Label>

            {step.type === "textarea" ? (
              <Textarea
                value={formData[step.field]}
                onChange={(e) => updateField(step.field, e.target.value)}
                placeholder={step.placeholder}
                rows={5}
                className="bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                autoFocus
              />
            ) : (
              <Input
                value={formData[step.field]}
                onChange={(e) => updateField(step.field, e.target.value)}
                placeholder={step.placeholder}
                className="bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                autoFocus
              />
            )}

            {/* Example */}
            {step.example && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-400">{step.example}</p>
              </div>
            )}

            {/* Insight Card */}
            {step.insight && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-300">{step.insight}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={absoluteStep === 0}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            <div className="flex items-center gap-3">
              {/* Skip (for non-required fields) */}
              {!step.required && !isLastStep && (
                <Button
                  variant="ghost"
                  onClick={goNext}
                  className="text-slate-500 hover:text-slate-300"
                >
                  Skip
                </Button>
              )}

              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canGoNext()}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                >
                  {submitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" /> Submit Onboarding
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={goNext}
                  disabled={!canGoNext()}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Section quick nav (mobile) */}
          <div className="lg:hidden mt-8 pt-6 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Sections</p>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((sec, i) => {
                const { filled, total } = getSectionCompletion(i);
                return (
                  <button
                    key={i}
                    onClick={() => { setCurrentSection(i); setCurrentStepInSection(0); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      i === currentSection
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                        : filled === total && total > 0
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    {sec.title} ({filled}/{total})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
