/**
 * Google Drive Service
 * List folders, read files, export Google Docs, handle PDFs and docx.
 */

import { google, drive_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

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

  constructor(authClient: OAuth2Client) {
    this.drive = google.drive({ version: "v3", auth: authClient });
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
}
