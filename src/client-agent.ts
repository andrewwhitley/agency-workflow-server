/**
 * Client Agent
 * Per-client profiles and Q&A over client documents.
 */

import { DocumentIndexer, IndexedDocument } from "./document-indexer.js";

export interface ClientProfile {
  name: string;
  documentCount: number;
  sopCount: number;
  brandVoice: string[];
  goals: string[];
  kpis: string[];
  services: string[];
  lastUpdated: string;
}

export class ClientAgent {
  private profiles = new Map<string, ClientProfile>();

  constructor(private indexer: DocumentIndexer) {}

  buildProfile(clientName: string): ClientProfile {
    const docs = this.indexer.getByClient(clientName);
    const clientDocs = docs.filter((d) => d.type === "client-doc");
    const sops = docs.filter((d) => d.type === "sop");
    const allContent = docs.map((d) => d.content).join("\n\n");

    const profile: ClientProfile = {
      name: clientName,
      documentCount: clientDocs.length,
      sopCount: sops.length,
      brandVoice: this.extractPatterns(allContent, [
        /brand\s*voice[:\s]+([^\n.]+)/gi,
        /tone[:\s]+([^\n.]+)/gi,
        /voice[:\s]+([^\n.]+)/gi,
      ]),
      goals: this.extractPatterns(allContent, [
        /goals?[:\s]+([^\n.]+)/gi,
        /objectives?[:\s]+([^\n.]+)/gi,
        /targets?[:\s]+([^\n.]+)/gi,
      ]),
      kpis: this.extractPatterns(allContent, [
        /kpis?[:\s]+([^\n.]+)/gi,
        /metrics?[:\s]+([^\n.]+)/gi,
        /key\s*performance[:\s]+([^\n.]+)/gi,
      ]),
      services: this.extractPatterns(allContent, [
        /services?[:\s]+([^\n.]+)/gi,
        /deliverables?[:\s]+([^\n.]+)/gi,
      ]),
      lastUpdated: new Date().toISOString(),
    };

    this.profiles.set(clientName, profile);
    return profile;
  }

  getProfile(clientName: string): ClientProfile | undefined {
    return this.profiles.get(clientName);
  }

  getAllProfiles(): ClientProfile[] {
    return Array.from(this.profiles.values());
  }

  answer(clientName: string, question: string): { answer: string; sources: Array<{ name: string; preview: string }> } {
    const docs = this.indexer.getByClient(clientName);
    if (!docs.length) {
      return {
        answer: `No documents found for client "${clientName}".`,
        sources: [],
      };
    }

    const queryTerms = question
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    // Score and rank documents by relevance to the question
    const scored = docs
      .map((doc) => {
        const contentLower = doc.content.toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
          const matches = (contentLower.match(new RegExp(term, "g")) || []).length;
          score += matches;
        }
        return { doc, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (!scored.length) {
      return {
        answer: `No relevant information found for "${question}" in ${clientName}'s documents.`,
        sources: docs.slice(0, 3).map((d) => ({ name: d.name, preview: d.contentPreview })),
      };
    }

    // Extract relevant snippets from top documents
    const snippets = scored.map((s) => {
      const snippet = this.extractRelevantSnippet(s.doc, queryTerms);
      return { doc: s.doc, snippet };
    });

    const answer = snippets
      .map((s) => `[${s.doc.name}]: ${s.snippet}`)
      .join("\n\n");

    return {
      answer,
      sources: snippets.map((s) => ({
        name: s.doc.name,
        preview: s.snippet.slice(0, 200),
      })),
    };
  }

  private extractRelevantSnippet(doc: IndexedDocument, terms: string[]): string {
    const lines = doc.content.split("\n");
    const scoredLines = lines
      .map((line, idx) => {
        const lower = line.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (lower.includes(term)) score++;
        }
        return { line, idx, score };
      })
      .filter((l) => l.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!scoredLines.length) return doc.contentPreview;

    // Return the best matching region (3 lines of context)
    const bestIdx = scoredLines[0].idx;
    const start = Math.max(0, bestIdx - 1);
    const end = Math.min(lines.length, bestIdx + 3);
    return lines.slice(start, end).join("\n").trim();
  }

  private extractPatterns(content: string, patterns: RegExp[]): string[] {
    const results = new Set<string>();
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const value = match[1].trim();
        if (value.length > 3 && value.length < 200) {
          results.add(value);
        }
      }
    }
    return Array.from(results).slice(0, 10);
  }
}
