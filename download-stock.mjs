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
async function downloadAndShare(fileId, outPath) {
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  fs.writeFileSync(outPath, Buffer.from(res.data));
  console.log(`Downloaded: ${outPath} (${Buffer.from(res.data).length} bytes)`);
  try {
    await drive.permissions.create({ fileId, requestBody: { role: "reader", type: "anyone" } });
  } catch(e) {}
}
const files = [
  { id: "1PWaPtOAE6OHHVSkgKlbGsHM5hReBShQm", out: "/tmp/stock-scientific.jpg" },
  { id: "1Exqzpd1l7C75-DSL5JoHOFllP2t0OAO-", out: "/tmp/stock-gut.jpg" },
  { id: "1Ompl0yWirRh_JqfhKIZwNuiLMbAnyBqE", out: "/tmp/stock-silhouette.png" },
  { id: "1t7o0pXa6NNUnzQBfPexFg_yp_ivVnB5i", out: "/tmp/stock-nutrition.png" },
  { id: "1Wii7Xw7Www-QtNF0m_pl-X4vPd-AKuHm", out: "/tmp/stock-sleep.png" },
];
for (const f of files) {
  await downloadAndShare(f.id, f.out);
}
console.log("All done!");
