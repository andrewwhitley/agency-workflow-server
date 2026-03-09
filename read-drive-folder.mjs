import { JWT } from "google-auth-library";
import { google } from "googleapis";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: "/home/andrewwhitley/agency-workflow-server/.env" });

const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH, "utf-8"));
const subject = process.env.GOOGLE_IMPERSONATE_EMAIL || undefined;

const jwtClient = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/drive"],
  subject,
});

const drive = google.drive({ version: "v3", auth: jwtClient });

// Extract folder ID from URL
const folderId = process.argv[2] || "17ijgZuuDx4BK3n6TYSzHrVAga4E8amYU";

// List all files in the folder recursively
async function listFolder(id, prefix = "") {
  // List files
  const filesRes = await drive.files.list({
    q: `'${id}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, webViewLink, webContentLink)",
    orderBy: "name",
    pageSize: 100,
  });
  
  for (const f of filesRes.data.files || []) {
    const path = prefix ? `${prefix}/${f.name}` : f.name;
    console.log(`${f.mimeType} | ${path} | ${f.id} | ${f.webViewLink || ''} | size: ${f.size || 'n/a'}`);
    
    // Recurse into subfolders
    if (f.mimeType === "application/vnd.google-apps.folder") {
      await listFolder(f.id, path);
    }
  }
}

await listFolder(folderId);
