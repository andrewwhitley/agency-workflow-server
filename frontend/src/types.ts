export interface SessionUser {
  email: string;
  name: string;
  picture: string;
}

export interface FamilyMember {
  id: string;
  account_email: string;
  name: string;
  date_of_birth: string | null;
  sex: 'male' | 'female' | 'other' | null;
  role: 'adult' | 'child' | null;
  avatar_color: string;
  height_inches: number | null;
  weight_lbs: number | null;
  blood_type: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  primary_doctor: string;
  pharmacy_name: string;
  pharmacy_phone: string;
  insurance_provider: string;
  insurance_policy: string;
  insurance_group: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  address: string;
  health_goals: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LabResult {
  id: string;
  family_member_id: string;
  test_date: string;
  lab_name: string;
  test_type: string;
  notes: string;
  markers: LabMarker[] | null;
  created_at: string;
}

export interface LabMarker {
  id: string;
  lab_result_id: string;
  name: string;
  value: number;
  unit: string;
  conventional_low: number | null;
  conventional_high: number | null;
  optimal_low: number | null;
  optimal_high: number | null;
  category: string;
  notes: string;
}

export interface Symptom {
  id: string;
  family_member_id: string;
  logged_date: string;
  symptom: string;
  severity: number;
  body_system: string;
  notes: string;
  created_at: string;
}

export interface Protocol {
  id: string;
  family_member_id: string;
  name: string;
  category: string;
  description: string;
  dosage: string;
  frequency: string;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'paused' | 'completed' | 'discontinued';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DietEntry {
  id: string;
  family_member_id: string;
  logged_date: string;
  meal_type: string;
  description: string;
  tags: string[];
  reactions: string;
  energy_level: number | null;
  notes: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  family_member_id: string;
  account_email: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  filename: string;
  doc_type: string;
  category: string;
  content_preview: string;
  page_count: number;
  created_at: string;
}

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

export interface ReferenceData {
  markers: Record<string, MarkerReference>;
  bodySystems: string[];
  protocolCategories: string[];
  mealTypes: string[];
  dietTags: string[];
}

export interface TrendPoint {
  value: number;
  unit: string;
  optimal_low: number | null;
  optimal_high: number | null;
  conventional_low: number | null;
  conventional_high: number | null;
  test_date: string;
}

export interface DashboardSummary {
  recentLabs: LabResult[];
  recentSymptoms: Symptom[];
  protocols: Protocol[];
  recentDiet: DietEntry[];
}

// Biomarker Categories (Function Health-style)
export interface BiomarkerCategory {
  id: string;
  label: string;
  icon: string;
  markerCategories: string[];
}

export interface BiomarkerMarkerDetail {
  name: string;
  value: number;
  unit: string;
  status: 'in-range' | 'out-of-range' | 'other';
  optimal_low: number | null;
  optimal_high: number | null;
}

export interface BiomarkerCategoryResult extends BiomarkerCategory {
  inRange: number;
  outOfRange: number;
  other: number;
  total: number;
  markers: BiomarkerMarkerDetail[];
}

export interface BiomarkerSummary {
  categories: BiomarkerCategory[];
  results: BiomarkerCategoryResult[];
  totalInRange: number;
  totalOutOfRange: number;
  totalOther: number;
  totalMarkers: number;
  testDate: string | null;
  labName?: string;
}

export interface FoodRecommendationsData {
  member: { name: string; conditions: string[]; allergies: string[] };
  outOfRangeMarkers: Array<{ name: string; value: number; unit: string; optimal_low: number; optimal_high: number }>;
  allMarkers: Array<{ name: string; value: number; unit: string; category: string }>;
}
