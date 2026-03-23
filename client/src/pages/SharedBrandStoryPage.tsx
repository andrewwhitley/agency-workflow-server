import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BookOpen, Users, AlertTriangle, Shield, Compass, MousePointerClick,
  Trophy, Skull, MessageSquare, Eye, FileText, Palette, Rocket, Target,
} from "lucide-react";

interface BrandStoryData {
  story: Record<string, unknown>;
  companyName: string;
  industry: string | null;
  status: string;
  generatedAt: string | null;
  buyerPersonas: { id: number; personaName: string; painPoints: string | null; needsDescription: string | null }[];
  brandColors: string | null;
}

const sectionDefs = [
  { key: "heroSection", label: "Hero", icon: Users, color: "text-blue-500", framework: "Brand Story" },
  { key: "problemSection", label: "Problem", icon: AlertTriangle, color: "text-red-500", framework: "Brand Story" },
  { key: "guideSection", label: "Guide", icon: Shield, color: "text-emerald-500", framework: "Brand Story" },
  { key: "planSection", label: "Plan", icon: Compass, color: "text-amber-500", framework: "Brand Story" },
  { key: "ctaSection", label: "Call to Action", icon: MousePointerClick, color: "text-purple-500", framework: "Brand Story" },
  { key: "successSection", label: "Success", icon: Trophy, color: "text-green-500", framework: "Brand Story" },
  { key: "failureSection", label: "Failure", icon: Skull, color: "text-rose-500", framework: "Brand Story" },
  { key: "brandVoiceSection", label: "Brand Voice", icon: MessageSquare, color: "text-pink-500", framework: "Brand Identity" },
  { key: "visualIdentitySection", label: "Visual Identity", icon: Eye, color: "text-indigo-500", framework: "Brand Identity" },
  { key: "contentStrategySection", label: "Content Strategy", icon: FileText, color: "text-cyan-500", framework: "Strategy" },
  { key: "messagingSection", label: "Messaging", icon: Palette, color: "text-orange-500", framework: "Messaging" },
  { key: "implementationSection", label: "Implementation", icon: Rocket, color: "text-teal-500", framework: "Strategy" },
];

function parseColors(str: string | null): { hex: string }[] {
  if (!str) return [];
  const matches = str.match(/#[0-9A-Fa-f]{3,8}/g);
  return matches ? matches.map((hex) => ({ hex })) : [];
}

const mdToHtml = (md: string): string => {
  return md
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/([^>])\n([^<])/g, '$1<br>$2')
    .replace(/^(?!<)/, '<p>')
    .replace(/(?!>)$/, '</p>')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p>\s*(<[hul])/g, '$1')
    .replace(/(<\/[hul][^>]*>)\s*<\/p>/g, '$1');
};

export function SharedBrandStoryPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<BrandStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/brand-story/${token}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-[#3964b2] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#5a6478]">Loading Brand Story...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
        <div className="max-w-md w-full bg-white rounded-lg border p-8 text-center space-y-4 shadow-sm">
          <BookOpen className="h-12 w-12 text-[#8892a4] mx-auto" />
          <h2 className="text-xl font-semibold text-[#1a1f2e]">Brand Story Not Found</h2>
          <p className="text-[#5a6478]">
            This link may have expired or been revoked. Please contact the team for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const colors = parseColors(data.brandColors);
  const story = data.story;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f7fa] to-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a1f2e]">{data.companyName}</h1>
              <p className="text-sm text-[#5a6478]">Brand Story Guide</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {data.industry && (
              <span className="text-xs px-2 py-1 rounded border border-[#d1d5de] text-[#5a6478]">{data.industry}</span>
            )}
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              data.status === "approved" ? "bg-green-100 text-green-700" :
              data.status === "reviewed" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
            }`}>{data.status.charAt(0).toUpperCase() + data.status.slice(1)}</span>
            {data.generatedAt && (
              <span className="text-xs text-[#8892a4]">Generated {new Date(data.generatedAt).toLocaleDateString()}</span>
            )}
          </div>

          {colors.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs text-[#5a6478] font-medium">Brand Colors:</span>
              <div className="flex gap-1.5">
                {colors.map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: c.hex }} title={c.hex} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Full Brand Story */}
        {!!story.fullBrandStory && (
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#1a1f2e] mb-4">Full Brand Story</h2>
            <div className="text-sm text-[#1a1f2e] whitespace-pre-wrap leading-relaxed">{String(story.fullBrandStory)}</div>
          </div>
        )}

        {/* Buyer Personas */}
        {data.buyerPersonas.length > 0 && (
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <h3 className="text-sm font-semibold text-[#1a1f2e]">Buyer Personas</h3>
            </div>
            <div className="p-4 space-y-3">
              {data.buyerPersonas.map((p) => (
                <div key={p.id} className="border-l-4 border-l-purple-400 rounded-md p-4 bg-[#f5f7fa]">
                  <h4 className="font-semibold text-sm text-[#1a1f2e]">{p.personaName}</h4>
                  {p.needsDescription && <p className="text-sm text-[#5a6478] mt-1">{p.needsDescription}</p>}
                  {p.painPoints && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-[#8892a4] uppercase">Pain Points</span>
                      <p className="text-sm mt-0.5 text-[#1a1f2e]">{p.painPoints}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brand Story Sections */}
        {sectionDefs.map((def) => {
          const sectionData = story[def.key] as Record<string, unknown> | null;
          if (!sectionData || Object.keys(sectionData).length === 0) return null;

          const Icon = def.icon;
          const hasContent = typeof sectionData === "object" && sectionData.content;
          const contentStr = hasContent ? String(sectionData.content) : null;
          const entries = !hasContent ? Object.entries(sectionData).filter(([, v]) => v) : [];

          if (!contentStr && entries.length === 0) return null;

          const frameworkColors: Record<string, string> = {
            "Brand Story": "bg-blue-100 text-blue-700",
            "Brand Identity": "bg-purple-100 text-purple-700",
            "Strategy": "bg-emerald-100 text-emerald-700",
            "Messaging": "bg-indigo-100 text-indigo-700",
          };

          return (
            <div key={def.key} className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b flex items-center gap-3">
                <div className={`p-1.5 rounded-md bg-[#f5f7fa] ${def.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#1a1f2e]">{def.label}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${frameworkColors[def.framework] || "bg-gray-100 text-gray-700"}`}>
                    {def.framework}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {contentStr ? (
                  <div className="text-sm text-[#1a1f2e] leading-relaxed [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1 [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: mdToHtml(contentStr) }} />
                ) : entries.map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs font-semibold text-[#5a6478] capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</div>
                    <div className="text-sm text-[#1a1f2e] whitespace-pre-wrap">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center py-8 text-xs text-[#8892a4]">
          <p>This Brand Story was prepared for {data.companyName}.</p>
          <p className="mt-1">For questions or revisions, please contact your marketing team.</p>
        </div>
      </div>
    </div>
  );
}
