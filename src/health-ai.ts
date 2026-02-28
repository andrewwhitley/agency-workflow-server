/**
 * AI Wellness Assistant — functional medicine trained Claude chat engine.
 * Assembles patient context + knowledge base, streams responses.
 */

import Anthropic from "@anthropic-ai/sdk";
import { query } from "./health-database.js";

const anthropic = new Anthropic();

export interface ChatEvent {
  type: "text" | "done" | "error";
  content: string;
  conversationId?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const SYSTEM_PROMPT = `You are an expert Functional Medicine Wellness Consultant with deep knowledge of integrative and functional medicine. You provide personalized health guidance based on optimal functional medicine standards — NOT conventional Western medicine "normal" ranges.

## Your Philosophy
- Root cause analysis over symptom suppression
- Optimal ranges rather than conventional "normal" (based on averages of sick populations)
- The body as an interconnected system — everything affects everything
- Food as medicine, gut health as foundational
- Personalized protocols based on individual biochemistry
- Prevention through optimization, not just disease management
- Evidence-based integrative approaches

## Your Approach
1. Always consider the WHOLE picture — labs, symptoms, diet, lifestyle, stress, sleep, protocols
2. Use FUNCTIONAL/OPTIMAL ranges when analyzing labs (much narrower than conventional ranges)
3. Look for patterns and connections between different markers and symptoms
4. Suggest root cause investigations, not just treatments for symptoms
5. Recommend specific, actionable protocols (supplements, diet, lifestyle)
6. Track progress over time and adjust recommendations based on trends
7. Flag markers that are "normal" conventionally but suboptimal functionally

## Key Functional Medicine Principles
- TSH optimal: 1.0-2.0 (not 0.5-4.5)
- Vitamin D optimal: 60-80 ng/mL (not just >30)
- Ferritin optimal: 50-90 ng/mL (not 12-150)
- Fasting insulin optimal: 2-5 uIU/mL (not 2.6-24.9)
- hs-CRP optimal: <0.5 mg/L (not <3.0)
- Homocysteine optimal: 5-7 umol/L (not <15)
- B12 optimal: 500-800 pg/mL (not 200-1100)

## Important Caveats
- Always remind users you are an AI wellness assistant, not a licensed medical provider
- Encourage working with a qualified functional medicine practitioner
- Note when recommendations should be discussed with their doctor
- Be especially careful with children — always recommend pediatric consultation
- Never recommend stopping prescribed medications without doctor consultation

## Communication Style
- Warm, supportive, and empowering
- Clear and specific with recommendations
- Use plain language but include the science when helpful
- Celebrate progress and positive trends
- Be honest about areas of concern without causing alarm
- Frame findings as opportunities for optimization

You have access to the patient's full health record including lab results, symptoms, protocols, diet history, medical conditions, allergies, and medications. You also have access to a foundational knowledge base of functional medicine resources uploaded by the user. Use all of this data to provide personalized, context-aware guidance.`;

async function assemblePatientContext(familyMemberId: string): Promise<string> {
  const [memberResult, labsResult, symptomsResult, protocolsResult, dietResult, memoryResult] = await Promise.all([
    query("SELECT * FROM family_members WHERE id = $1", [familyMemberId]),
    query(
      `SELECT lr.test_date, lr.lab_name, lr.test_type,
        (SELECT json_agg(json_build_object('name', lm.name, 'value', lm.value, 'unit', lm.unit,
          'optimal_low', lm.optimal_low, 'optimal_high', lm.optimal_high,
          'conventional_low', lm.conventional_low, 'conventional_high', lm.conventional_high, 'category', lm.category)
         ORDER BY lm.category, lm.name)
       FROM lab_markers lm WHERE lm.lab_result_id = lr.id) as markers
       FROM lab_results lr WHERE lr.family_member_id = $1
       ORDER BY lr.test_date DESC LIMIT 10`,
      [familyMemberId]),
    query("SELECT logged_date, symptom, severity, body_system, notes FROM symptoms WHERE family_member_id = $1 ORDER BY logged_date DESC LIMIT 30", [familyMemberId]),
    query("SELECT name, category, description, dosage, frequency, status, start_date, notes FROM protocols WHERE family_member_id = $1 ORDER BY status, name", [familyMemberId]),
    query("SELECT logged_date, meal_type, description, tags, reactions, energy_level FROM diet_log WHERE family_member_id = $1 ORDER BY logged_date DESC LIMIT 20", [familyMemberId]),
    query("SELECT key, value, category FROM wellness_memory WHERE family_member_id = $1 ORDER BY category, key", [familyMemberId]),
  ]);

  const member = memberResult.rows[0];
  if (!member) return "No patient data available.";

  let age = "";
  if (member.date_of_birth) {
    const dob = new Date(member.date_of_birth);
    const years = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    age = `, Age ${years}`;
  }

  let ctx = `## Patient Profile\n`;
  ctx += `Name: ${member.name}${age}\n`;
  ctx += `Sex: ${member.sex || "not specified"} | Role: ${member.role || "not specified"}\n`;
  if (member.height_inches) ctx += `Height: ${Math.floor(Number(member.height_inches)/12)}'${Number(member.height_inches)%12}" | `;
  if (member.weight_lbs) ctx += `Weight: ${member.weight_lbs} lbs | `;
  if (member.blood_type) ctx += `Blood Type: ${member.blood_type}`;
  ctx += "\n";

  if (member.allergies?.length) ctx += `Allergies: ${member.allergies.join(", ")}\n`;
  if (member.conditions?.length) ctx += `Conditions: ${member.conditions.join(", ")}\n`;
  if (member.medications?.length) ctx += `Medications: ${member.medications.join(", ")}\n`;
  if (member.health_goals?.length) ctx += `Health Goals: ${member.health_goals.join("; ")}\n`;
  if (member.notes) ctx += `Notes: ${member.notes}\n`;

  if (labsResult.rows.length > 0) {
    ctx += `\n## Recent Lab Results (${labsResult.rows.length} panels)\n`;
    for (const lab of labsResult.rows) {
      ctx += `\n### ${lab.test_date} — ${lab.test_type || lab.lab_name || "Lab Panel"}\n`;
      if (lab.markers) {
        for (const m of lab.markers) {
          const status = getStatus(m.value, m.optimal_low, m.optimal_high, m.conventional_low, m.conventional_high);
          ctx += `- ${m.name}: ${m.value} ${m.unit} [${status}] (optimal: ${m.optimal_low}-${m.optimal_high})\n`;
        }
      }
    }
  }

  if (symptomsResult.rows.length > 0) {
    ctx += `\n## Recent Symptoms\n`;
    for (const s of symptomsResult.rows) {
      ctx += `- ${s.logged_date}: ${s.symptom} (severity ${s.severity}/10, ${s.body_system})${s.notes ? " — " + s.notes : ""}\n`;
    }
  }

  if (protocolsResult.rows.length > 0) {
    ctx += `\n## Protocols\n`;
    for (const p of protocolsResult.rows) {
      ctx += `- [${p.status}] ${p.name} (${p.category}): ${p.dosage} ${p.frequency}${p.notes ? " — " + p.notes : ""}\n`;
    }
  }

  if (dietResult.rows.length > 0) {
    ctx += `\n## Recent Diet\n`;
    for (const d of dietResult.rows) {
      const tags = d.tags?.length ? ` [${d.tags.join(", ")}]` : "";
      const reaction = d.reactions ? ` — Reaction: ${d.reactions}` : "";
      ctx += `- ${d.logged_date} ${d.meal_type}: ${d.description}${tags}${reaction}\n`;
    }
  }

  if (memoryResult.rows.length > 0) {
    ctx += `\n## Wellness Notes\n`;
    for (const m of memoryResult.rows) ctx += `- ${m.key}: ${m.value}\n`;
  }

  return ctx;
}

async function assembleKnowledgeContext(accountEmail: string): Promise<string> {
  const { rows } = await query(
    "SELECT title, content, doc_type, category FROM knowledge_documents WHERE account_email = $1 ORDER BY created_at",
    [accountEmail]);
  if (!rows.length) return "";

  let ctx = "\n## Foundational Knowledge Base\n";
  let totalChars = 0;
  const maxChars = 60000; // ~15k tokens for knowledge

  for (const doc of rows) {
    const header = `\n### ${doc.title} (${doc.doc_type}${doc.category ? ", " + doc.category : ""})\n`;
    const remaining = maxChars - totalChars - header.length;
    if (remaining <= 0) break;
    const content = doc.content.length > remaining ? doc.content.slice(0, remaining) + "\n[...truncated]" : doc.content;
    ctx += header + content + "\n";
    totalChars += header.length + content.length;
  }

  return ctx;
}

function getStatus(value: number, optLow: number | null, optHigh: number | null, convLow: number | null, convHigh: number | null): string {
  if (optLow != null && optHigh != null && value >= optLow && value <= optHigh) return "OPTIMAL";
  if (convLow != null && convHigh != null && value >= convLow && value <= convHigh) return "acceptable";
  return "OUT OF RANGE";
}

function trimMessages(
  messages: { role: string; content: string }[],
  maxTokens: number,
): { role: "user" | "assistant"; content: string }[] {
  const formatted = messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  let totalTokens = 0;
  let startIndex = formatted.length;
  for (let i = formatted.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(formatted[i].content);
    if (totalTokens + tokens > maxTokens) break;
    totalTokens += tokens;
    startIndex = i;
  }
  if (startIndex >= formatted.length && formatted.length > 0) startIndex = formatted.length - 1;
  return formatted.slice(startIndex);
}

export async function* streamWellnessChat(
  conversationId: string | undefined,
  userMessage: string,
  familyMemberId: string,
  accountEmail: string,
): AsyncGenerator<ChatEvent> {
  try {
    let convId = conversationId;
    if (!convId) {
      const { rows } = await query(
        `INSERT INTO wellness_conversations (family_member_id, account_email, title) VALUES ($1,$2,$3) RETURNING id`,
        [familyMemberId, accountEmail, "New Conversation"]);
      convId = rows[0].id;
    }

    await query("INSERT INTO wellness_messages (conversation_id, role, content) VALUES ($1, 'user', $2)", [convId, userMessage]);

    const [patientContext, knowledgeContext] = await Promise.all([
      assemblePatientContext(familyMemberId),
      assembleKnowledgeContext(accountEmail),
    ]);

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const fullSystem = `Current date: ${today}\n\n${SYSTEM_PROMPT}\n\n${patientContext}${knowledgeContext}`;

    const { rows: historyRows } = await query(
      "SELECT role, content FROM wellness_messages WHERE conversation_id = $1 ORDER BY created_at ASC", [convId]);

    const systemTokens = estimateTokens(fullSystem);
    const maxContextTokens = 100000 - systemTokens - 4096;
    const conversationMessages = trimMessages(historyRows, Math.max(maxContextTokens, 4000));

    let fullResponse = "";
    const totalUsage = { input_tokens: 0, output_tokens: 0 };

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      temperature: 0.7,
      system: fullSystem,
      messages: conversationMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        yield { type: "text", content: event.delta.text, conversationId: convId };
      }
      if (event.type === "message_start" && event.message.usage) totalUsage.input_tokens += event.message.usage.input_tokens;
      if (event.type === "message_delta" && event.usage) totalUsage.output_tokens += event.usage.output_tokens;
    }

    await query("INSERT INTO wellness_messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)", [convId, fullResponse]);
    await query("UPDATE wellness_conversations SET updated_at = NOW() WHERE id = $1", [convId]);

    const { rows: countRows } = await query("SELECT COUNT(*)::int as cnt FROM wellness_messages WHERE conversation_id = $1", [convId]);
    if (countRows[0].cnt === 2) generateTitle(convId!, userMessage, fullResponse).catch(console.error);

    extractMemories(familyMemberId, userMessage, fullResponse).catch(console.error);

    yield { type: "done", content: convId!, conversationId: convId, usage: totalUsage };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Wellness chat error:", message);
    yield { type: "error", content: message };
  }
}

async function generateTitle(conversationId: string, userMessage: string, assistantMessage: string): Promise<void> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: `Generate a short title (max 6 words) for this health conversation. Reply with ONLY the title, no quotes.\n\nUser: ${userMessage.slice(0, 200)}\nAssistant: ${assistantMessage.slice(0, 200)}` }],
    });
    const title = (response.content[0] as { text: string }).text.trim().slice(0, 100);
    if (title) await query("UPDATE wellness_conversations SET title = $1 WHERE id = $2", [title, conversationId]);
  } catch (err) { console.error("Auto-title failed:", err); }
}

async function extractMemories(familyMemberId: string, userMessage: string, assistantMessage: string): Promise<void> {
  try {
    const combined = userMessage + " " + assistantMessage;
    const keywords = ["allergy", "allergic", "intolerant", "diagnosed", "condition", "goal", "prefer", "sensitive"];
    if (!keywords.some((k) => combined.toLowerCase().includes(k))) return;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: `Extract key health facts from this conversation that should be remembered long-term. Return JSON array of {key: string, value: string, category: string} or empty array if nothing notable.\n\nUser: ${userMessage.slice(0, 500)}\nAssistant: ${assistantMessage.slice(0, 500)}` }],
    });
    const text = (response.content[0] as { text: string }).text;
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return;
    const memories = JSON.parse(match[0]) as { key: string; value: string; category: string }[];
    for (const m of memories) {
      await query(
        `INSERT INTO wellness_memory (family_member_id, key, value, category) VALUES ($1,$2,$3,$4)
         ON CONFLICT (family_member_id, key) DO UPDATE SET value = $3, category = $4, updated_at = NOW()`,
        [familyMemberId, m.key, m.value, m.category || ""]);
    }
  } catch { /* non-critical */ }
}
