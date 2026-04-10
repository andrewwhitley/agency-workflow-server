/**
 * Test the Big 5 / TAYA content parser logic against synthetic markdown.
 * This validates the parser regex patterns work correctly.
 */
import "dotenv/config";

// Reproduce the parser logic standalone (since it's not exported)
function extractContent(section) {
  if (!section) return "";
  if (typeof section === "string") {
    try { return JSON.parse(section)?.content || ""; } catch { return section; }
  }
  if (typeof section === "object" && section !== null) {
    if (typeof section.content === "string") return section.content;
  }
  return "";
}

function parseBigFiveArticles(markdown) {
  if (!markdown) return [];
  const articles = [];
  const categoryMatchers = [
    { pattern: /cost\s*&?\s*pricing|pricing/i, label: "Cost & Pricing" },
    { pattern: /problems?\s*&?\s*risks?|side effects/i, label: "Problems & Risks" },
    { pattern: /comparisons?|vs\.?\s*[a-z]/i, label: "Comparisons" },
    { pattern: /reviews?|best.?of/i, label: "Reviews & Best-of" },
    { pattern: /best\s+(in\s+)?class/i, label: "Best in Class" },
  ];

  let currentCategory = "Big 5";
  const lines = markdown.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const headingText = line.replace(/^#+\s*\d*\.?\s*/, "").trim();
      const matched = categoryMatchers.find((m) => m.pattern.test(headingText));
      if (matched) currentCategory = matched.label;
      continue;
    }
    let title = line.replace(/^[-*•]\s*/, "").trim();
    title = title.replace(/^["'`]+|["'`]+$/g, "").trim();
    title = title.replace(/^\d+[.)]\s*/, "").trim();
    if (title.length < 12 || title.length > 200) continue;
    if (title.endsWith(":") || (title.endsWith(".") && title.split(" ").length > 20)) continue;
    if (title === title.toUpperCase() && title.length < 30) continue;
    articles.push({
      title, category: currentCategory,
      type: currentCategory.includes("Cost") || currentCategory.includes("Comparison") ? "Long-form with PR" : "Standard Article",
    });
  }
  return articles;
}

function parseTayaQuestions(markdown) {
  if (!markdown) return [];
  const questions = [];
  const stageMatchers = [
    { pattern: /awareness/i, label: "Awareness" },
    { pattern: /consideration/i, label: "Consideration" },
    { pattern: /decision/i, label: "Decision" },
    { pattern: /post.?purchase|retention/i, label: "Post-Purchase" },
  ];
  let currentStage = "General";
  const lines = markdown.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      const headingText = line.replace(/^#+\s*/, "").trim();
      const matched = stageMatchers.find((m) => m.pattern.test(headingText));
      if (matched) currentStage = matched.label;
      continue;
    }
    let question = line.replace(/^[-*•]\s*/, "").trim();
    question = question.replace(/^["'`]+|["'`]+$/g, "").trim();
    question = question.replace(/^\d+[.)]\s*/, "").trim();
    if (question.length < 8 || question.length > 250) continue;
    const looksLikeQuestion = /[?]/.test(question) || /^(how|what|why|when|where|who|which|do|does|is|are|can|should)\b/i.test(question);
    if (!looksLikeQuestion) continue;
    questions.push({ question, stage: currentStage });
  }
  return questions;
}

// ── Test data ──

const sampleBigFive = `
### 1. Cost & Pricing

- "How much does functional medicine cost in 2026? A complete breakdown"
- "BHRT pricing: what affects the cost of hormone therapy"
- "Is functional medicine worth the investment? A cost-benefit analysis"
- "Insurance and functional medicine: what's covered"
- "How to budget for ongoing functional medicine care"

### 2. Problems & Risks

- "Common problems with BHRT (and how to avoid them)"
- "When functional medicine is NOT the right choice"
- "BHRT side effects: what you need to know"
- "The risks of going off-protocol with functional medicine"

### 3. Comparisons

- "Functional medicine vs traditional medicine: which is right for you?"
- "BHRT vs synthetic hormone therapy: an honest comparison"
- "Acme Health vs other Springfield clinics: an honest review"
- "IV therapy vs oral supplements: which works better?"

### 4. Reviews & Best-of Lists

- "Best functional medicine providers in Springfield IL"
- "Top BHRT clinics reviewed 2026"
- "Reviews of common functional medicine protocols"

### 5. Best in Class

- "The best functional medicine clinic for executives"
- "Best BHRT for menopausal women over 50"
- "What makes the best functional medicine practice?"
`;

const sampleTaya = `
### Awareness Stage Questions

- Why am I always tired even when I sleep 8 hours?
- What causes hormone imbalances in women?
- Is brain fog a sign of something serious?
- Do I really need to see a doctor for chronic fatigue?

### Consideration Stage Questions

- What's the difference between functional medicine and traditional medicine?
- How do functional medicine doctors find the root cause?
- What tests does a functional medicine doctor run?
- How long does functional medicine treatment take?

### Decision Stage Questions

- How do I choose the right functional medicine doctor?
- Does insurance cover functional medicine?
- How long does it take to see results with BHRT?
- What should I expect at my first appointment?

### Post-Purchase Questions

- How often should I follow up with my functional medicine doctor?
- When can I expect to feel better?
`;

// ── Run tests ──

console.log("=== Big 5 Parser Test ===");
const articles = parseBigFiveArticles(sampleBigFive);
console.log(`Parsed ${articles.length} articles:`);
const byCategory = {};
for (const a of articles) {
  if (!byCategory[a.category]) byCategory[a.category] = [];
  byCategory[a.category].push(a.title);
}
for (const [cat, titles] of Object.entries(byCategory)) {
  console.log(`\n  ${cat} (${titles.length}):`);
  titles.forEach((t) => console.log(`    - ${t}`));
}

console.log("\n\n=== TAYA Parser Test ===");
const questions = parseTayaQuestions(sampleTaya);
console.log(`Parsed ${questions.length} questions:`);
const byStage = {};
for (const q of questions) {
  if (!byStage[q.stage]) byStage[q.stage] = [];
  byStage[q.stage].push(q.question);
}
for (const [stage, qs] of Object.entries(byStage)) {
  console.log(`\n  ${stage} (${qs.length}):`);
  qs.forEach((q) => console.log(`    - ${q}`));
}

// Sanity assertions
let pass = true;
if (articles.length < 15) { console.error(`\nFAIL: Expected at least 15 Big 5 articles, got ${articles.length}`); pass = false; }
if (questions.length < 10) { console.error(`\nFAIL: Expected at least 10 TAYA questions, got ${questions.length}`); pass = false; }
if (!articles.some((a) => a.category === "Cost & Pricing")) { console.error("\nFAIL: No Cost & Pricing category"); pass = false; }
if (!articles.some((a) => a.category === "Comparisons")) { console.error("\nFAIL: No Comparisons category"); pass = false; }
if (!questions.some((q) => q.stage === "Awareness")) { console.error("\nFAIL: No Awareness stage"); pass = false; }
if (!questions.some((q) => q.stage === "Decision")) { console.error("\nFAIL: No Decision stage"); pass = false; }

// Test extractContent for JSONB-like data
const jsonString = JSON.stringify({ content: "test markdown", generated: true });
if (extractContent(jsonString) !== "test markdown") { console.error("FAIL: extractContent for JSON string"); pass = false; }
if (extractContent({ content: "object content" }) !== "object content") { console.error("FAIL: extractContent for object"); pass = false; }
if (extractContent(null) !== "") { console.error("FAIL: extractContent for null"); pass = false; }

console.log(pass ? "\n✓ All tests passed" : "\n✗ Some tests failed");
process.exit(pass ? 0 : 1);
