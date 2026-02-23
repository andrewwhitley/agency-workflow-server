/**
 * Google Service Account Authentication
 * Uses a JSON key file or env var — no OAuth login flow needed.
 * Share specific Drive folders with the service account email to grant access.
 */

import { JWT } from "google-auth-library";
import * as fs from "fs";

export class GoogleAuthService {
  private jwtClient: JWT | null = null;
  private serviceEmail: string = "";

  constructor() {
    this.initServiceAccount();
  }

  private initServiceAccount(): void {
    let credentials: { client_email: string; private_key: string } | null = null;

    const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (filePath && fs.existsSync(filePath)) {
      credentials = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    } else if (jsonStr) {
      credentials = JSON.parse(jsonStr);
    }

    if (credentials) {
      const subject = process.env.GOOGLE_IMPERSONATE_EMAIL || undefined;
      this.jwtClient = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [
          "https://www.googleapis.com/auth/drive.readonly",
          "https://www.googleapis.com/auth/drive.file",
        ],
        subject,
      });
      this.serviceEmail = credentials.client_email;
    }
  }

  getClient(): JWT {
    if (!this.jwtClient) throw new Error("Service account not configured");
    return this.jwtClient;
  }

  isAuthenticated(): boolean {
    return this.jwtClient !== null;
  }

  getServiceEmail(): string {
    return this.serviceEmail;
  }
}
