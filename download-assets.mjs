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

async function downloadFile(fileId, outPath) {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  fs.writeFileSync(outPath, Buffer.from(res.data));
  console.log(`Downloaded: ${outPath} (${Buffer.from(res.data).length} bytes)`);
}

// Color codes
await downloadFile("1BuEGdTzkgTBxtZB7ttwgmJaDBBEYCfvj", "/tmp/color-codes.png");
// Main logo (largest PNG version)
await downloadFile("1UeRV2nhfMbKqn5H0Yo_2K_L2c01I7nk2", "/tmp/logo-main.png");
// Square logo (600x600 PNG)
await downloadFile("1ZEbF0KUhF_BI6wKsfrPrHd8cZH2tYKRl", "/tmp/logo-square.png");
// Dr. Kat photo (original)
await downloadFile("1pCOglN0wEmiTHAoRUFZWIyyu4c4O5Gec", "/tmp/dr-kat.jpg");
// Dr. Kat photo (shared link)
await downloadFile("1Hcith6v7qXpuZ_7U9ar-rNKduhRgsRRv", "/tmp/dr-kat-2.jpg");
// Banner (600x128)
await downloadFile("17n8xwlc85UnwUISdTPZF1Mwqnvs-e4-i", "/tmp/banner.jpg");

console.log("All assets downloaded!");
