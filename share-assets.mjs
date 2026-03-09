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

const files = [
  { id: "1UeRV2nhfMbKqn5H0Yo_2K_L2c01I7nk2", name: "Logo main" },
  { id: "1pCOglN0wEmiTHAoRUFZWIyyu4c4O5Gec", name: "Dr Kat photo 1" },
  { id: "1Hcith6v7qXpuZ_7U9ar-rNKduhRgsRRv", name: "Dr Kat photo 2" },
  { id: "1K1gyfGUR5gYUu2kMOJS8cUA5Co2lwE7l", name: "Logo with text" },
  { id: "1ZEbF0KUhF_BI6wKsfrPrHd8cZH2tYKRl", name: "Logo square" },
];

for (const f of files) {
  try {
    await drive.permissions.create({
      fileId: f.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
    // Get the webContentLink (direct download)
    const fileInfo = await drive.files.get({
      fileId: f.id,
      fields: "webContentLink, webViewLink",
    });
    console.log(`${f.name}: ${fileInfo.data.webContentLink}`);
  } catch (err) {
    console.error(`Error sharing ${f.name}: ${err.message}`);
  }
}
