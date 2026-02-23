/**
 * Chat engine: assembles context, manages streaming, handles tool use.
 */

import Anthropic from "@anthropic-ai/sdk";
import { agentService, type Agent } from "./agent-service.js";
import { threadService, type Message } from "./thread-service.js";
import { KnowledgeBase } from "./knowledge-base.js";
import { WorkflowEngine } from "./workflow-engine.js";
import { GoogleDriveService } from "./google-drive.js";

const anthropic = new Anthropic();

// Rough token estimate: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ChatEvent {
  type: "text" | "done" | "error";
  content: string;
  usage?: { input_tokens: number; output_tokens: number };
}

// ── Tool definitions for agentic capabilities ─────────

function buildTools(engine: WorkflowEngine, knowledgeBase: KnowledgeBase, driveService?: GoogleDriveService): Anthropic.Tool[] {
  const tools: Anthropic.Tool[] = [
    {
      name: "search_knowledge",
      description: "Search the agency knowledge base for documents, SOPs, and client information. Use this when the user asks about specific clients, documents, or agency processes.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query" },
          client: { type: "string", description: "Optional client name filter" },
          type: { type: "string", enum: ["sop", "client-doc"], description: "Optional document type filter" },
        },
        required: ["query"],
      },
    },
  ];

  // Drive tools — only available when Drive + Oracle folder are configured
  if (driveService && process.env.ORACLE_FOLDER_ID) {
    tools.push(
      {
        name: "create_google_doc",
        description: "Create a new Google Doc in The Oracle output folder. Use this when asked to create a document, report, or write-up.",
        input_schema: {
          type: "object" as const,
          properties: {
            title: { type: "string", description: "Document title" },
            content: { type: "string", description: "Document body text content" },
          },
          required: ["title"],
        },
      },
      {
        name: "create_google_sheet",
        description: "Create a new Google Sheet in The Oracle output folder. Use this when asked to create a spreadsheet, tracker, or data table.",
        input_schema: {
          type: "object" as const,
          properties: {
            title: { type: "string", description: "Spreadsheet title" },
            headers: {
              type: "array",
              items: { type: "string" },
              description: "Column header names for the first row",
            },
            data: {
              type: "array",
              items: { type: "array", items: { type: "string" } },
              description: "Rows of data (array of arrays of strings)",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "update_google_doc",
        description: "Replace the content of an existing Google Doc. Use this when asked to update or rewrite a document.",
        input_schema: {
          type: "object" as const,
          properties: {
            doc_id: { type: "string", description: "The Google Doc ID to update" },
            content: { type: "string", description: "New document body text content" },
          },
          required: ["doc_id", "content"],
        },
      },
      {
        name: "append_to_google_sheet",
        description: "Append rows to an existing Google Sheet. Use this when asked to add data to a spreadsheet.",
        input_schema: {
          type: "object" as const,
          properties: {
            sheet_id: { type: "string", description: "The Google Sheet ID to append to" },
            rows: {
              type: "array",
              items: { type: "array", items: { type: "string" } },
              description: "Rows of data to append (array of arrays of strings)",
            },
          },
          required: ["sheet_id", "rows"],
        },
      },
      {
        name: "list_oracle_files",
        description: "List all files in The Oracle output folder. Use this to see what documents and spreadsheets have been created.",
        input_schema: {
          type: "object" as const,
          properties: {},
          required: [],
        },
      }
    );
  }

  // Web search tool — available when Tavily is configured
  if (process.env.TAVILY_API_KEY) {
    tools.push({
      name: "web_search",
      description: "Search the internet for current information. Use this when asked about recent events, market data, competitor info, or anything that requires up-to-date web results.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query" },
          max_results: { type: "number", description: "Number of results to return (default 5, max 10)" },
        },
        required: ["query"],
      },
    });
  }

  // Web scraping tool — available when ScrapeOwl is configured
  if (process.env.SCRAPEOWL_API_KEY) {
    tools.push({
      name: "scrape_url",
      description: "Fetch and read the content of a specific web page. Use this to get the full text of an article, blog post, or any URL. Pair with web_search to first find URLs then read them.",
      input_schema: {
        type: "object" as const,
        properties: {
          url: { type: "string", description: "The full URL to scrape" },
        },
        required: ["url"],
      },
    });
  }

  // Add workflow tools
  for (const wf of engine.list()) {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    if (wf.inputs) {
      for (const [key, spec] of Object.entries(wf.inputs)) {
        const def = typeof spec === "string" ? { type: spec } : spec;
        properties[key] = {
          type: def.type === "number" ? "number" : def.type === "boolean" ? "boolean" : "string",
          description: def.description || key,
        };
        if (def.required !== false) required.push(key);
      }
    }

    tools.push({
      name: `run_workflow_${wf.name.replace(/[^a-zA-Z0-9_]/g, "_")}`,
      description: `Run the "${wf.name}" workflow: ${wf.description}`,
      input_schema: {
        type: "object" as const,
        properties,
        required,
      },
    });
  }

  return tools;
}

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  engine: WorkflowEngine,
  knowledgeBase: KnowledgeBase,
  driveService?: GoogleDriveService
): Promise<string> {
  if (toolName === "search_knowledge") {
    const results = knowledgeBase.search(
      toolInput.query as string,
      {
        client: toolInput.client as string | undefined,
        type: toolInput.type as "sop" | "client-doc" | undefined,
      }
    );
    return JSON.stringify(
      results.map((r) => ({
        name: r.document.name,
        client: r.document.client,
        type: r.document.type,
        score: r.score,
        preview: r.document.contentPreview,
      })),
      null,
      2
    );
  }

  // Drive tools
  const oracleFolderId = process.env.ORACLE_FOLDER_ID;
  if (driveService && oracleFolderId) {
    try {
      if (toolName === "create_google_doc") {
        const result = await driveService.createGoogleDoc(
          toolInput.title as string,
          oracleFolderId,
          toolInput.content as string | undefined
        );
        return JSON.stringify({ success: true, ...result });
      }

      if (toolName === "create_google_sheet") {
        const result = await driveService.createGoogleSheet(
          toolInput.title as string,
          oracleFolderId,
          toolInput.headers as string[] | undefined,
          toolInput.data as string[][] | undefined
        );
        return JSON.stringify({ success: true, ...result });
      }

      if (toolName === "update_google_doc") {
        await driveService.updateGoogleDoc(
          toolInput.doc_id as string,
          toolInput.content as string
        );
        return JSON.stringify({ success: true, doc_id: toolInput.doc_id });
      }

      if (toolName === "append_to_google_sheet") {
        const result = await driveService.appendToGoogleSheet(
          toolInput.sheet_id as string,
          toolInput.rows as string[][]
        );
        return JSON.stringify({ success: true, sheet_id: toolInput.sheet_id, ...result });
      }

      if (toolName === "list_oracle_files") {
        const files = await driveService.listFiles(oracleFolderId);
        return JSON.stringify(
          files.map((f) => ({
            id: f.id,
            name: f.name,
            type: f.mimeType,
            modified: f.modifiedTime,
          })),
          null,
          2
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Drive tool "${toolName}" error:`, message);
      return JSON.stringify({ error: `Google Drive error: ${message}` });
    }
  }

  // Web search (Tavily)
  if (toolName === "web_search" && process.env.TAVILY_API_KEY) {
    try {
      const maxResults = Math.min(Number(toolInput.max_results) || 5, 10);
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: toolInput.query as string,
          search_depth: "basic",
          max_results: maxResults,
        }),
      });
      if (!res.ok) {
        return JSON.stringify({ error: `Web search failed: ${res.status}` });
      }
      const data = await res.json() as { results: { title: string; url: string; content: string }[] };
      return JSON.stringify(
        data.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content })),
        null,
        2
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Web search error:", message);
      return JSON.stringify({ error: `Web search error: ${message}` });
    }
  }

  // Web scraping (ScrapeOwl)
  if (toolName === "scrape_url" && process.env.SCRAPEOWL_API_KEY) {
    try {
      const res = await fetch("https://api.scrapeowl.com/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${process.env.SCRAPEOWL_API_KEY}`,
        },
        body: JSON.stringify({
          url: toolInput.url as string,
          json_response: true,
        }),
      });
      if (!res.ok) {
        return JSON.stringify({ error: `Web scrape failed: ${res.status}` });
      }
      const data = await res.json() as { text?: string; html?: string };
      // Return text content, truncated to avoid overwhelming context
      const text = data.text || "";
      return text.length > 15000 ? text.slice(0, 15000) + "\n\n[Content truncated — 15k char limit]" : text;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Web scrape error:", message);
      return JSON.stringify({ error: `Web scrape error: ${message}` });
    }
  }

  // Workflow tools
  const wfPrefix = "run_workflow_";
  if (toolName.startsWith(wfPrefix)) {
    const wfName = toolName.slice(wfPrefix.length).replace(/_/g, "-");
    // Find the actual workflow name
    const wf = engine.list().find(
      (w) => w.name.replace(/[^a-zA-Z0-9_]/g, "_") === toolName.slice(wfPrefix.length) || w.name === wfName
    );
    if (wf) {
      return engine.run(wf.name, toolInput).then((result) => JSON.stringify(result, null, 2));
    }
  }

  return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}

// ── Context assembly ──────────────────────────────────

function assembleSystemPrompt(
  agent: Agent,
  trainingDocs: { title: string; content: string; doc_type: string }[],
  clientContext?: string
): string {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  let system = `Current date: ${today}\n\n${agent.system_prompt}`;

  if (trainingDocs.length > 0) {
    system += "\n\n## Training Documents\n";
    for (const doc of trainingDocs) {
      system += `\n### ${doc.title} (${doc.doc_type})\n${doc.content}\n`;
    }
  }

  if (clientContext) {
    system += `\n\n## Client Context\n${clientContext}\n`;
  }

  return system;
}

function trimMessages(
  messages: Message[],
  maxTokens: number
): { role: "user" | "assistant"; content: string }[] {
  const formatted = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Count tokens from newest to oldest, keep as many as fit
  let totalTokens = 0;
  let startIndex = formatted.length;

  for (let i = formatted.length - 1; i >= 0; i--) {
    const tokens = estimateTokens(formatted[i].content);
    if (totalTokens + tokens > maxTokens) break;
    totalTokens += tokens;
    startIndex = i;
  }

  // Always include at least the last message
  if (startIndex >= formatted.length && formatted.length > 0) {
    startIndex = formatted.length - 1;
  }

  return formatted.slice(startIndex);
}

// ── Main chat function ────────────────────────────────

export async function* streamChat(
  threadId: string,
  userContent: string,
  engine: WorkflowEngine,
  knowledgeBase: KnowledgeBase,
  driveService?: GoogleDriveService
): AsyncGenerator<ChatEvent> {
  // Load thread + agent
  const thread = await threadService.getById(threadId);
  if (!thread) {
    yield { type: "error", content: "Thread not found" };
    return;
  }

  const agent = await agentService.getById(thread.agent_id);
  if (!agent) {
    yield { type: "error", content: "Agent not found" };
    return;
  }

  // Save user message
  await threadService.addMessage(threadId, "user", userContent);

  // Load training docs and build system prompt
  const trainingDocs = await agentService.getTrainingDocs(agent.id);

  let clientContext: string | undefined;
  if (thread.client) {
    const ctx = knowledgeBase.getClientContext(thread.client);
    if (ctx.docCount > 0) {
      clientContext = `Client: ${thread.client}\nDocuments: ${ctx.docCount}\n` +
        ctx.documents.slice(0, 3).map((d) => `- ${d.name}: ${d.contentPreview}`).join("\n");
    }
  }

  const systemPrompt = assembleSystemPrompt(agent, trainingDocs, clientContext);

  // Load conversation history
  const allMessages = await threadService.getMessages(threadId);

  // Reserve tokens for system prompt + response
  const systemTokens = estimateTokens(systemPrompt);
  const maxContextTokens = 100000 - systemTokens - agent.max_tokens;
  const conversationMessages = trimMessages(allMessages, Math.max(maxContextTokens, 4000));

  // Build tools
  const tools = buildTools(engine, knowledgeBase, driveService);

  // Stream response with tool use loop
  let fullResponse = "";
  let totalUsage = { input_tokens: 0, output_tokens: 0 };

  let currentMessages = conversationMessages;

  console.log(`[chat] Thread ${threadId}: ${currentMessages.length} messages, ${tools.length} tools, model=${agent.model}`);

  // Tool use loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const stream = anthropic.messages.stream({
      model: agent.model,
      max_tokens: agent.max_tokens,
      temperature: agent.temperature,
      system: systemPrompt,
      messages: currentMessages,
      tools: tools.length > 0 ? tools : undefined,
    });

    let stopReason: string | null = null;
    let toolUseBlocks: { id: string; name: string; input: Record<string, unknown> }[] = [];
    let textContent = "";

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          textContent += event.delta.text;
          fullResponse += event.delta.text;
          yield { type: "text", content: event.delta.text };
        }
      }

      if (event.type === "message_start" && event.message.usage) {
        totalUsage.input_tokens += event.message.usage.input_tokens;
      }

      if (event.type === "message_delta") {
        if (event.usage) {
          totalUsage.output_tokens += event.usage.output_tokens;
        }
        stopReason = event.delta.stop_reason;
      }

      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        toolUseBlocks.push({
          id: event.content_block.id,
          name: event.content_block.name,
          input: {} as Record<string, unknown>,
        });
      }

      if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
        // Accumulate JSON for tool input — we'll parse the full response later
      }
    }

    // If stop reason is tool_use, we need to handle it
    if (stopReason === "tool_use") {
      console.log(`[chat] Tool use triggered, processing...`);
      // Get the full message to extract complete tool use blocks
      const finalMessage = await stream.finalMessage();
      toolUseBlocks = [];
      const assistantContent: Anthropic.ContentBlock[] = [];

      for (const block of finalMessage.content) {
        if (block.type === "tool_use") {
          toolUseBlocks.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
        assistantContent.push(block);
      }

      // Add assistant message with tool_use blocks
      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: assistantContent as unknown as string },
      ];

      // Execute tools and add results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolBlock of toolUseBlocks) {
        const result = await executeToolCall(
          toolBlock.name,
          toolBlock.input,
          engine,
          knowledgeBase,
          driveService
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: result,
        });
      }

      currentMessages = [
        ...currentMessages,
        { role: "user" as const, content: toolResults as unknown as string },
      ];

      // Continue the loop to get the next response
      console.log(`[chat] Tool results added, continuing conversation...`);
      continue;
    }

    // No tool use — we're done
    break;
  }

  // Save assistant message
  const assistantMessage = await threadService.addMessage(
    threadId,
    "assistant",
    fullResponse,
    totalUsage.output_tokens
  );

  // Auto-title on first exchange (2 messages = 1 user + 1 assistant)
  const messageCount = await threadService.getMessageCount(threadId);
  if (messageCount === 2 && !thread.title) {
    generateTitle(threadId, userContent, fullResponse).catch(console.error);
  }

  yield {
    type: "done",
    content: assistantMessage.id,
    usage: totalUsage,
  };
}

// ── Auto-title generation ─────────────────────────────

async function generateTitle(
  threadId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Generate a short title (max 6 words) for this conversation. Reply with ONLY the title, no quotes or punctuation.\n\nUser: ${userMessage.slice(0, 200)}\nAssistant: ${assistantMessage.slice(0, 200)}`,
        },
      ],
    });

    const title = (response.content[0] as { text: string }).text.trim().slice(0, 100);
    if (title) {
      await threadService.update(threadId, { title });
    }
  } catch (err) {
    console.error("Auto-title generation failed:", err);
  }
}
