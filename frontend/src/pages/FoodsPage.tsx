import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed, Search, Check, Ban, Activity, FlaskConical,
  Loader2, RefreshCw,
} from 'lucide-react';
import type { FamilyMember, FoodRecommendationsData } from '../types';
import { getFoodRecommendations, streamChat } from '../api';
import { EmptyState } from '../components/EmptyState';

interface FoodList {
  enjoy: string[];
  limit: string[];
  top5: string[];
}

export function FoodsPage() {
  const { activeMember } = useOutletContext<{ activeMember: FamilyMember | null }>();
  const navigate = useNavigate();
  const [labData, setLabData] = useState<FoodRecommendationsData | null>(null);
  const [foods, setFoods] = useState<FoodList | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<'enjoy' | 'limit'>('enjoy');
  const [search, setSearch] = useState('');
  const generatedRef = useRef(false);

  useEffect(() => {
    if (!activeMember) return;
    generatedRef.current = false;
    setFoods(null);
    setLoading(true);
    getFoodRecommendations(activeMember.id)
      .then(setLabData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeMember?.id]);

  // Auto-generate food recommendations when lab data loads
  useEffect(() => {
    if (!labData || !activeMember || generatedRef.current) return;
    if (labData.allMarkers.length === 0) return;
    generatedRef.current = true;
    generateFoods(labData);
  }, [labData, activeMember?.id]);

  function generateFoods(data: FoodRecommendationsData) {
    if (!activeMember) return;
    setGenerating(true);

    const markerContext = data.outOfRangeMarkers.length > 0
      ? `Out-of-range markers: ${data.outOfRangeMarkers.map(m => `${m.name}: ${m.value} ${m.unit} (optimal: ${m.optimal_low}-${m.optimal_high})`).join(', ')}`
      : `All markers are in optimal range.`;

    const conditions = data.member.conditions.length > 0
      ? `Conditions: ${data.member.conditions.join(', ')}`
      : '';
    const allergies = data.member.allergies.length > 0
      ? `Allergies/sensitivities: ${data.member.allergies.join(', ')}`
      : '';

    const prompt = `Based on this person's health data, provide personalized food recommendations.

${markerContext}
${conditions}
${allergies}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation, just the JSON):
{"top5":["food1","food2","food3","food4","food5"],"enjoy":["food1","food2","food3","food4","food5","food6","food7","food8","food9","food10","food11","food12","food13","food14","food15","food16","food17","food18","food19","food20","food21","food22","food23","food24","food25"],"limit":["food1","food2","food3","food4","food5","food6","food7","food8","food9","food10","food11","food12","food13","food14","food15"]}

Rules:
- top5: The 5 most beneficial foods based on their specific biomarkers
- enjoy: 25+ foods to prioritize, organized alphabetically. Focus on nutrient-dense whole foods that address their specific deficiencies
- limit: 15+ foods to reduce or avoid based on their conditions and out-of-range markers
- Consider their allergies and conditions
- Be specific (e.g., "Wild-Caught Salmon" not just "Fish")`;

    let fullText = '';
    streamChat(prompt, activeMember.id, undefined, (event) => {
      if (event.type === 'text') {
        fullText += event.content;
      } else if (event.type === 'done') {
        try {
          // Extract JSON from the response
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setFoods({
              top5: parsed.top5 || [],
              enjoy: (parsed.enjoy || []).sort(),
              limit: (parsed.limit || []).sort(),
            });
          }
        } catch (err) {
          console.error('Failed to parse food recommendations:', err);
        }
        setGenerating(false);
      } else if (event.type === 'error') {
        setGenerating(false);
      }
    });
  }

  if (!activeMember) {
    return (
      <EmptyState
        icon={Activity}
        title="No family members yet"
        description="Add a family member to see food recommendations."
        action={{ label: 'Add Family Member', onClick: () => navigate('/family') }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!labData || labData.allMarkers.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No lab data available"
        description="Add lab results first so we can generate personalized food recommendations."
        action={{ label: 'Add Lab Results', onClick: () => navigate('/labs') }}
      />
    );
  }

  if (generating && !foods) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <div className="text-center">
          <p className="font-medium text-gray-200">Analyzing your biomarkers...</p>
          <p className="text-sm text-gray-500 mt-1">Generating personalized food recommendations</p>
        </div>
      </div>
    );
  }

  if (!foods) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="Generate Food Recommendations"
        description="Let our AI analyze your biomarkers and create a personalized food list."
        action={{ label: 'Generate', onClick: () => labData && generateFoods(labData) }}
      />
    );
  }

  const currentList = tab === 'enjoy' ? foods.enjoy : foods.limit;
  const filtered = search
    ? currentList.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : currentList;

  // Group by first letter
  const grouped: Record<string, string[]> = {};
  for (const food of filtered) {
    const letter = food[0]?.toUpperCase() || '#';
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(food);
  }
  const letters = Object.keys(grouped).sort();

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Foods</h1>
          <p className="text-gray-500 text-sm mt-0.5">Based on {activeMember.name}'s biomarkers</p>
        </div>
        <button
          onClick={() => labData && generateFoods(labData)}
          disabled={generating}
          className="p-2 text-gray-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
          title="Regenerate"
        >
          <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Enjoy / Limit toggle */}
      <div className="flex rounded-xl overflow-hidden mb-5 border border-dark-600">
        <button
          onClick={() => setTab('enjoy')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            tab === 'enjoy'
              ? 'bg-emerald-500/15 text-emerald-400 border-r border-dark-600'
              : 'bg-dark-800 text-gray-400 hover:text-gray-300 border-r border-dark-600'
          }`}
        >
          <Check className="w-4 h-4" />
          Enjoy these
        </button>
        <button
          onClick={() => setTab('limit')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            tab === 'limit'
              ? 'bg-red-500/10 text-red-400'
              : 'bg-dark-800 text-gray-400 hover:text-gray-300'
          }`}
        >
          <Ban className="w-4 h-4" />
          Limit these
        </button>
      </div>

      {/* Description */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 mb-5 text-sm text-gray-400">
        <p>
          These are specific to {activeMember.name}'s findings and will continually evolve as biomarkers shift over time.
        </p>
        {labData.outOfRangeMarkers.length > 0 && (
          <p className="mt-2 text-gray-500">
            Based on {labData.outOfRangeMarkers.length} out-of-range marker{labData.outOfRangeMarkers.length > 1 ? 's' : ''}.
          </p>
        )}
      </div>

      {/* Top 5 (only in enjoy tab) */}
      {tab === 'enjoy' && foods.top5.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-emerald-400 mb-3">Your Top 5</h3>
          <div className="space-y-1">
            {foods.top5.map((food) => (
              <div key={food} className="text-sm text-gray-200 py-1">{food}</div>
            ))}
          </div>
          <div className="border-b border-dark-600 mt-4" />
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search foods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-dark-800 border border-dark-600 rounded-lg pl-9 pr-4 py-2.5 text-sm
            placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Alphabetical list with letter index */}
      <div className="relative">
        {/* Letter index (side) */}
        <div className="hidden sm:flex flex-col items-center fixed right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600 gap-0.5 z-10">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#food-${letter}`}
              className="hover:text-emerald-400 transition-colors px-1"
            >
              {letter}
            </a>
          ))}
        </div>

        {/* Food list */}
        <div className="space-y-4">
          {letters.map((letter) => (
            <div key={letter} id={`food-${letter}`}>
              <h3 className={`text-sm font-semibold mb-2 ${
                tab === 'enjoy' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {letter}
              </h3>
              <div className="space-y-0.5">
                {grouped[letter].map((food) => (
                  <div key={food} className="text-sm text-gray-200 py-1.5">{food}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No foods match your search
          </div>
        )}
      </div>
    </div>
  );
}
