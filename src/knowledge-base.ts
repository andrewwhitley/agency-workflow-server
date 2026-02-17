/**
 * Knowledge Base
 * Search and query layer over indexed documents.
 */

import { DocumentIndexer, IndexedDocument } from "./document-indexer.js";

export interface SearchOptions {
  client?: string;
  type?: "sop" | "client-doc";
  limit?: number;
}

export interface SearchResult {
  document: IndexedDocument;
  score: number;
  matchedTerms: string[];
}

export class KnowledgeBase {
  constructor(private indexer: DocumentIndexer) {}

  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (!terms.length) return [];

    let docs = this.indexer.getAll();

    // Filter by client
    if (options.client) {
      docs = docs.filter((d) => d.client?.toLowerCase() === options.client!.toLowerCase());
    }

    // Filter by type
    if (options.type) {
      docs = docs.filter((d) => d.type === options.type);
    }

    // Score each document
    const results: SearchResult[] = [];
    for (const doc of docs) {
      const contentLower = doc.content.toLowerCase();
      const nameLower = doc.name.toLowerCase();
      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of terms) {
        // Check content
        const contentMatches = (contentLower.match(new RegExp(term, "g")) || []).length;
        if (contentMatches > 0) {
          score += contentMatches;
          matchedTerms.push(term);
        }

        // Check name (higher weight)
        if (nameLower.includes(term)) {
          score += 5;
          if (!matchedTerms.includes(term)) matchedTerms.push(term);
        }

        // Check keywords
        if (doc.keywords.includes(term)) {
          score += 3;
          if (!matchedTerms.includes(term)) matchedTerms.push(term);
        }
      }

      if (score > 0) {
        results.push({ document: doc, score, matchedTerms });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    const limit = options.limit || 10;
    return results.slice(0, limit);
  }

  getClientContext(clientName: string): {
    client: string;
    documents: IndexedDocument[];
    sops: IndexedDocument[];
    docCount: number;
  } {
    const allDocs = this.indexer.getByClient(clientName);
    return {
      client: clientName,
      documents: allDocs.filter((d) => d.type === "client-doc"),
      sops: allDocs.filter((d) => d.type === "sop"),
      docCount: allDocs.length,
    };
  }

  getClients(): string[] {
    return this.indexer.getClients();
  }

  getSOPs(): IndexedDocument[] {
    return this.indexer.getByType("sop");
  }
}
