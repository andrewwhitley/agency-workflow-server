import { Client, GatewayIntentBits, Message, EmbedBuilder } from "discord.js";
import Anthropic from "@anthropic-ai/sdk";
import type { WorkflowEngine } from "./workflow-engine.js";
import type { KnowledgeBase } from "./knowledge-base.js";
import type { DocumentIndexer } from "./document-indexer.js";
import type { ClientAgent } from "./client-agent.js";
import { threadService } from "./thread-service.js";
import { agentService } from "./agent-service.js";
import { streamChat } from "./chat-engine.js";

interface Services {
  engine: WorkflowEngine;
  knowledgeBase: KnowledgeBase;
  indexer: DocumentIndexer;
  clientAgent: ClientAgent;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatLogEntry {
  id: string;
  timestamp: string;
  channelId: string;
  channelName: string;
  userId: string;
  username: string;
  userMessage: string;
  botResponse: string;
  type: "command" | "conversation";
}

const MAX_HISTORY = 20;
const MAX_DISCORD_LENGTH = 2000;
const MAX_CHAT_LOG = 200;

export class DiscordBot {
  private client: Client;
  private anthropic: Anthropic;
  private services: Services;
  private channelId: string | undefined;
  private conversationHistory = new Map<string, ConversationMessage[]>();
  private chatLog: ChatLogEntry[] = [];
  private useDatabase = !!process.env.DATABASE_URL;

  constructor(services: Services) {
    this.services = services;
    this.channelId = process.env.DISCORD_CHANNEL_ID;
    this.anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.on("messageCreate", (msg) => this.handleMessage(msg));
  }

  async start(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      console.log("  Discord:   Not configured (no DISCORD_BOT_TOKEN)");
      return;
    }

    await this.client.login(token);
    console.log(`  Discord:   Connected as ${this.client.user?.tag}${this.channelId ? ` (channel: ${this.channelId})` : " (mentions only)"}`);
  }

  isConnected(): boolean {
    return this.client.isReady();
  }

  getChatLog(): ChatLogEntry[] {
    return [...this.chatLog];
  }

  private logChat(message: Message, userMessage: string, botResponse: string, type: "command" | "conversation"): void {
    const channelName = "name" in message.channel ? (message.channel as any).name : message.channelId;
    const entry: ChatLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      channelId: message.channelId,
      channelName,
      userId: message.author.id,
      username: message.author.username,
      userMessage,
      botResponse,
      type,
    };
    this.chatLog.push(entry);
    while (this.chatLog.length > MAX_CHAT_LOG) {
      this.chatLog.shift();
    }
    const preview = botResponse.length > 80 ? botResponse.slice(0, 80) + "..." : botResponse;
    console.log(`[Discord] #${channelName} | @${message.author.username}: ${userMessage} → (${type}) ${preview}`);
  }

  private shouldRespond(message: Message): boolean {
    if (message.author.bot) return false;

    // Always respond in the dedicated channel
    if (this.channelId && message.channelId === this.channelId) return true;

    // Respond to @mentions anywhere
    if (this.client.user && message.mentions.has(this.client.user)) return true;

    return false;
  }

  private async handleMessage(message: Message): Promise<void> {
    if (!this.shouldRespond(message)) return;

    // Strip the bot mention from the content if present
    let content = message.content;
    if (this.client.user) {
      content = content.replace(new RegExp(`<@!?${this.client.user.id}>`, "g"), "").trim();
    }

    if (!content) return;

    try {
      // Check if it's a command
      if (content.startsWith("!")) {
        await this.handleCommand(message, content);
      } else {
        await this.handleConversation(message, content);
      }
    } catch (err) {
      console.error("Discord bot error:", err);
      await message.reply("Something went wrong. Check server logs for details.");
    }
  }

  // ─── Command Router ──────────────────────────────────

  private async handleCommand(message: Message, content: string): Promise<void> {
    const parts = content.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");

    let response = "";
    switch (command) {
      case "!help":
        await this.cmdHelp(message);
        response = "Showed help menu";
        break;
      case "!workflows":
        await this.cmdWorkflows(message);
        response = `Listed ${this.services.engine.list().length} workflows`;
        break;
      case "!run":
        await this.cmdRun(message, args);
        response = `Ran workflow: ${args}`;
        break;
      case "!stats":
        await this.cmdStats(message);
        response = "Showed workflow statistics";
        break;
      case "!history":
        await this.cmdHistory(message);
        response = "Showed run history";
        break;
      case "!search":
        await this.cmdSearch(message, args);
        response = `Search results for: ${args}`;
        break;
      case "!clients":
        await this.cmdClients(message);
        response = "Listed clients";
        break;
      case "!health":
        await this.cmdHealth(message);
        response = "Showed health status";
        break;
      default:
        await message.reply(`Unknown command: \`${command}\`. Use \`!help\` to see available commands.`);
        response = `Unknown command: ${command}`;
    }

    this.logChat(message, content, response, "command");
  }

  // ─── Commands ─────────────────────────────────────────

  private async cmdHelp(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Agency Workflow Bot")
      .setDescription("Available commands:")
      .addFields(
        { name: "`!workflows`", value: "List available workflows", inline: true },
        { name: "`!run <name>`", value: "Run a workflow", inline: true },
        { name: "`!stats`", value: "Show run statistics", inline: true },
        { name: "`!history`", value: "Recent run history", inline: true },
        { name: "`!search <query>`", value: "Search knowledge base", inline: true },
        { name: "`!clients`", value: "List indexed clients", inline: true },
        { name: "`!health`", value: "Server health check", inline: true },
        { name: "`!help`", value: "Show this message", inline: true },
      )
      .setFooter({ text: "Any other message starts a conversation with Claude." });
    await message.reply({ embeds: [embed] });
  }

  private async cmdWorkflows(message: Message): Promise<void> {
    const workflows = this.services.engine.list();
    if (!workflows.length) {
      await message.reply("No workflows registered.");
      return;
    }

    const lines = workflows.map(
      (w) => `**${w.name}** — ${w.description}\n  _Category:_ ${w.category} | _Steps:_ ${w.steps.length}`
    );
    await this.sendLong(message, `**Workflows (${workflows.length}):**\n\n${lines.join("\n\n")}`);
  }

  private async cmdRun(message: Message, workflowName: string): Promise<void> {
    if (!workflowName) {
      await message.reply("Usage: `!run <workflow-name>`\nUse `!workflows` to see available workflows.");
      return;
    }

    const workflow = this.services.engine.get(workflowName);
    if (!workflow) {
      const available = this.services.engine.list().map((w) => w.name).join(", ");
      await message.reply(`Workflow "${workflowName}" not found.\nAvailable: ${available || "none"}`);
      return;
    }

    await message.reply(`Running **${workflowName}**...`);

    const result = await this.services.engine.run(workflowName, {});

    const embed = new EmbedBuilder()
      .setTitle(`Workflow: ${workflowName}`)
      .setColor(result.success ? 0x00cc66 : 0xff4444)
      .addFields(
        { name: "Status", value: result.success ? "Success" : "Failed", inline: true },
        { name: "Duration", value: `${result.durationMs}ms`, inline: true },
      );

    if (result.error) {
      embed.addFields({ name: "Error", value: truncate(result.error, 1024) });
    }

    if (result.logs?.length) {
      embed.addFields({ name: "Logs", value: truncate(result.logs.join("\n"), 1024) });
    }

    await message.reply({ embeds: [embed] });
  }

  private async cmdStats(message: Message): Promise<void> {
    const stats = this.services.engine.getStats() as {
      total: number;
      successes: number;
      failures: number;
      running: number;
      avgDuration: number;
      byWorkflow: Record<string, { runs: number; successes: number; avgMs: number }>;
    };

    const embed = new EmbedBuilder()
      .setTitle("Workflow Statistics")
      .addFields(
        { name: "Total Runs", value: String(stats.total), inline: true },
        { name: "Successes", value: String(stats.successes), inline: true },
        { name: "Failures", value: String(stats.failures), inline: true },
        { name: "Running", value: String(stats.running), inline: true },
        { name: "Avg Duration", value: `${Math.round(stats.avgDuration)}ms`, inline: true },
      );

    if (Object.keys(stats.byWorkflow).length) {
      const breakdown = Object.entries(stats.byWorkflow)
        .map(([name, s]) => `**${name}**: ${s.runs} runs, ${s.successes} ok, avg ${Math.round(s.avgMs)}ms`)
        .join("\n");
      embed.addFields({ name: "By Workflow", value: truncate(breakdown, 1024) });
    }

    await message.reply({ embeds: [embed] });
  }

  private async cmdHistory(message: Message): Promise<void> {
    const history = this.services.engine.getHistory();
    if (!history.length) {
      await message.reply("No workflow runs yet.");
      return;
    }

    const recent = history.slice(-10).reverse();
    const lines = recent.map((run) => {
      const status = run.status === "success" ? "+" : run.status === "failed" ? "-" : "~";
      const time = run.startedAt ? new Date(run.startedAt).toLocaleString() : "unknown";
      return `\`${status}\` **${run.workflow}** — ${run.status} (${run.durationMs ?? "?"}ms) — ${time}`;
    });

    await this.sendLong(message, `**Recent Runs (last ${recent.length}):**\n\n${lines.join("\n")}`);
  }

  private async cmdSearch(message: Message, query: string): Promise<void> {
    if (!query) {
      await message.reply("Usage: `!search <query>`");
      return;
    }

    const results = this.services.knowledgeBase.search(query);
    if (!results.length) {
      await message.reply(`No results for "${query}".`);
      return;
    }

    const lines = results.slice(0, 5).map(
      (r, i) =>
        `**${i + 1}. ${r.document.name}**\n  _Client:_ ${r.document.client || "—"} | _Score:_ ${r.score.toFixed(2)} | _Matched:_ ${r.matchedTerms.join(", ")}\n  ${r.document.contentPreview || ""}`
    );

    await this.sendLong(message, `**Search results for "${query}":**\n\n${lines.join("\n\n")}`);
  }

  private async cmdClients(message: Message): Promise<void> {
    const clients = this.services.indexer.getClients();
    if (!clients.length) {
      await message.reply("No clients indexed yet.");
      return;
    }

    const lines = clients.map((name) => {
      const docs = this.services.indexer.getByClient(name);
      return `**${name}** — ${docs.length} document${docs.length === 1 ? "" : "s"}`;
    });

    await this.sendLong(message, `**Clients (${clients.length}):**\n\n${lines.join("\n")}`);
  }

  private async cmdHealth(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("Server Health")
      .setColor(0x00cc66)
      .addFields(
        { name: "Status", value: "Healthy", inline: true },
        { name: "Workflows", value: String(this.services.engine.list().length), inline: true },
        { name: "Documents", value: String(this.services.indexer.getAll().length), inline: true },
        { name: "Clients", value: String(this.services.indexer.getClients().length), inline: true },
        { name: "Uptime", value: formatUptime(process.uptime()), inline: true },
      );
    await message.reply({ embeds: [embed] });
  }

  // ─── Claude Conversation ──────────────────────────────

  private async handleConversation(message: Message, content: string): Promise<void> {
    // Show typing indicator
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    // Try persistent thread approach (if database is available)
    if (this.useDatabase) {
      try {
        await this.handlePersistentConversation(message, content);
        return;
      } catch (err) {
        console.error("Persistent conversation fallback to in-memory:", err);
        // Fall through to in-memory
      }
    }

    await this.handleInMemoryConversation(message, content);
  }

  private async handlePersistentConversation(message: Message, content: string): Promise<void> {
    const channelId = message.channelId;

    // Find or create a thread for this Discord channel
    let thread = await threadService.findByDiscordChannel(channelId);
    if (!thread) {
      // Use the General Assistant agent
      const agents = await agentService.list();
      const defaultAgent = agents.find((a) => a.name === "General Assistant") || agents[0];
      if (!defaultAgent) {
        throw new Error("No agents configured");
      }

      const channelName = "name" in message.channel ? (message.channel as any).name : channelId;
      thread = await threadService.create({
        title: `Discord: #${channelName}`,
        agent_id: defaultAgent.id,
        created_by: `discord:${channelId}`,
      });
    }

    // Stream the response using the chat engine
    let fullResponse = "";
    const generator = streamChat(
      thread.id,
      content,
      this.services.engine,
      this.services.knowledgeBase
    );

    for await (const event of generator) {
      if (event.type === "text") {
        fullResponse += event.content;
      } else if (event.type === "error") {
        fullResponse = `Error: ${event.content}`;
      }
    }

    if (!fullResponse) fullResponse = "_(no response)_";

    await this.sendLong(message, fullResponse);
    this.logChat(message, content, fullResponse, "conversation");
  }

  private async handleInMemoryConversation(message: Message, content: string): Promise<void> {
    const channelId = message.channelId;

    // Get or initialize channel history
    if (!this.conversationHistory.has(channelId)) {
      this.conversationHistory.set(channelId, []);
    }
    const history = this.conversationHistory.get(channelId)!;

    // Add user message
    history.push({ role: "user", content });

    // Cap history
    while (history.length > MAX_HISTORY) {
      history.shift();
    }

    const systemPrompt = this.buildSystemPrompt();

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    const assistantText =
      response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n") || "_(no response)_";

    // Add assistant response to history
    history.push({ role: "assistant", content: assistantText });
    while (history.length > MAX_HISTORY) {
      history.shift();
    }

    await this.sendLong(message, assistantText);
    this.logChat(message, content, assistantText, "conversation");
  }

  private buildSystemPrompt(): string {
    const workflows = this.services.engine.list();
    const clients = this.services.indexer.getClients();
    const docCount = this.services.indexer.getAll().length;

    return [
      "You are a helpful assistant integrated into a Discord bot for a digital marketing agency's workflow server.",
      "You help the team with questions, brainstorming, and general conversation.",
      "Keep responses concise — this is Discord, not a document.",
      "",
      "The server currently has:",
      `- ${workflows.length} workflows: ${workflows.map((w) => w.name).join(", ") || "none"}`,
      `- ${docCount} indexed documents`,
      `- ${clients.length} clients: ${clients.join(", ") || "none"}`,
      "",
      "Users can run commands like !workflows, !run, !search, !stats, !history, !clients, !health.",
      "If someone asks about something a command could answer, suggest the relevant command.",
    ].join("\n");
  }

  // ─── Helpers ──────────────────────────────────────────

  private async sendLong(message: Message, text: string): Promise<void> {
    if (text.length <= MAX_DISCORD_LENGTH) {
      await message.reply(text);
      return;
    }

    // Split into chunks at line boundaries
    const chunks: string[] = [];
    let current = "";
    for (const line of text.split("\n")) {
      if (current.length + line.length + 1 > MAX_DISCORD_LENGTH) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }
    if (current) chunks.push(current);

    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + "..." : str;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
