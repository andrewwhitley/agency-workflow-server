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
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  Target,
  Megaphone,
  Palette,
  Heart,
  BookOpen,
  Globe,
  Send,
  Sparkles,
  Trophy,
  Save,
} from "lucide-react";

// ── Types ─────────────────────────────────────

interface IntakeData {
  // Client linking
  clientId: string;
  clientVerified: boolean;
  clientName: string;

  // Section 1: Your Business
  companyName: string;
  industry: string;
  companyWebsite: string;
  companyPhone: string;
  companyEmail: string;
  location: string;
  yearFounded: string;
  numberOfEmployees: string;
  foundingStory: string;
  businessGoals: string;
  biggestChallenges: string;
  whatSuccessLooksLike: string;
  teamMembers: string;

  // Section 2: Your Marketing
  primaryServices: string;
  mostProfitableService: string;
  mostRequestedService: string;
  averageServicePrice: string;
  serviceSeasonality: string;
  currentMarketingEfforts: string;
  adPlatforms: string;
  currentMarketingSpend: string;
  whatsWorking: string;
  whatsNotWorking: string;
  competitor1Name: string;
  competitor1Website: string;
  competitor1Strengths: string;
  competitor2Name: string;
  competitor2Website: string;
  competitor2Strengths: string;
  competitor3Name: string;
  competitor3Website: string;
  competitor3Strengths: string;

  // Section 3: Your Brand
  brandPersonality: string;
  brandTone: string;
  brandColors: string;
  brandFonts: string;
  designInspiration: string;
  dosAndDonts: string;
  logoDescription: string;
  visualStyle: string;

  // Section 4: Your Client's Journey (Brand Story)
  idealCustomerDescription: string;
  customerAge: string;
  customerGender: string;
  customerIncome: string;
  customerLocation: string;
  customerFrustrations: string;
  customerDesires: string;
  customerFeelsBefore: string;
  customerFeelsAfter: string;
  biggestFrustration: string;
  practicalProblem: string;
  emotionalProblem: string;
  whyItMatters: string;
  howYouHelp: string;
  whyTrustYou: string;
  threeStepProcess: string;
  directCTA: string;
  transitionalCTA: string;
  successStory: string;
  whatHappensIfTheyDontAct: string;
  guarantees: string;

  // Section 5: Content & Thought Leadership
  topQuestionsCustomersAsk: string;
  willingToDiscussPricing: string;
  willingToCompare: string;
  willingToAddressProblems: string;
  contentTopicsExcited: string;
  expertiseAreas: string;
  preferredContentFormats: string;
  testimonial1: string;
  testimonial1Author: string;
  testimonial2: string;
  testimonial2Author: string;
  testimonial3: string;
  testimonial3Author: string;
  reviewPlatformUrl: string;
  socialFacebook: string;
  socialInstagram: string;
  socialLinkedin: string;
  socialYoutube: string;
  socialTiktok: string;
  googleBusinessUrl: string;
  otherLinks: string;
  languagesSpoken: string;
}

const defaultData: IntakeData = {
  clientId: "", clientVerified: false as unknown as string, clientName: "",
  companyName: "", industry: "", companyWebsite: "", companyPhone: "", companyEmail: "",
  location: "", yearFounded: "", numberOfEmployees: "", foundingStory: "",
  businessGoals: "", biggestChallenges: "", whatSuccessLooksLike: "", teamMembers: "",
  primaryServices: "", mostProfitableService: "", mostRequestedService: "",
  averageServicePrice: "", serviceSeasonality: "", currentMarketingEfforts: "",
  adPlatforms: "", currentMarketingSpend: "", whatsWorking: "", whatsNotWorking: "",
  competitor1Name: "", competitor1Website: "", competitor1Strengths: "",
  competitor2Name: "", competitor2Website: "", competitor2Strengths: "",
  competitor3Name: "", competitor3Website: "", competitor3Strengths: "",
  brandPersonality: "", brandTone: "", brandColors: "", brandFonts: "",
  designInspiration: "", dosAndDonts: "", logoDescription: "", visualStyle: "",
  idealCustomerDescription: "", customerAge: "", customerGender: "",
  customerIncome: "", customerLocation: "", customerFrustrations: "",
  customerDesires: "", customerFeelsBefore: "", customerFeelsAfter: "",
  biggestFrustration: "", practicalProblem: "", emotionalProblem: "",
  whyItMatters: "", howYouHelp: "", whyTrustYou: "", threeStepProcess: "",
  directCTA: "", transitionalCTA: "", successStory: "",
  whatHappensIfTheyDontAct: "", guarantees: "",
  topQuestionsCustomersAsk: "", willingToDiscussPricing: "", willingToCompare: "",
  willingToAddressProblems: "", contentTopicsExcited: "", expertiseAreas: "",
  preferredContentFormats: "",
  testimonial1: "", testimonial1Author: "", testimonial2: "", testimonial2Author: "",
  testimonial3: "", testimonial3Author: "", reviewPlatformUrl: "",
  socialFacebook: "", socialInstagram: "", socialLinkedin: "",
  socialYoutube: "", socialTiktok: "", googleBusinessUrl: "", otherLinks: "",
  languagesSpoken: "",
} as unknown as IntakeData;

// ── Section Definitions ──────────────────────

interface Section {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}

const sections: Section[] = [
  { id: 0, title: "Welcome", subtitle: "Let's get started", icon: Sparkles, color: "from-amber-500 to-amber-600" },
  { id: 1, title: "Your Business", subtitle: "Company basics, goals, and team", icon: Building2, color: "from-blue-500 to-blue-600" },
  { id: 2, title: "Your Marketing", subtitle: "Services, platforms, and competitors", icon: Megaphone, color: "from-emerald-500 to-emerald-600" },
  { id: 3, title: "Your Brand", subtitle: "Visual identity and personality", icon: Palette, color: "from-pink-500 to-pink-600" },
  { id: 4, title: "Your Client's Journey", subtitle: "Understanding who you serve and how you help", icon: Users, color: "from-purple-500 to-purple-600" },
  { id: 5, title: "Content & Thought Leadership", subtitle: "Building trust through transparency", icon: BookOpen, color: "from-indigo-500 to-indigo-600" },
  { id: 6, title: "Review & Submit", subtitle: "Review your answers and submit", icon: Trophy, color: "from-green-500 to-green-600" },
];

const TOTAL_STEPS = sections.length;
const LOCAL_STORAGE_KEY = "onboarding-intake-v2";

// ── Helper Components ────────────────────────

function ExampleTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors">
        <Lightbulb className="h-3.5 w-3.5" /><span>See example</span>
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-80 max-w-[90vw] p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 shadow-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-medium text-xs text-amber-700 mb-1">Example</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="absolute top-1 right-2 text-amber-400 hover:text-amber-600 text-xs">✕</button>
        </div>
      )}
    </div>
  );
}

function InsightCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ElementType }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 text-left">
        <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-blue-400" />
        </div>
        <p className="text-sm font-semibold text-blue-300 flex-1">{title}</p>
        {expanded ? <ChevronUp className="h-4 w-4 text-blue-400" /> : <ChevronDown className="h-4 w-4 text-blue-400" />}
      </button>
      {expanded && <div className="mt-3 pl-11 text-sm text-blue-200/80 leading-relaxed">{children}</div>}
    </div>
  );
}

function Field({ label, description, example, required, children }: {
  label: string; description?: string; example?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium text-slate-200">
          {label}{required && <span className="text-rose-400 ml-1">*</span>}
        </Label>
        {example && <ExampleTip text={example} />}
      </div>
      {description && <p className="text-xs text-slate-400">{description}</p>}
      {children}
    </div>
  );
}

const inputCls = "bg-slate-700/50 border-slate-400/60 text-white placeholder-slate-400 focus:border-blue-400 focus:ring-blue-400/30";
const textareaCls = inputCls + " resize-none";

// ── Main Component ───────────────────────────

export function PublicOnboardingPage() {
  const [searchParams] = useSearchParams();
  const clientIdParam = searchParams.get("clientId");

  const [data, setData] = useState<IntakeData>(defaultData);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [verifiedNumericId, setVerifiedNumericId] = useState<number | null>(null);
  const initialized = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const upd = (field: string, value: string | boolean) => setData((prev) => ({ ...prev, [field]: value }));

  // On mount: check for saved data or URL clientId
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const savedStep = localStorage.getItem(LOCAL_STORAGE_KEY + "-step");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Object.values(parsed).some((v) => v && v !== "" && v !== false)) {
          setData({ ...defaultData, ...parsed });
          if (savedStep) setStep(parseInt(savedStep) || 0);
          setShowResume(true);
        }
      }
    } catch { /* ignore */ }
    if (clientIdParam) upd("clientId", clientIdParam);
  }, [clientIdParam]);

  // Auto-save
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(LOCAL_STORAGE_KEY + "-step", String(step));
    } catch { /* ignore */ }
  }, [data, step]);

  const progress = Math.round((step / (TOTAL_STEPS - 1)) * 100);
  const currentSection = sections[step];
  const SectionIcon = currentSection.icon;

  const handleVerifyClient = async () => {
    if (!data.clientId) return;
    setVerifying(true);
    try {
      const res = await fetch(`/api/public/onboarding/verify/${data.clientId}`);
      const result = await res.json();
      if (result.found) {
        upd("clientVerified", true);
        upd("clientName", result.companyName || "");
        if (result.companyName && !data.companyName) upd("companyName", result.companyName);
        setVerifiedNumericId(result.numericId);
      } else {
        alert("Client ID not found. Please check and try again, or leave blank to create a new client.");
      }
    } catch { alert("Error verifying client ID"); }
    setVerifying(false);
  };

  const goNext = () => { if (step < TOTAL_STEPS - 1) { setStep(step + 1); contentRef.current?.scrollTo({ top: 0 }); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const goBack = () => { if (step > 0) { setStep(step - 1); contentRef.current?.scrollTo({ top: 0 }); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  const canGoNext = () => {
    if (step === 0) return true;
    if (step === 1) return data.companyName.trim() !== "";
    return true;
  };

  const isSectionComplete = (id: number): boolean => {
    switch (id) {
      case 1: return !!(data.companyName && data.businessGoals);
      case 2: return !!(data.primaryServices);
      case 3: return !!(data.brandTone || data.brandPersonality);
      case 4: return !!(data.idealCustomerDescription && data.biggestFrustration);
      case 5: return !!(data.topQuestionsCustomersAsk || data.contentTopicsExcited);
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const numericId = verifiedNumericId || (data.clientId ? parseInt(data.clientId) : NaN);
      const body: Record<string, unknown> = { intakeData: data };
      if (!isNaN(numericId)) body.clientId = numericId;
      else if (data.clientId) body.clientSlug = data.clientId;

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
      localStorage.removeItem(LOCAL_STORAGE_KEY + "-step");
      setSubmitted(true);
    } catch (err) {
      alert(`Failed to submit: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setSubmitting(false);
  };

  // ── Submitted Success ───────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Intake Complete!</h1>
          <p className="text-slate-300 text-lg">Thank you for taking the time to share your story. Our team will review your information and begin crafting your Brand Story Guide.</p>
          <div className="bg-slate-900/60 border border-slate-600 rounded-xl p-6 text-left space-y-3">
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">What Happens Next</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">1.</span>Our team reviews your intake and generates your Brand Story Guide</li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">2.</span>We create your comprehensive brand messaging and content strategy</li>
              <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">3.</span>You'll receive your complete Brand Story Guide for review and approval</li>
            </ul>
          </div>
          {data.clientName && <p className="text-sm text-slate-400">Submitted for: <span className="text-white font-medium">{data.clientName}</span></p>}
        </div>
      </div>
    );
  }

  // ── Step Renderers ──────────────────────────

  const renderWelcome = () => (
    <div className="space-y-6">
      <InsightCard title="Why We Ask These Questions" icon={Heart}>
        <p>The best marketing starts with a deep understanding of your business, your clients, and your story. This intake helps us build a complete picture so we can create messaging that truly resonates.</p>
        <p className="mt-2">There are <strong>5 sections</strong>, and you can save your progress and come back anytime. Most people complete it in 20–30 minutes.</p>
      </InsightCard>
      <div className="bg-slate-900/60 border border-slate-600 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-white">Have an existing Client ID?</h3>
        <p className="text-sm text-slate-400">If you've already been set up in our system, enter your Client ID below. Otherwise, leave it blank and we'll create a new profile.</p>
        <div className="flex gap-3">
          <Input placeholder="Enter Client ID (optional)" value={data.clientId} onChange={(e) => upd("clientId", e.target.value)} className={inputCls + " max-w-xs"} />
          <Button variant="outline" onClick={handleVerifyClient} disabled={!data.clientId || verifying} className="border-slate-600 text-slate-200 hover:bg-slate-700">
            {verifying ? "Checking..." : "Verify"}
          </Button>
        </div>
        {data.clientVerified && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <Check className="h-4 w-4" /><span>Connected to: <strong>{data.clientName}</strong></span>
          </div>
        )}
      </div>
      <div className="bg-slate-900/60 border border-slate-600 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-white">What We'll Cover</h3>
        <div className="space-y-2">
          {sections.filter((s) => s.id >= 1 && s.id <= 5).map((s) => {
            const Icon = s.icon;
            const complete = isSectionComplete(s.id);
            return (
              <div key={s.id} className="flex items-center gap-3 text-sm">
                <div className={`h-8 w-8 rounded-lg ${complete ? "bg-emerald-500/20" : "bg-slate-700"} flex items-center justify-center shrink-0`}>
                  {complete ? <Check className="h-4 w-4 text-emerald-400" /> : <Icon className="h-4 w-4 text-slate-400" />}
                </div>
                <div>
                  <p className={`font-medium ${complete ? "text-emerald-300" : "text-white"}`}>Section {s.id}: {s.title}</p>
                  <p className="text-xs text-slate-400">{s.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSection1 = () => (
    <div className="space-y-6">
      <InsightCard title="Why This Matters" icon={Building2}>
        <p>Before we can tell your story, we need to know the basics. This is the foundation everything else builds on.</p>
      </InsightCard>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Company Name" required example="Soleil Holistic Wellness"><Input value={data.companyName} onChange={(e) => upd("companyName", e.target.value)} className={inputCls} placeholder="Your company name" /></Field>
        <Field label="Industry" example="Wellness, Dental, HVAC, Legal"><Input value={data.industry} onChange={(e) => upd("industry", e.target.value)} className={inputCls} placeholder="What industry?" /></Field>
        <Field label="Website"><Input value={data.companyWebsite} onChange={(e) => upd("companyWebsite", e.target.value)} className={inputCls} placeholder="www.yoursite.com" /></Field>
        <Field label="Phone"><Input value={data.companyPhone} onChange={(e) => upd("companyPhone", e.target.value)} className={inputCls} placeholder="(555) 123-4567" /></Field>
        <Field label="Email"><Input value={data.companyEmail} onChange={(e) => upd("companyEmail", e.target.value)} className={inputCls} placeholder="info@example.com" /></Field>
        <Field label="Location" example="Milford, CT"><Input value={data.location} onChange={(e) => upd("location", e.target.value)} className={inputCls} placeholder="City, State" /></Field>
        <Field label="Year Founded"><Input value={data.yearFounded} onChange={(e) => upd("yearFounded", e.target.value)} className={inputCls} placeholder="2018" /></Field>
        <Field label="Employees"><Input value={data.numberOfEmployees} onChange={(e) => upd("numberOfEmployees", e.target.value)} className={inputCls} placeholder="12" /></Field>
      </div>
      <Field label="Your founding story" description="How did this business come to be?" example="Dr. Sarah started Soleil after seeing too many patients fall through the cracks of conventional medicine.">
        <Textarea value={data.foundingStory} onChange={(e) => upd("foundingStory", e.target.value)} className={textareaCls} rows={4} placeholder="Tell us how it all started..." />
      </Field>
      <Field label="Business goals for the next 12 months" required example="Increase new appointments by 40%. Launch aesthetics. Grow from $50K to $75K/month.">
        <Textarea value={data.businessGoals} onChange={(e) => upd("businessGoals", e.target.value)} className={textareaCls} rows={4} placeholder="Where do you want to be in a year?" />
      </Field>
      <Field label="Biggest challenges right now" example="Not enough new clients. Website doesn't convert. Rely too much on word-of-mouth.">
        <Textarea value={data.biggestChallenges} onChange={(e) => upd("biggestChallenges", e.target.value)} className={textareaCls} rows={3} placeholder="What's holding your business back?" />
      </Field>
      <Field label="What does success look like?" example="Fully booked 3 weeks out. Steady stream of new clients from online marketing.">
        <Textarea value={data.whatSuccessLooksLike} onChange={(e) => upd("whatSuccessLooksLike", e.target.value)} className={textareaCls} rows={3} placeholder="Describe your ideal future" />
      </Field>
      <Field label="Key team members" example="Dr. Sarah Chen — Founder, ND, 15 years\nJen — Office Manager">
        <Textarea value={data.teamMembers} onChange={(e) => upd("teamMembers", e.target.value)} className={textareaCls} rows={3} placeholder="Names, roles, credentials" />
      </Field>
      <Field label="Languages spoken"><Input value={data.languagesSpoken} onChange={(e) => upd("languagesSpoken", e.target.value)} className={inputCls} placeholder="English, Spanish" /></Field>
    </div>
  );

  const renderSection2 = () => (
    <div className="space-y-6">
      <InsightCard title="What You Offer & How You Market" icon={Megaphone}>
        <p>Your services are the core of your business. The more detail you give us, the better we can create targeted marketing for each service line.</p>
      </InsightCard>
      <Field label="Primary services or products" required example="Naturopathic Medicine, Acupuncture, IV Therapy, RF Microneedling, Bioidentical Hormones">
        <Textarea value={data.primaryServices} onChange={(e) => upd("primaryServices", e.target.value)} className={textareaCls} rows={4} placeholder="List your services" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Most profitable service" example="Aesthetics (RF Microneedling, PRP)"><Input value={data.mostProfitableService} onChange={(e) => upd("mostProfitableService", e.target.value)} className={inputCls} placeholder="Highest-revenue service" /></Field>
        <Field label="Most requested service" example="Naturopathic consultations"><Input value={data.mostRequestedService} onChange={(e) => upd("mostRequestedService", e.target.value)} className={inputCls} placeholder="Most popular service" /></Field>
        <Field label="Average service price" example="$150-$500 per visit"><Input value={data.averageServicePrice} onChange={(e) => upd("averageServicePrice", e.target.value)} className={inputCls} placeholder="Price range" /></Field>
        <Field label="Seasonality" example="Aesthetics peak before summer. IV therapy during flu season."><Input value={data.serviceSeasonality} onChange={(e) => upd("serviceSeasonality", e.target.value)} className={inputCls} placeholder="Seasonal patterns?" /></Field>
      </div>
      <Field label="Current marketing efforts" example="Facebook/Instagram ads ($2K/month). Social media 3x/week. Google Business active.">
        <Textarea value={data.currentMarketingEfforts} onChange={(e) => upd("currentMarketingEfforts", e.target.value)} className={textareaCls} rows={3} placeholder="What marketing are you doing?" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Ad platforms"><Input value={data.adPlatforms} onChange={(e) => upd("adPlatforms", e.target.value)} className={inputCls} placeholder="Meta, Google Ads, TikTok" /></Field>
        <Field label="Monthly marketing spend"><Input value={data.currentMarketingSpend} onChange={(e) => upd("currentMarketingSpend", e.target.value)} className={inputCls} placeholder="$2,000/month" /></Field>
      </div>
      <Field label="What's working well?" example="Google Business generates the most calls. Facebook ads for aesthetics get good engagement.">
        <Textarea value={data.whatsWorking} onChange={(e) => upd("whatsWorking", e.target.value)} className={textareaCls} rows={3} placeholder="What's generating results?" />
      </Field>
      <Field label="What's NOT working?" example="Website doesn't convert. Instagram gets likes but no bookings.">
        <Textarea value={data.whatsNotWorking} onChange={(e) => upd("whatsNotWorking", e.target.value)} className={textareaCls} rows={3} placeholder="What hasn't delivered?" />
      </Field>
      <h4 className="text-sm font-medium text-slate-300 pt-2">Competitors</h4>
      {[1, 2, 3].map((n) => (
        <div key={n} className="bg-slate-900/80 border border-slate-600/50 rounded-lg p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium">Competitor {n} {n === 3 ? "(Optional)" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input value={(data as Record<string, string>)[`competitor${n}Name`]} onChange={(e) => upd(`competitor${n}Name`, e.target.value)} className={inputCls} placeholder="Name" />
            <Input value={(data as Record<string, string>)[`competitor${n}Website`]} onChange={(e) => upd(`competitor${n}Website`, e.target.value)} className={inputCls} placeholder="Website" />
          </div>
          <Textarea value={(data as Record<string, string>)[`competitor${n}Strengths`]} onChange={(e) => upd(`competitor${n}Strengths`, e.target.value)} className={textareaCls} rows={2} placeholder="Strengths and weaknesses" />
        </div>
      ))}
    </div>
  );

  const renderSection3 = () => (
    <div className="space-y-6">
      <InsightCard title="Your Visual Identity" icon={Palette}>
        <p>Your brand is more than a logo — it's how people <em>feel</em> when they interact with your business. This helps us understand your style and personality.</p>
      </InsightCard>
      <Field label="Brand tone of voice" description="If your brand were a person, how would they talk?" example="Lighthearted and fun, but knowledgeable. Like 'your smartest friend who also happens to be a doctor.'">
        <Textarea value={data.brandTone} onChange={(e) => upd("brandTone", e.target.value)} className={textareaCls} rows={3} placeholder="Describe your ideal tone" />
      </Field>
      <Field label="Brand personality traits" description="3-5 words that define your brand." example="Warm, Knowledgeable, Holistic, Empowering, Approachable">
        <Input value={data.brandPersonality} onChange={(e) => upd("brandPersonality", e.target.value)} className={inputCls} placeholder="e.g., Professional, Friendly, Bold, Caring" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Brand Colors" example="#0d500f (forest green), #ffd871 (gold)"><Input value={data.brandColors} onChange={(e) => upd("brandColors", e.target.value)} className={inputCls} placeholder="Hex codes or color names" /></Field>
        <Field label="Fonts" example="Montserrat headings, Open Sans body"><Input value={data.brandFonts} onChange={(e) => upd("brandFonts", e.target.value)} className={inputCls} placeholder="Font preferences" /></Field>
      </div>
      <Field label="Describe your logo" example="A sun with a leaf inside — represents holistic wellness and natural healing.">
        <Textarea value={data.logoDescription} onChange={(e) => upd("logoDescription", e.target.value)} className={textareaCls} rows={2} placeholder="What does it look like?" />
      </Field>
      <Field label="Visual style" example="Clean and modern with lots of white space. Natural imagery — plants, sunlight. Warm tones.">
        <Textarea value={data.visualStyle} onChange={(e) => upd("visualStyle", e.target.value)} className={textareaCls} rows={3} placeholder="What visual feel do you want?" />
      </Field>
      <Field label="Design inspiration" description="URLs of websites or brands you admire.">
        <Textarea value={data.designInspiration} onChange={(e) => upd("designInspiration", e.target.value)} className={textareaCls} rows={2} placeholder="Links to websites you admire" />
      </Field>
      <Field label="Content do's and don'ts" example="DO: Emphasize holistic care. Use inclusive language.\nDON'T: Make guarantees. Use overly clinical language.">
        <Textarea value={data.dosAndDonts} onChange={(e) => upd("dosAndDonts", e.target.value)} className={textareaCls} rows={3} placeholder="What should we always do or never do?" />
      </Field>
    </div>
  );

  const renderSection4 = () => (
    <div className="space-y-6">
      <InsightCard title="Your Client's Journey — Brand Story" icon={Users}>
        <p>Great marketing starts with understanding the person you're trying to reach. Think about your <strong>best</strong> clients — the ones you wish you had 100 more of. Then we'll map out the problem you solve, how you guide them, and the transformation you deliver.</p>
      </InsightCard>
      <Field label="Describe your ideal client" required description="Paint a picture of the person who is the perfect fit." example="A health-conscious woman in her 30s-50s living in Southern CT. She's educated, earns $75K+, and wants something more holistic.">
        <Textarea value={data.idealCustomerDescription} onChange={(e) => upd("idealCustomerDescription", e.target.value)} className={textareaCls} rows={4} placeholder="Who is your perfect client?" />
      </Field>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Age Range"><Input value={data.customerAge} onChange={(e) => upd("customerAge", e.target.value)} className={inputCls} placeholder="30-65" /></Field>
        <Field label="Gender"><Input value={data.customerGender} onChange={(e) => upd("customerGender", e.target.value)} className={inputCls} placeholder="75% female" /></Field>
        <Field label="Income"><Input value={data.customerIncome} onChange={(e) => upd("customerIncome", e.target.value)} className={inputCls} placeholder="$75K+" /></Field>
        <Field label="Location"><Input value={data.customerLocation} onChange={(e) => upd("customerLocation", e.target.value)} className={inputCls} placeholder="Southern CT" /></Field>
      </div>
      <Field label="What do they ultimately want?" example="They want to feel vibrant, energetic, and confident. They want a healthcare partner who listens.">
        <Textarea value={data.customerDesires} onChange={(e) => upd("customerDesires", e.target.value)} className={textareaCls} rows={3} placeholder="The bigger transformation they're seeking" />
      </Field>
      <Field label="Biggest frustration before finding you" required example="Conventional medicine that only treats symptoms. A healthcare system that makes people feel like a number.">
        <Textarea value={data.biggestFrustration} onChange={(e) => upd("biggestFrustration", e.target.value)} className={textareaCls} rows={3} placeholder="The root cause of their frustration" />
      </Field>
      <Field label="Practical, day-to-day problem" example="They can't find a doctor who takes a whole-person approach. Chronic symptoms that won't go away.">
        <Textarea value={data.practicalProblem} onChange={(e) => upd("practicalProblem", e.target.value)} className={textareaCls} rows={3} placeholder="The tangible issue that makes them search" />
      </Field>
      <Field label="How does this problem make them feel?" example="Frustrated, unheard, exhausted, skeptical that anything will work.">
        <Textarea value={data.emotionalProblem} onChange={(e) => upd("emotionalProblem", e.target.value)} className={textareaCls} rows={2} placeholder="The emotional weight behind the practical problem" />
      </Field>
      <Field label="Why does this matter on a deeper level?" example="Everyone deserves healthcare that treats the whole person, not just symptoms.">
        <Textarea value={data.whyItMatters} onChange={(e) => upd("whyItMatters", e.target.value)} className={textareaCls} rows={2} placeholder="The deeper principle at stake" />
      </Field>
      <Field label="How do you help?" example="We help health-conscious people who are frustrated with conventional medicine find natural, whole-person solutions.">
        <Textarea value={data.howYouHelp} onChange={(e) => upd("howYouHelp", e.target.value)} className={textareaCls} rows={3} placeholder="How do you explain what you do?" />
      </Field>
      <Field label="Why should someone trust you?" example="30+ combined years. Board-certified. 4.9-star Google rating with 200+ reviews.">
        <Textarea value={data.whyTrustYou} onChange={(e) => upd("whyTrustYou", e.target.value)} className={textareaCls} rows={3} placeholder="Credentials, experience, proof" />
      </Field>
      <Field label="3 simple steps to work with you" example="Step 1: Book a free consultation\nStep 2: Get your personalized plan\nStep 3: Start feeling better">
        <Textarea value={data.threeStepProcess} onChange={(e) => upd("threeStepProcess", e.target.value)} className={textareaCls} rows={3} placeholder="Step 1: ...\nStep 2: ...\nStep 3: ..." />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Main call to action" example="Book Your Free Consultation"><Input value={data.directCTA} onChange={(e) => upd("directCTA", e.target.value)} className={inputCls} placeholder="Book Now, Get Started" /></Field>
        <Field label="Softer first step" example="Download Our Free Guide"><Input value={data.transitionalCTA} onChange={(e) => upd("transitionalCTA", e.target.value)} className={inputCls} placeholder="For people not ready to commit" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="How clients feel BEFORE" example="Frustrated, confused, exhausted, stuck"><Textarea value={data.customerFeelsBefore} onChange={(e) => upd("customerFeelsBefore", e.target.value)} className={textareaCls} rows={2} placeholder="Emotions before" /></Field>
        <Field label="How clients feel AFTER" example="Empowered, energetic, confident, in control"><Textarea value={data.customerFeelsAfter} onChange={(e) => upd("customerFeelsAfter", e.target.value)} className={textareaCls} rows={2} placeholder="Emotions after" /></Field>
      </div>
      <Field label="Your best client success story" example="Sarah came to us exhausted, dealing with chronic fatigue for 3 years. After 3 months, her energy was back.">
        <Textarea value={data.successStory} onChange={(e) => upd("successStory", e.target.value)} className={textareaCls} rows={4} placeholder="Share a real transformation..." />
      </Field>
      <Field label="What happens if they DON'T take action?" example="They continue feeling exhausted. Symptoms get worse. They keep spending on treatments that don't work.">
        <Textarea value={data.whatHappensIfTheyDontAct} onChange={(e) => upd("whatHappensIfTheyDontAct", e.target.value)} className={textareaCls} rows={3} placeholder="What's at stake if they do nothing?" />
      </Field>
      <Field label="Guarantees or risk-reducers" example="Free initial consultation. Satisfaction guarantee. We'll always explain options first. No pressure, ever.">
        <Textarea value={data.guarantees} onChange={(e) => upd("guarantees", e.target.value)} className={textareaCls} rows={2} placeholder="What makes it easy to say yes?" />
      </Field>
    </div>
  );

  const renderSection5 = () => (
    <div className="space-y-6">
      <InsightCard title="Building Trust Through Transparency" icon={BookOpen}>
        <p>The businesses that win online are willing to answer every question honestly — even uncomfortable ones. When you address what everyone's thinking but nobody's saying, you become the most trusted voice in your industry.</p>
      </InsightCard>
      <Field label="Top questions your clients ask" required example="How much does a consultation cost? Is it covered by insurance? How long before I see results?">
        <Textarea value={data.topQuestionsCustomersAsk} onChange={(e) => upd("topQuestionsCustomersAsk", e.target.value)} className={textareaCls} rows={4} placeholder="Questions you hear most often" />
      </Field>
      <Field label="Comfortable discussing pricing openly?" example="Yes — we're happy to share ranges and explain what affects cost. We believe in transparency.">
        <Textarea value={data.willingToDiscussPricing} onChange={(e) => upd("willingToDiscussPricing", e.target.value)} className={textareaCls} rows={2} placeholder="How open are you about pricing?" />
      </Field>
      <Field label="Comfortable comparing yourself to alternatives?" example="Yes, we're confident in what we offer and happy to explain how we're different.">
        <Textarea value={data.willingToCompare} onChange={(e) => upd("willingToCompare", e.target.value)} className={textareaCls} rows={2} placeholder="How comfortable with honest comparisons?" />
      </Field>
      <Field label="Willing to address industry problems honestly?" example="Absolutely. We're honest that naturopathic medicine isn't a quick fix — it takes commitment.">
        <Textarea value={data.willingToAddressProblems} onChange={(e) => upd("willingToAddressProblems", e.target.value)} className={textareaCls} rows={2} placeholder="How honest about industry issues?" />
      </Field>
      <Field label="Topics you're excited to create content about" example="Patient education videos. Blog posts about natural remedies. Q&A content.">
        <Textarea value={data.contentTopicsExcited} onChange={(e) => upd("contentTopicsExcited", e.target.value)} className={textareaCls} rows={3} placeholder="What content are you excited to create?" />
      </Field>
      <Field label="Your areas of expertise" example="Naturopathic approaches to chronic fatigue. The connection between gut health and skin health.">
        <Textarea value={data.expertiseAreas} onChange={(e) => upd("expertiseAreas", e.target.value)} className={textareaCls} rows={2} placeholder="What are you the expert on?" />
      </Field>
      <Field label="Preferred content formats" example="Short videos for social. Written blog posts. Instagram stories for behind-the-scenes.">
        <Textarea value={data.preferredContentFormats} onChange={(e) => upd("preferredContentFormats", e.target.value)} className={textareaCls} rows={2} placeholder="Video, blog, social, podcast?" />
      </Field>
      <h4 className="text-sm font-medium text-slate-300 pt-2">Testimonials</h4>
      {[1, 2, 3].map((n) => (
        <div key={n} className="bg-slate-900/80 border border-slate-600/50 rounded-lg p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium">Testimonial {n} {n === 3 ? "(Optional)" : ""}</p>
          <Textarea value={(data as Record<string, string>)[`testimonial${n}`]} onChange={(e) => upd(`testimonial${n}`, e.target.value)} className={textareaCls} rows={2} placeholder="What did they say?" />
          <Input value={(data as Record<string, string>)[`testimonial${n}Author`]} onChange={(e) => upd(`testimonial${n}Author`, e.target.value)} className={inputCls} placeholder="Who said it? (e.g. Jennifer M., Milford CT)" />
        </div>
      ))}
      <Field label="Link to your reviews"><Input value={data.reviewPlatformUrl} onChange={(e) => upd("reviewPlatformUrl", e.target.value)} className={inputCls} placeholder="Google Business, Yelp URL" /></Field>
      <h4 className="text-sm font-medium text-slate-300 pt-2">Online Presence</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Facebook"><Input value={data.socialFacebook} onChange={(e) => upd("socialFacebook", e.target.value)} className={inputCls} placeholder="facebook.com/..." /></Field>
        <Field label="Instagram"><Input value={data.socialInstagram} onChange={(e) => upd("socialInstagram", e.target.value)} className={inputCls} placeholder="instagram.com/..." /></Field>
        <Field label="LinkedIn"><Input value={data.socialLinkedin} onChange={(e) => upd("socialLinkedin", e.target.value)} className={inputCls} placeholder="linkedin.com/..." /></Field>
        <Field label="YouTube"><Input value={data.socialYoutube} onChange={(e) => upd("socialYoutube", e.target.value)} className={inputCls} placeholder="youtube.com/..." /></Field>
        <Field label="TikTok"><Input value={data.socialTiktok} onChange={(e) => upd("socialTiktok", e.target.value)} className={inputCls} placeholder="tiktok.com/@..." /></Field>
        <Field label="Google Business"><Input value={data.googleBusinessUrl} onChange={(e) => upd("googleBusinessUrl", e.target.value)} className={inputCls} placeholder="Google Business URL" /></Field>
      </div>
      <Field label="Other links" example="Yelp, Pinterest, directories"><Textarea value={data.otherLinks} onChange={(e) => upd("otherLinks", e.target.value)} className={textareaCls} rows={2} placeholder="One per line" /></Field>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <InsightCard title="Almost Done!" icon={Trophy}>
        <p>Review your answers below. You can go back to any section to make changes. When ready, hit Submit.</p>
      </InsightCard>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {sections.filter((s) => s.id >= 1 && s.id <= 5).map((s) => {
          const complete = isSectionComplete(s.id);
          return (
            <button key={s.id} onClick={() => setStep(s.id)}
              className={`text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 ${complete ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
              {complete ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-amber-400 inline-block" />}
              {s.title}
            </button>
          );
        })}
      </div>
      {[
        { label: "Your Business", fields: [["Company", data.companyName], ["Industry", data.industry], ["Location", data.location], ["Goals", data.businessGoals]] },
        { label: "Your Marketing", fields: [["Services", data.primaryServices], ["Spend", data.currentMarketingSpend], ["What's Working", data.whatsWorking]] },
        { label: "Your Brand", fields: [["Tone", data.brandTone], ["Personality", data.brandPersonality], ["Colors", data.brandColors]] },
        { label: "Client Journey", fields: [["Ideal Client", data.idealCustomerDescription], ["Frustration", data.biggestFrustration], ["How You Help", data.howYouHelp], ["Success Story", data.successStory ? "Provided" : ""]] },
        { label: "Content", fields: [["Top Questions", data.topQuestionsCustomersAsk], ["Topics", data.contentTopicsExcited], ["Testimonials", data.testimonial1 ? "Provided" : ""]] },
      ].map((sec) => (
        <div key={sec.label} className="bg-slate-900/80 border border-slate-600/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-2">{sec.label}</h4>
          <div className="space-y-1">
            {sec.fields.map(([label, value]) => (
              <div key={label} className="flex gap-2 text-sm">
                <span className="text-slate-400 w-32 shrink-0">{label}:</span>
                <span className={value ? "text-slate-300" : "text-slate-500 italic"}>{value ? (value.length > 80 ? value.slice(0, 80) + "..." : value) : "Not provided"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-4">
        <Trophy className="h-10 w-10 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-semibold text-white">Ready to Submit?</h3>
        <p className="text-sm text-slate-400">Once submitted, our team will review your intake and generate your Brand Story Guide.</p>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8">
          {submitting ? "Submitting..." : <><Send className="h-4 w-4 mr-2" />Submit Intake</>}
        </Button>
      </div>
    </div>
  );

  const stepRenderers = [renderWelcome, renderSection1, renderSection2, renderSection3, renderSection4, renderSection5, renderReview];

  // ── Render ──────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {showResume && step > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium">Welcome back! We restored your progress — you left off at <strong>{currentSection.title}</strong>.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setShowResume(false)}>Continue</Button>
              <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => { setData(defaultData); setStep(0); localStorage.removeItem(LOCAL_STORAGE_KEY); setShowResume(false); if (clientIdParam) upd("clientId", clientIdParam); }}>Start Fresh</Button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-slate-600/50 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-white">Client Onboarding</h1>
              {data.clientName && <p className="text-sm text-slate-400">{data.clientName}</p>}
            </div>
            <span className="text-sm text-slate-400">Step {step + 1} of {TOTAL_STEPS}</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {/* Section pills */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const complete = s.id >= 1 && s.id <= 5 && isSectionComplete(s.id);
              return (
                <button key={s.id} onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                    isActive ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" :
                    complete ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    "text-slate-400 border border-slate-600 hover:border-slate-500"
                  }`}>
                  {complete ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8" ref={contentRef}>
        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${currentSection.color} text-white text-sm font-medium mb-3`}>
            <SectionIcon className="h-4 w-4" />{currentSection.title}
          </div>
          <p className="text-slate-400 text-sm">{currentSection.subtitle}</p>
        </div>

        <div className="mb-8">{stepRenderers[step]()}</div>

        {step < TOTAL_STEPS - 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-600/50">
            <Button variant="ghost" onClick={goBack} disabled={step === 0} className="text-slate-400 hover:text-white">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={goNext} disabled={!canGoNext()} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
              {step === 0 ? "Get Started" : "Continue"} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
