/**
 * Document Indexer
 * Crawl Drive folders, extract text, classify, and cache documents.
 */

import * as fs from "fs";
import * as path from "path";
import { GoogleDriveService, DriveFile } from "./google-drive.js";

export interface IndexedDocument {
  id: string;
  driveFileId: string;
  name: string;
  path: string;
  client: string | null;
  type: "sop" | "client-doc";
  content: string;
  contentPreview: string;
  keywords: string[];
  lastSyncedAt: string;
}

const CACHE_PATH = path.resolve("data", "document-cache.json");

export class DocumentIndexer {
  private documents = new Map<string, IndexedDocument>();
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadFromFile();
  }

  async indexFolder(folderId: string, driveService: GoogleDriveService): Promise<number> {
    const walked = await driveService.walkFolder(folderId);
    let indexed = 0;

    for (const { file, path: filePath } of walked) {
      try {
        const content = await driveService.readFile(file.id, file.mimeType);
        const doc = this.buildDocument(file, filePath, content);
        this.documents.set(doc.id, doc);
        indexed++;
      } catch (err) {
        console.error(`Failed to index ${filePath}:`, err);
      }
    }

    this.saveToFile();
    return indexed;
  }

  async refreshIndex(driveService: GoogleDriveService): Promise<number> {
    // Re-index all known documents by checking modifiedTime
    let refreshed = 0;
    for (const doc of this.documents.values()) {
      try {
        const content = await driveService.readFile(doc.driveFileId, "");
        doc.content = content;
        doc.contentPreview = content.slice(0, 500);
        doc.keywords = this.extractKeywords(content);
        doc.lastSyncedAt = new Date().toISOString();
        refreshed++;
      } catch {
        // File may have been deleted or permissions changed
      }
    }
    this.saveToFile();
    return refreshed;
  }

  startPeriodicSync(driveService: GoogleDriveService, intervalMs = 3600000): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      this.refreshIndex(driveService).catch(console.error);
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  getAll(): IndexedDocument[] {
    return Array.from(this.documents.values());
  }

  getById(id: string): IndexedDocument | undefined {
    return this.documents.get(id);
  }

  getByDriveFileId(driveFileId: string): IndexedDocument | undefined {
    for (const doc of this.documents.values()) {
      if (doc.driveFileId === driveFileId) return doc;
    }
    return undefined;
  }

  getClients(): string[] {
    const clients = new Set<string>();
    for (const doc of this.documents.values()) {
      if (doc.client) clients.add(doc.client);
    }
    return Array.from(clients).sort();
  }

  getByClient(client: string): IndexedDocument[] {
    return this.getAll().filter((d) => d.client === client);
  }

  getByType(type: "sop" | "client-doc"): IndexedDocument[] {
    return this.getAll().filter((d) => d.type === type);
  }

  saveToFile(): void {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = Array.from(this.documents.entries());
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
  }

  loadFromFile(): void {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        const raw = fs.readFileSync(CACHE_PATH, "utf-8");
        const entries: [string, IndexedDocument][] = JSON.parse(raw);
        this.documents = new Map(entries);
      }
    } catch {
      this.documents = new Map();
    }
  }

  private buildDocument(file: DriveFile, filePath: string, content: string): IndexedDocument {
    const pathParts = filePath.split("/");
    const client = pathParts.length > 1 ? pathParts[0] : null;
    const isSop = pathParts.some((p) => p.toLowerCase().includes("sop"));

    return {
      id: `doc_${file.id}`,
      driveFileId: file.id,
      name: file.name,
      path: filePath,
      client,
      type: isSop ? "sop" : "client-doc",
      content,
      contentPreview: content.slice(0, 500),
      keywords: this.extractKeywords(content),
      lastSyncedAt: new Date().toISOString(),
    };
  }

  private extractKeywords(content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);

    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    // Return top 20 keywords by frequency
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }
}
