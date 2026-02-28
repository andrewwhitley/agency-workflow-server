/**
 * Functional medicine reference ranges and marker data.
 * These ranges represent optimal values from a functional medicine perspective,
 * which differ from conventional "normal" ranges based on population averages.
 */

export interface MarkerReference {
  name: string;
  unit: string;
  category: string;
  conventionalLow: number;
  conventionalHigh: number;
  optimalLow: number;
  optimalHigh: number;
  description: string;
}

export const BODY_SYSTEMS = [
  "Digestive", "Neurological", "Musculoskeletal", "Cardiovascular",
  "Respiratory", "Endocrine", "Immune", "Dermatological",
  "Urological", "Reproductive", "Mental/Emotional", "Sleep", "Energy", "Other",
] as const;

export const PROTOCOL_CATEGORIES = [
  "supplement", "diet", "lifestyle", "treatment",
  "detox", "exercise", "stress-management", "sleep", "other",
] as const;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "beverage"] as const;

export const DIET_TAGS = [
  "gluten-free", "dairy-free", "sugar-free", "organic", "grass-fed",
  "wild-caught", "fermented", "whole-food", "processed", "aip",
  "paleo", "keto", "vegan", "vegetarian", "elimination",
  "anti-inflammatory", "high-protein", "low-carb", "low-fodmap",
] as const;

export const FUNCTIONAL_RANGES: Record<string, MarkerReference> = {
  // ── Thyroid ──────────────────────────────
  "TSH": {
    name: "TSH", unit: "mIU/L", category: "Thyroid",
    conventionalLow: 0.5, conventionalHigh: 4.5, optimalLow: 1.0, optimalHigh: 2.0,
    description: "Thyroid stimulating hormone — reflects pituitary-thyroid feedback",
  },
  "Free T3": {
    name: "Free T3", unit: "pg/mL", category: "Thyroid",
    conventionalLow: 2.0, conventionalHigh: 4.4, optimalLow: 3.0, optimalHigh: 4.0,
    description: "Active thyroid hormone — primary driver of metabolic rate",
  },
  "Free T4": {
    name: "Free T4", unit: "ng/dL", category: "Thyroid",
    conventionalLow: 0.8, conventionalHigh: 1.8, optimalLow: 1.0, optimalHigh: 1.5,
    description: "Inactive thyroid hormone — converted to T3 in tissues",
  },
  "Reverse T3": {
    name: "Reverse T3", unit: "ng/dL", category: "Thyroid",
    conventionalLow: 9.2, conventionalHigh: 24.1, optimalLow: 9.2, optimalHigh: 15.0,
    description: "Inactive T3 — elevated in stress, illness, or inflammation",
  },
  "TPO Antibodies": {
    name: "TPO Antibodies", unit: "IU/mL", category: "Thyroid",
    conventionalLow: 0, conventionalHigh: 34, optimalLow: 0, optimalHigh: 15,
    description: "Thyroid peroxidase antibodies — marker for autoimmune thyroid",
  },
  "Thyroglobulin Antibodies": {
    name: "Thyroglobulin Antibodies", unit: "IU/mL", category: "Thyroid",
    conventionalLow: 0, conventionalHigh: 40, optimalLow: 0, optimalHigh: 10,
    description: "TgAb — another autoimmune thyroid marker",
  },
  // ── Metabolic ────────────────────────────
  "Fasting Glucose": {
    name: "Fasting Glucose", unit: "mg/dL", category: "Metabolic",
    conventionalLow: 65, conventionalHigh: 99, optimalLow: 75, optimalHigh: 86,
    description: "Blood sugar after overnight fast — core metabolic marker",
  },
  "Fasting Insulin": {
    name: "Fasting Insulin", unit: "uIU/mL", category: "Metabolic",
    conventionalLow: 2.6, conventionalHigh: 24.9, optimalLow: 2, optimalHigh: 5,
    description: "Insulin levels — elevated early in insulin resistance",
  },
  "HbA1c": {
    name: "HbA1c", unit: "%", category: "Metabolic",
    conventionalLow: 4.0, conventionalHigh: 5.6, optimalLow: 4.5, optimalHigh: 5.2,
    description: "3-month average blood sugar — glycated hemoglobin",
  },
  "Homocysteine": {
    name: "Homocysteine", unit: "umol/L", category: "Metabolic",
    conventionalLow: 0, conventionalHigh: 15, optimalLow: 5, optimalHigh: 7,
    description: "Methylation marker — linked to cardiovascular and neurological risk",
  },
  "Uric Acid": {
    name: "Uric Acid", unit: "mg/dL", category: "Metabolic",
    conventionalLow: 2.5, conventionalHigh: 8.0, optimalLow: 3.0, optimalHigh: 5.5,
    description: "Purine metabolism — elevated in gout, metabolic syndrome",
  },
  // ── Inflammation ─────────────────────────
  "hs-CRP": {
    name: "hs-CRP", unit: "mg/L", category: "Inflammation",
    conventionalLow: 0, conventionalHigh: 3.0, optimalLow: 0, optimalHigh: 0.5,
    description: "High-sensitivity C-reactive protein — systemic inflammation marker",
  },
  "ESR": {
    name: "ESR", unit: "mm/hr", category: "Inflammation",
    conventionalLow: 0, conventionalHigh: 20, optimalLow: 0, optimalHigh: 5,
    description: "Erythrocyte sedimentation rate — non-specific inflammation marker",
  },
  "Ferritin": {
    name: "Ferritin", unit: "ng/mL", category: "Iron/Inflammation",
    conventionalLow: 12, conventionalHigh: 150, optimalLow: 50, optimalHigh: 90,
    description: "Iron storage protein — also an acute phase reactant",
  },
  // ── Vitamins & Minerals ──────────────────
  "Vitamin D, 25-OH": {
    name: "Vitamin D, 25-OH", unit: "ng/mL", category: "Vitamins",
    conventionalLow: 30, conventionalHigh: 100, optimalLow: 60, optimalHigh: 80,
    description: "Vitamin D status — immune function, bone health, mood",
  },
  "Vitamin B12": {
    name: "Vitamin B12", unit: "pg/mL", category: "Vitamins",
    conventionalLow: 200, conventionalHigh: 1100, optimalLow: 500, optimalHigh: 800,
    description: "B12 status — nerve function, energy, methylation",
  },
  "Folate": {
    name: "Folate", unit: "ng/mL", category: "Vitamins",
    conventionalLow: 2.7, conventionalHigh: 17, optimalLow: 10, optimalHigh: 17,
    description: "Folate status — methylation, DNA repair, energy",
  },
  "RBC Magnesium": {
    name: "RBC Magnesium", unit: "mg/dL", category: "Minerals",
    conventionalLow: 4.2, conventionalHigh: 6.8, optimalLow: 5.5, optimalHigh: 6.5,
    description: "Intracellular magnesium — more accurate than serum magnesium",
  },
  "Zinc": {
    name: "Zinc", unit: "ug/dL", category: "Minerals",
    conventionalLow: 60, conventionalHigh: 130, optimalLow: 90, optimalHigh: 120,
    description: "Zinc status — immune function, wound healing, testosterone",
  },
  "Selenium": {
    name: "Selenium", unit: "ug/L", category: "Minerals",
    conventionalLow: 70, conventionalHigh: 150, optimalLow: 110, optimalHigh: 140,
    description: "Selenium status — thyroid conversion, antioxidant defense",
  },
  "Iron": {
    name: "Iron", unit: "ug/dL", category: "Minerals",
    conventionalLow: 27, conventionalHigh: 159, optimalLow: 85, optimalHigh: 130,
    description: "Serum iron — transport and metabolic use",
  },
  "TIBC": {
    name: "TIBC", unit: "ug/dL", category: "Minerals",
    conventionalLow: 250, conventionalHigh: 450, optimalLow: 250, optimalHigh: 350,
    description: "Total iron-binding capacity — inversely related to iron stores",
  },
  // ── Lipids ───────────────────────────────
  "Total Cholesterol": {
    name: "Total Cholesterol", unit: "mg/dL", category: "Lipids",
    conventionalLow: 0, conventionalHigh: 200, optimalLow: 180, optimalHigh: 250,
    description: "Total cholesterol — functional medicine views low cholesterol as a concern",
  },
  "LDL Cholesterol": {
    name: "LDL Cholesterol", unit: "mg/dL", category: "Lipids",
    conventionalLow: 0, conventionalHigh: 100, optimalLow: 80, optimalHigh: 130,
    description: "LDL — particle size matters more than total LDL",
  },
  "HDL Cholesterol": {
    name: "HDL Cholesterol", unit: "mg/dL", category: "Lipids",
    conventionalLow: 40, conventionalHigh: 999, optimalLow: 60, optimalHigh: 100,
    description: "Protective cholesterol — higher is generally better",
  },
  "Triglycerides": {
    name: "Triglycerides", unit: "mg/dL", category: "Lipids",
    conventionalLow: 0, conventionalHigh: 150, optimalLow: 40, optimalHigh: 80,
    description: "Blood fats — strongly influenced by sugar/carb intake",
  },
  "LDL Particle Number": {
    name: "LDL Particle Number", unit: "nmol/L", category: "Lipids",
    conventionalLow: 0, conventionalHigh: 1000, optimalLow: 0, optimalHigh: 700,
    description: "LDL-P — more predictive of risk than LDL-C",
  },
  "Lp(a)": {
    name: "Lp(a)", unit: "nmol/L", category: "Lipids",
    conventionalLow: 0, conventionalHigh: 75, optimalLow: 0, optimalHigh: 30,
    description: "Lipoprotein(a) — genetic cardiovascular risk marker",
  },
  // ── Liver ────────────────────────────────
  "ALT": {
    name: "ALT", unit: "U/L", category: "Liver",
    conventionalLow: 7, conventionalHigh: 56, optimalLow: 10, optimalHigh: 26,
    description: "Alanine transaminase — liver enzyme, liver-specific",
  },
  "AST": {
    name: "AST", unit: "U/L", category: "Liver",
    conventionalLow: 10, conventionalHigh: 40, optimalLow: 10, optimalHigh: 26,
    description: "Aspartate transaminase — liver/muscle enzyme",
  },
  "GGT": {
    name: "GGT", unit: "U/L", category: "Liver",
    conventionalLow: 9, conventionalHigh: 48, optimalLow: 10, optimalHigh: 26,
    description: "Gamma-glutamyl transferase — oxidative stress, detox capacity",
  },
  "Alkaline Phosphatase": {
    name: "Alkaline Phosphatase", unit: "U/L", category: "Liver",
    conventionalLow: 44, conventionalHigh: 147, optimalLow: 50, optimalHigh: 100,
    description: "ALP — liver/bone enzyme, zinc-dependent",
  },
  "Bilirubin (Total)": {
    name: "Bilirubin (Total)", unit: "mg/dL", category: "Liver",
    conventionalLow: 0.1, conventionalHigh: 1.2, optimalLow: 0.3, optimalHigh: 0.9,
    description: "Bile pigment — mild elevation can be antioxidant (Gilbert syndrome)",
  },
  // ── Kidney ───────────────────────────────
  "BUN": {
    name: "BUN", unit: "mg/dL", category: "Kidney",
    conventionalLow: 6, conventionalHigh: 20, optimalLow: 10, optimalHigh: 16,
    description: "Blood urea nitrogen — protein metabolism and kidney function",
  },
  "Creatinine": {
    name: "Creatinine", unit: "mg/dL", category: "Kidney",
    conventionalLow: 0.7, conventionalHigh: 1.3, optimalLow: 0.8, optimalHigh: 1.1,
    description: "Kidney filtration marker — influenced by muscle mass",
  },
  "eGFR": {
    name: "eGFR", unit: "mL/min", category: "Kidney",
    conventionalLow: 60, conventionalHigh: 999, optimalLow: 90, optimalHigh: 120,
    description: "Estimated glomerular filtration rate — kidney function",
  },
  // ── CBC ──────────────────────────────────
  "WBC": {
    name: "WBC", unit: "K/uL", category: "CBC",
    conventionalLow: 4.5, conventionalHigh: 11.0, optimalLow: 5.0, optimalHigh: 7.5,
    description: "White blood cells — immune cell count",
  },
  "RBC": {
    name: "RBC", unit: "M/uL", category: "CBC",
    conventionalLow: 4.2, conventionalHigh: 5.8, optimalLow: 4.5, optimalHigh: 5.2,
    description: "Red blood cells — oxygen-carrying cells",
  },
  "Hemoglobin": {
    name: "Hemoglobin", unit: "g/dL", category: "CBC",
    conventionalLow: 12.0, conventionalHigh: 17.5, optimalLow: 13.5, optimalHigh: 15.5,
    description: "Oxygen-carrying protein in red blood cells",
  },
  "Hematocrit": {
    name: "Hematocrit", unit: "%", category: "CBC",
    conventionalLow: 36, conventionalHigh: 52, optimalLow: 40, optimalHigh: 47,
    description: "Percentage of blood volume that is red blood cells",
  },
  "MCV": {
    name: "MCV", unit: "fL", category: "CBC",
    conventionalLow: 80, conventionalHigh: 100, optimalLow: 85, optimalHigh: 92,
    description: "Mean corpuscular volume — red blood cell size",
  },
  "Platelets": {
    name: "Platelets", unit: "K/uL", category: "CBC",
    conventionalLow: 150, conventionalHigh: 400, optimalLow: 200, optimalHigh: 300,
    description: "Clotting cells — important for wound healing",
  },
  // ── Hormones ─────────────────────────────
  "DHEA-S": {
    name: "DHEA-S", unit: "ug/dL", category: "Hormones",
    conventionalLow: 31, conventionalHigh: 701, optimalLow: 200, optimalHigh: 400,
    description: "DHEA sulfate — adrenal function, aging biomarker",
  },
  "Cortisol (AM)": {
    name: "Cortisol (AM)", unit: "ug/dL", category: "Hormones",
    conventionalLow: 6.2, conventionalHigh: 19.4, optimalLow: 10, optimalHigh: 15,
    description: "Morning cortisol — adrenal stress hormone",
  },
  "Total Testosterone (Male)": {
    name: "Total Testosterone (Male)", unit: "ng/dL", category: "Hormones",
    conventionalLow: 264, conventionalHigh: 916, optimalLow: 600, optimalHigh: 900,
    description: "Male total testosterone — energy, mood, muscle, libido",
  },
  "Free Testosterone (Male)": {
    name: "Free Testosterone (Male)", unit: "pg/mL", category: "Hormones",
    conventionalLow: 5, conventionalHigh: 21, optimalLow: 12, optimalHigh: 20,
    description: "Bioavailable testosterone — the unbound active form",
  },
  "Total Testosterone (Female)": {
    name: "Total Testosterone (Female)", unit: "ng/dL", category: "Hormones",
    conventionalLow: 8, conventionalHigh: 60, optimalLow: 30, optimalHigh: 50,
    description: "Female total testosterone — energy, mood, libido",
  },
  "Estradiol": {
    name: "Estradiol", unit: "pg/mL", category: "Hormones",
    conventionalLow: 12, conventionalHigh: 498, optimalLow: 50, optimalHigh: 200,
    description: "Primary estrogen — varies with menstrual cycle phase",
  },
  "Progesterone (Luteal)": {
    name: "Progesterone (Luteal)", unit: "ng/mL", category: "Hormones",
    conventionalLow: 1.8, conventionalHigh: 23.9, optimalLow: 15, optimalHigh: 25,
    description: "Luteal phase progesterone — fertility and mood",
  },
  // ── Gut Health ───────────────────────────
  "Calprotectin": {
    name: "Calprotectin", unit: "ug/g", category: "Gut Health",
    conventionalLow: 0, conventionalHigh: 120, optimalLow: 0, optimalHigh: 50,
    description: "Fecal calprotectin — intestinal inflammation marker",
  },
  "Secretory IgA": {
    name: "Secretory IgA", unit: "mg/dL", category: "Gut Health",
    conventionalLow: 51, conventionalHigh: 204, optimalLow: 80, optimalHigh: 180,
    description: "Mucosal immune defense — gut barrier function",
  },
};

// ── Helpers ──────────────────────────────────────

export function getMarkerReference(name: string): MarkerReference | undefined {
  return FUNCTIONAL_RANGES[name];
}

export function getMarkerStatus(
  name: string,
  value: number,
): "optimal" | "acceptable" | "out-of-range" | "unknown" {
  const ref = FUNCTIONAL_RANGES[name];
  if (!ref) return "unknown";
  if (value >= ref.optimalLow && value <= ref.optimalHigh) return "optimal";
  if (value >= ref.conventionalLow && value <= ref.conventionalHigh) return "acceptable";
  return "out-of-range";
}

export function searchMarkers(q: string): MarkerReference[] {
  const lower = q.toLowerCase();
  return Object.values(FUNCTIONAL_RANGES).filter(
    (m) =>
      m.name.toLowerCase().includes(lower) ||
      m.category.toLowerCase().includes(lower) ||
      m.description.toLowerCase().includes(lower),
  );
}

export function getCategories(): string[] {
  return [...new Set(Object.values(FUNCTIONAL_RANGES).map((m) => m.category))];
}

export function getMarkersByCategory(category: string): MarkerReference[] {
  return Object.values(FUNCTIONAL_RANGES).filter((m) => m.category === category);
}
