/**
 * Print-optimized brand story page.
 * Public route via share token. Designed to be printed/saved as PDF.
 *
 * Auto-triggers print dialog on load (with ?autoprint=1 query param).
 * Use the browser's "Save as PDF" option to download.
 */
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

interface BrandStoryData {
  story: Record<string, unknown>;
  companyName: string;
  industry: string | null;
  status: string;
  generatedAt: string | null;
  buyerPersonas: { id: number; personaName: string; painPoints: string | null; needsDescription: string | null; gains?: string | null; buyingFactors?: string | null }[];
  brandColors: string | null;
}

const SECTIONS = [
  { key: "heroSection", title: "Your Customer", framework: "Brand Story" },
  { key: "problemSection", title: "The Problem You Solve", framework: "Brand Story" },
  { key: "guideSection", title: "Why You — Your Authority", framework: "Brand Story" },
  { key: "planSection", title: "Your Process", framework: "Brand Story" },
  { key: "ctaSection", title: "Calls to Action", framework: "Brand Story" },
  { key: "successSection", title: "The Transformation", framework: "Brand Story" },
  { key: "failureSection", title: "What's at Stake", framework: "Brand Story" },
  { key: "brandVoiceSection", title: "Brand Voice & Personality", framework: "Brand Identity" },
  { key: "visualIdentitySection", title: "Visual Identity", framework: "Brand Identity" },
  { key: "contentStrategySection", title: "Content Strategy", framework: "Thought Leadership" },
  { key: "messagingSection", title: "Core Messaging", framework: "Messaging" },
  { key: "implementationSection", title: "Implementation Roadmap", framework: "Strategy" },
  { key: "bigFiveSection", title: "The Big 5 Content Topics", framework: "Endless Customers" },
  { key: "tayaQuestionsSection", title: "They Ask, You Answer", framework: "Endless Customers" },
  { key: "endlessCustomersSection", title: "Buyer Trust Framework", framework: "Endless Customers" },
];

function parseColors(str: string | null): { hex: string }[] {
  if (!str) return [];
  const matches = str.match(/#[0-9A-Fa-f]{3,8}/g);
  return matches ? matches.map((hex) => ({ hex })) : [];
}

function mdToHtml(md: string): string {
  // Robust markdown rendering for print
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push("");
      continue;
    }
    // Headings
    if (trimmed.startsWith("### ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h4>${escapeHtml(trimmed.slice(4))}</h4>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h3>${escapeHtml(trimmed.slice(3))}</h3>`);
      continue;
    }
    // Bullets
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inlineFormat(trimmed.slice(2))}</li>`);
      continue;
    }
    // Numbered
    if (/^\d+[.)]\s/.test(trimmed)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inlineFormat(trimmed.replace(/^\d+[.)]\s/, ""))}</li>`);
      continue;
    }
    // Plain paragraph
    if (inList) { out.push("</ul>"); inList = false; }
    out.push(`<p>${inlineFormat(trimmed)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineFormat(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export function PrintBrandStoryPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("autoprint") === "1";
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

  // Auto-trigger print dialog after data loads
  useEffect(() => {
    if (!loading && data && autoPrint) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, data, autoPrint]);

  if (loading) {
    return <div style={{ padding: "4rem", textAlign: "center", fontFamily: "Georgia, serif" }}>Loading brand story...</div>;
  }
  if (error || !data) {
    return <div style={{ padding: "4rem", textAlign: "center", fontFamily: "Georgia, serif" }}>Brand story not found.</div>;
  }

  const colors = parseColors(data.brandColors);
  const story = data.story;
  const generatedDate = data.generatedAt ? new Date(data.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  const visibleSections = SECTIONS.filter((s) => {
    const sd = story[s.key] as Record<string, unknown> | null | undefined;
    return sd && (typeof sd.content === "string" && sd.content.trim());
  });

  return (
    <>
      <style>{`
        @page {
          size: letter;
          margin: 0.75in 0.65in;
        }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          .avoid-break { page-break-inside: avoid; }
        }
        body, .print-root {
          font-family: Georgia, 'Times New Roman', serif;
          color: #1a1f2e;
          line-height: 1.6;
          background: white;
        }
        .print-root {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0;
        }
        .print-controls {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 100;
          display: flex;
          gap: 0.5rem;
        }
        .print-btn {
          background: #1a1f2e;
          color: white;
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          font-family: system-ui, sans-serif;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .print-btn:hover { background: #3a4258; }
        .cover {
          min-height: 9in;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 2rem;
        }
        .cover .agency-tag {
          font-size: 0.85rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #5a6478;
          margin-bottom: 4rem;
          font-family: system-ui, sans-serif;
        }
        .cover h1 {
          font-size: 3rem;
          font-weight: 700;
          color: #1a1f2e;
          margin: 0 0 0.5rem 0;
          line-height: 1.1;
        }
        .cover .subtitle {
          font-size: 1.4rem;
          color: #5a6478;
          font-style: italic;
          margin-bottom: 4rem;
        }
        .cover .meta {
          color: #8892a4;
          font-size: 0.9rem;
          font-family: system-ui, sans-serif;
        }
        .cover .meta div { margin: 0.3rem 0; }
        .cover-divider {
          width: 80px;
          height: 3px;
          background: #1a1f2e;
          margin: 2rem 0;
        }
        .cover .colors {
          display: flex;
          gap: 0.75rem;
          margin-top: 3rem;
        }
        .cover .colors > div {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid #d1d5de;
        }
        .toc {
          padding: 2rem;
        }
        .toc h2 {
          font-size: 1.8rem;
          margin: 0 0 2rem 0;
          color: #1a1f2e;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #1a1f2e;
        }
        .toc ol {
          list-style: none;
          padding: 0;
          counter-reset: toc;
        }
        .toc li {
          counter-increment: toc;
          padding: 0.6rem 0;
          border-bottom: 1px dotted #d1d5de;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .toc li::before {
          content: counter(toc, decimal-leading-zero);
          font-family: system-ui, sans-serif;
          font-weight: 600;
          color: #5a6478;
          margin-right: 1rem;
          font-size: 0.85rem;
        }
        .toc li .title {
          flex: 1;
          font-size: 1.05rem;
        }
        .toc li .framework {
          font-size: 0.75rem;
          font-family: system-ui, sans-serif;
          color: #8892a4;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .section {
          padding: 2rem 0;
          page-break-inside: auto;
        }
        .section-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #1a1f2e;
        }
        .section-tag {
          font-size: 0.7rem;
          font-family: system-ui, sans-serif;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #5a6478;
          display: block;
          margin-bottom: 0.4rem;
        }
        .section-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
          color: #1a1f2e;
        }
        .section-body {
          font-size: 1rem;
          color: #1a1f2e;
        }
        .section-body h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1f2e;
          margin: 1.5rem 0 0.5rem 0;
          padding-left: 0.5rem;
          border-left: 4px solid #1a1f2e;
        }
        .section-body h4 {
          font-size: 1.05rem;
          font-weight: 600;
          color: #1a1f2e;
          margin: 1.2rem 0 0.4rem 0;
        }
        .section-body p {
          margin: 0.6rem 0;
        }
        .section-body ul {
          margin: 0.5rem 0 0.8rem 0;
          padding-left: 1.5rem;
        }
        .section-body li {
          margin: 0.3rem 0;
        }
        .section-body strong {
          color: #1a1f2e;
          font-weight: 700;
        }
        .footer {
          margin-top: 3rem;
          padding-top: 1rem;
          border-top: 1px solid #d1d5de;
          font-family: system-ui, sans-serif;
          font-size: 0.75rem;
          color: #8892a4;
          text-align: center;
        }
      `}</style>

      <div className="print-controls no-print">
        <button className="print-btn" onClick={() => window.print()}>📄 Save as PDF</button>
      </div>

      <div className="print-root">
        {/* COVER PAGE */}
        <div className="cover page-break">
          <div className="agency-tag">AI Marketing Team · Strategic Brand Document</div>
          <h1>{data.companyName}</h1>
          <div className="subtitle">Brand Story &amp; Strategy Guide</div>
          <div className="cover-divider" />
          <div className="meta">
            {data.industry && <div>{data.industry}</div>}
            {generatedDate && <div>Prepared {generatedDate}</div>}
            <div>{visibleSections.length} sections</div>
          </div>
          {colors.length > 0 && (
            <div className="colors">
              {colors.slice(0, 6).map((c, i) => (
                <div key={i} style={{ backgroundColor: c.hex }} title={c.hex} />
              ))}
            </div>
          )}
        </div>

        {/* TABLE OF CONTENTS */}
        <div className="toc page-break">
          <h2>Contents</h2>
          <ol>
            {visibleSections.map((s) => (
              <li key={s.key}>
                <span className="title">{s.title}</span>
                <span className="framework">{s.framework}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* SECTIONS */}
        {visibleSections.map((def, i) => {
          const sd = story[def.key] as Record<string, unknown>;
          const content = String(sd.content || "");
          return (
            <div key={def.key} className={i < visibleSections.length - 1 ? "section page-break" : "section"}>
              <div className="section-header avoid-break">
                <span className="section-tag">{def.framework}</span>
                <h2 className="section-title">{def.title}</h2>
              </div>
              <div
                className="section-body"
                dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
              />
            </div>
          );
        })}

        {/* FOOTER */}
        <div className="footer">
          <div>Prepared by AI Marketing Team for {data.companyName}</div>
          <div>This document is confidential and intended for internal use.</div>
          {generatedDate && <div>Generated {generatedDate}</div>}
        </div>
      </div>
    </>
  );
}
