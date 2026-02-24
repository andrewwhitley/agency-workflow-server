/**
 * Google Drive Service
 * List folders, read files, export Google Docs, handle PDFs and docx.
 */

import { google, drive_v3, docs_v1, sheets_v4 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// ── Helper functions ──────────────────────────────────

/** Parse Google URLs (/d/XXXXX/, ?id=XXXXX) into IDs, or pass through raw IDs */
export function extractGoogleId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  // Match /d/XXXXX/ pattern (Docs, Sheets, Slides URLs)
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch) return dMatch[1];
  // Match ?id=XXXXX or &id=XXXXX pattern (Drive URLs)
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  // Match /folders/XXXXX pattern
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  // Assume it's already an ID
  return trimmed;
}

/** Convert "#FF0000" to {red: 1, green: 0, blue: 0} for Google Docs API */
function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  const clean = hex.replace("#", "");
  return {
    red: parseInt(clean.substring(0, 2), 16) / 255,
    green: parseInt(clean.substring(2, 4), 16) / 255,
    blue: parseInt(clean.substring(4, 6), 16) / 255,
  };
}

// ── Types for doc reading/editing ─────────────────────

export interface TextRunInfo {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  foregroundColor?: string;
  link?: string;
}

export interface DocParagraph {
  startIndex: number;
  endIndex: number;
  text: string;
  style: string; // NORMAL_TEXT, HEADING_1, etc.
  isBullet: boolean;
  textRuns: TextRunInfo[];
}

export interface DocStructure {
  documentId: string;
  title: string;
  paragraphs: DocParagraph[];
  totalLength: number;
}

export interface SheetData {
  spreadsheetId: string;
  title: string;
  sheets: { title: string; index: number; rowCount: number; columnCount: number }[];
  values: string[][];
  range: string;
}

export interface FormatOperation {
  type:
    | "heading"
    | "bold"
    | "italic"
    | "underline"
    | "fontSize"
    | "fontColor"
    | "backgroundColor"
    | "fontFamily"
    | "alignment"
    | "bullets"
    | "removeBullets"
    | "indent";
  startIndex: number;
  endIndex: number;
  // Type-specific fields
  level?: number; // heading level 1-6, or indent level
  size?: number; // font size in pt
  color?: string; // hex color like "#FF0000"
  family?: string; // font family name
  align?: "START" | "CENTER" | "END" | "JUSTIFIED";
  bulletPreset?: string; // bullet preset name
}

export interface DocEdit {
  type: "replace_text" | "insert_text" | "delete_range" | "find_replace";
  // For replace_text and delete_range
  startIndex?: number;
  endIndex?: number;
  // For insert_text
  index?: number;
  // Text content
  text?: string;
  // For find_replace
  find?: string;
  replaceWith?: string;
  matchCase?: boolean;
}

// ── Core types ────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
  modifiedTime: string;
}

export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private authClient: OAuth2Client;

  constructor(authClient: OAuth2Client) {
    this.drive = google.drive({ version: "v3", auth: authClient });
    this.authClient = authClient;
  }

  async listFolders(parentId?: string): Promise<DriveFolder[]> {
    const query = parentId
      ? `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      : `mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`;

    const res = await this.drive.files.list({
      q: query,
      fields: "files(id, name, modifiedTime)",
      orderBy: "name",
      pageSize: 100,
    });

    return (res.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      modifiedTime: f.modifiedTime!,
    }));
  }

  async listFiles(folderId: string): Promise<DriveFile[]> {
    const res = await this.drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name, mimeType, modifiedTime, size, parents)",
      orderBy: "name",
      pageSize: 200,
    });

    return (res.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      modifiedTime: f.modifiedTime!,
      size: f.size || undefined,
      parents: f.parents || undefined,
    }));
  }

  async readFile(fileId: string, mimeType: string): Promise<string> {
    // Google Docs → export as plain text
    if (mimeType === "application/vnd.google-apps.document") {
      const res = await this.drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" }
      );
      return String(res.data);
    }

    // Google Sheets → export as CSV
    if (mimeType === "application/vnd.google-apps.spreadsheet") {
      const res = await this.drive.files.export(
        { fileId, mimeType: "text/csv" },
        { responseType: "text" }
      );
      return String(res.data);
    }

    // Binary files → download
    const res = await this.drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);

    // PDF
    if (mimeType === "application/pdf") {
      const pdf = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await pdf.getText();
      return textResult.text;
    }

    // Word .docx
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // Plain text, markdown, etc.
    return buffer.toString("utf-8");
  }

  async walkFolder(
    folderId: string,
    pathPrefix = ""
  ): Promise<Array<{ file: DriveFile; path: string }>> {
    const results: Array<{ file: DriveFile; path: string }> = [];

    // Get files in this folder
    const files = await this.listFiles(folderId);
    for (const file of files) {
      results.push({ file, path: pathPrefix ? `${pathPrefix}/${file.name}` : file.name });
    }

    // Recurse into subfolders
    const folders = await this.listFolders(folderId);
    for (const folder of folders) {
      const subPath = pathPrefix ? `${pathPrefix}/${folder.name}` : folder.name;
      const subResults = await this.walkFolder(folder.id, subPath);
      results.push(...subResults);
    }

    return results;
  }

  // ── Write methods for The Oracle folder ──────────────

  async createGoogleDoc(
    title: string,
    folderId: string,
    content?: string
  ): Promise<{ id: string; url: string }> {
    const docs = google.docs({ version: "v1", auth: this.authClient });

    // Create an empty Doc via Drive (so we can set the parent folder)
    const fileRes = await this.drive.files.create({
      requestBody: {
        name: title,
        mimeType: "application/vnd.google-apps.document",
        parents: [folderId],
      },
      fields: "id, webViewLink",
    });

    const docId = fileRes.data.id!;
    const url = fileRes.data.webViewLink!;

    // If content provided, insert it
    if (content) {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content,
              },
            },
          ],
        },
      });
    }

    return { id: docId, url };
  }

  async createGoogleSheet(
    title: string,
    folderId: string,
    headers?: string[],
    data?: string[][]
  ): Promise<{ id: string; url: string }> {
    const sheets = google.sheets({ version: "v4", auth: this.authClient });

    // Create an empty Sheet via Drive (to set parent folder)
    const fileRes = await this.drive.files.create({
      requestBody: {
        name: title,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [folderId],
      },
      fields: "id, webViewLink",
    });

    const sheetId = fileRes.data.id!;
    const url = fileRes.data.webViewLink!;

    // Populate headers and data if provided
    const rows: string[][] = [];
    if (headers) rows.push(headers);
    if (data) rows.push(...data);

    if (rows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Sheet1!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows },
      });
    }

    return { id: sheetId, url };
  }

  async updateGoogleDoc(docId: string, content: string): Promise<void> {
    const docs = google.docs({ version: "v1", auth: this.authClient });

    // Get current document to find end index
    const doc = await docs.documents.get({ documentId: docId });
    const endIndex = doc.data.body?.content?.slice(-1)?.[0]?.endIndex || 1;

    const requests: docs_v1.Schema$Request[] = [];

    // Delete existing content (if any beyond the initial newline)
    if (endIndex > 2) {
      requests.push({
        deleteContentRange: {
          range: { startIndex: 1, endIndex: endIndex - 1 },
        },
      });
    }

    // Insert new content
    requests.push({
      insertText: {
        location: { index: 1 },
        text: content,
      },
    });

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    });
  }

  async appendToGoogleSheet(
    sheetId: string,
    rows: string[][]
  ): Promise<{ updatedRows: number }> {
    const sheets = google.sheets({ version: "v4", auth: this.authClient });

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });

    return { updatedRows: res.data.updates?.updatedRows || 0 };
  }

  // ── Read, edit & format methods ───────────────────────

  async readGoogleDoc(docId: string): Promise<DocStructure> {
    const id = extractGoogleId(docId);
    const docs = google.docs({ version: "v1", auth: this.authClient });
    const doc = await docs.documents.get({ documentId: id });

    const paragraphs: DocParagraph[] = [];
    const body = doc.data.body?.content || [];

    for (const element of body) {
      if (!element.paragraph) continue;

      const para = element.paragraph;
      const startIndex = element.startIndex || 0;
      const endIndex = element.endIndex || 0;
      const style = para.paragraphStyle?.namedStyleType || "NORMAL_TEXT";
      const isBullet = !!para.bullet;

      const textRuns: TextRunInfo[] = [];
      let fullText = "";

      for (const el of para.elements || []) {
        if (!el.textRun) continue;
        const tr = el.textRun;
        const text = tr.content || "";
        fullText += text;

        const run: TextRunInfo = { text };
        const ts = tr.textStyle;
        if (ts) {
          if (ts.bold) run.bold = true;
          if (ts.italic) run.italic = true;
          if (ts.underline) run.underline = true;
          if (ts.fontSize?.magnitude) run.fontSize = ts.fontSize.magnitude;
          if (ts.weightedFontFamily?.fontFamily) run.fontFamily = ts.weightedFontFamily.fontFamily;
          if (ts.foregroundColor?.color?.rgbColor) {
            const c = ts.foregroundColor.color.rgbColor;
            const r = Math.round((c.red || 0) * 255);
            const g = Math.round((c.green || 0) * 255);
            const b = Math.round((c.blue || 0) * 255);
            run.foregroundColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
          }
          if (ts.link?.url) run.link = ts.link.url;
        }
        textRuns.push(run);
      }

      paragraphs.push({ startIndex, endIndex, text: fullText, style, isBullet, textRuns });
    }

    return {
      documentId: id,
      title: doc.data.title || "",
      paragraphs,
      totalLength: doc.data.body?.content?.slice(-1)?.[0]?.endIndex || 0,
    };
  }

  async readGoogleSheet(sheetId: string, range?: string): Promise<SheetData> {
    const id = extractGoogleId(sheetId);
    const sheets = google.sheets({ version: "v4", auth: this.authClient });

    // Get spreadsheet metadata
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
    const sheetsMeta = (meta.data.sheets || []).map((s) => ({
      title: s.properties?.title || "Sheet1",
      index: s.properties?.index || 0,
      rowCount: s.properties?.gridProperties?.rowCount || 0,
      columnCount: s.properties?.gridProperties?.columnCount || 0,
    }));

    // Read values
    const readRange = range || `${sheetsMeta[0]?.title || "Sheet1"}`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: readRange,
    });

    return {
      spreadsheetId: id,
      title: meta.data.properties?.title || "",
      sheets: sheetsMeta,
      values: (res.data.values as string[][]) || [],
      range: res.data.range || readRange,
    };
  }

  async formatGoogleDoc(docId: string, operations: FormatOperation[]): Promise<{ applied: number }> {
    const id = extractGoogleId(docId);
    const docs = google.docs({ version: "v1", auth: this.authClient });

    const requests: docs_v1.Schema$Request[] = [];

    for (const op of operations) {
      const range = { startIndex: op.startIndex, endIndex: op.endIndex };

      switch (op.type) {
        case "heading":
          requests.push({
            updateParagraphStyle: {
              range,
              paragraphStyle: {
                namedStyleType: op.level && op.level >= 1 && op.level <= 6
                  ? `HEADING_${op.level}` as docs_v1.Schema$ParagraphStyle["namedStyleType"]
                  : "NORMAL_TEXT",
              },
              fields: "namedStyleType",
            },
          });
          break;

        case "bold":
          requests.push({
            updateTextStyle: {
              range,
              textStyle: { bold: true },
              fields: "bold",
            },
          });
          break;

        case "italic":
          requests.push({
            updateTextStyle: {
              range,
              textStyle: { italic: true },
              fields: "italic",
            },
          });
          break;

        case "underline":
          requests.push({
            updateTextStyle: {
              range,
              textStyle: { underline: true },
              fields: "underline",
            },
          });
          break;

        case "fontSize":
          if (op.size) {
            requests.push({
              updateTextStyle: {
                range,
                textStyle: { fontSize: { magnitude: op.size, unit: "PT" } },
                fields: "fontSize",
              },
            });
          }
          break;

        case "fontColor":
          if (op.color) {
            requests.push({
              updateTextStyle: {
                range,
                textStyle: { foregroundColor: { color: { rgbColor: hexToRgb(op.color) } } },
                fields: "foregroundColor",
              },
            });
          }
          break;

        case "backgroundColor":
          if (op.color) {
            requests.push({
              updateParagraphStyle: {
                range,
                paragraphStyle: { shading: { backgroundColor: { color: { rgbColor: hexToRgb(op.color) } } } },
                fields: "shading.backgroundColor",
              },
            });
          }
          break;

        case "fontFamily":
          if (op.family) {
            requests.push({
              updateTextStyle: {
                range,
                textStyle: { weightedFontFamily: { fontFamily: op.family } },
                fields: "weightedFontFamily",
              },
            });
          }
          break;

        case "alignment":
          if (op.align) {
            requests.push({
              updateParagraphStyle: {
                range,
                paragraphStyle: { alignment: op.align },
                fields: "alignment",
              },
            });
          }
          break;

        case "bullets":
          requests.push({
            createParagraphBullets: {
              range,
              bulletPreset: (op.bulletPreset as docs_v1.Schema$CreateParagraphBulletsRequest["bulletPreset"]) || "BULLET_DISC_CIRCLE_SQUARE",
            },
          });
          break;

        case "removeBullets":
          requests.push({
            deleteParagraphBullets: { range },
          });
          break;

        case "indent":
          if (op.level !== undefined) {
            requests.push({
              updateParagraphStyle: {
                range,
                paragraphStyle: { indentStart: { magnitude: op.level * 36, unit: "PT" } },
                fields: "indentStart",
              },
            });
          }
          break;
      }
    }

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: id,
        requestBody: { requests },
      });
    }

    return { applied: requests.length };
  }

  async editGoogleDocSection(docId: string, edits: DocEdit[]): Promise<{ applied: number }> {
    const id = extractGoogleId(docId);
    const docs = google.docs({ version: "v1", auth: this.authClient });

    const requests: docs_v1.Schema$Request[] = [];

    // Sort edits by reverse index to preserve positions
    const sorted = [...edits].sort((a, b) => {
      const aIdx = a.startIndex ?? a.index ?? 0;
      const bIdx = b.startIndex ?? b.index ?? 0;
      return bIdx - aIdx;
    });

    for (const edit of sorted) {
      switch (edit.type) {
        case "replace_text":
          if (edit.startIndex !== undefined && edit.endIndex !== undefined && edit.text !== undefined) {
            requests.push({
              deleteContentRange: {
                range: { startIndex: edit.startIndex, endIndex: edit.endIndex },
              },
            });
            requests.push({
              insertText: {
                location: { index: edit.startIndex },
                text: edit.text,
              },
            });
          }
          break;

        case "insert_text":
          if (edit.index !== undefined && edit.text !== undefined) {
            requests.push({
              insertText: {
                location: { index: edit.index },
                text: edit.text,
              },
            });
          }
          break;

        case "delete_range":
          if (edit.startIndex !== undefined && edit.endIndex !== undefined) {
            requests.push({
              deleteContentRange: {
                range: { startIndex: edit.startIndex, endIndex: edit.endIndex },
              },
            });
          }
          break;

        case "find_replace":
          if (edit.find !== undefined && edit.replaceWith !== undefined) {
            requests.push({
              replaceAllText: {
                containsText: {
                  text: edit.find,
                  matchCase: edit.matchCase ?? true,
                },
                replaceText: edit.replaceWith,
              },
            });
          }
          break;
      }
    }

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: id,
        requestBody: { requests },
      });
    }

    return { applied: requests.length };
  }
}
