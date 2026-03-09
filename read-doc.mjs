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
  scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"],
  subject,
});

const docs = google.docs({ version: "v1", auth: jwtClient });
const docId = "1QZgDFqWcdbPOdu-CYlGP9huFW3WFxy8G_VUsBBuOhy8";

const doc = await docs.documents.get({ documentId: docId });

// Extract text content with paragraph info
const body = doc.data.body?.content || [];
const paragraphs = [];
for (const element of body) {
  if (!element.paragraph) continue;
  const para = element.paragraph;
  const startIndex = element.startIndex || 0;
  const endIndex = element.endIndex || 0;
  const style = para.paragraphStyle?.namedStyleType || "NORMAL_TEXT";
  const isBullet = !!para.bullet;
  
  let fullText = "";
  for (const el of para.elements || []) {
    if (el.textRun) fullText += el.textRun.content || "";
  }
  
  paragraphs.push({ startIndex, endIndex, text: fullText, style, isBullet });
}

console.log("Title:", doc.data.title);
console.log("Total length:", doc.data.body?.content?.slice(-1)?.[0]?.endIndex || 0);
console.log("\n--- PARAGRAPHS ---\n");
for (const p of paragraphs) {
  const tag = p.isBullet ? "[BULLET] " : "";
  console.log(`[${p.startIndex}-${p.endIndex}] ${p.style} ${tag}| ${p.text.trim()}`);
}
