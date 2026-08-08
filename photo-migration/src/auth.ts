/**
 * OAuth handling for Drive + Photos.
 *
 * Runs the installed-app (desktop) OAuth flow the first time via
 * @google-cloud/local-auth, caches the refresh token to token.json, and
 * reloads it thereafter. Returns a Drive API client plus the OAuth client
 * (used to mint access tokens for the Photos upload calls).
 */
import { authenticate } from "@google-cloud/local-auth";
import * as fs from "fs";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { drive_v3 } from "googleapis";
import * as config from "./config";

export interface Clients {
  drive: drive_v3.Drive;
  oauth: OAuth2Client;
}

function loadSavedCredentials(): OAuth2Client | null {
  if (!fs.existsSync(config.TOKEN_FILE)) return null;
  const content = JSON.parse(fs.readFileSync(config.TOKEN_FILE, "utf-8"));
  return google.auth.fromJSON(content) as unknown as OAuth2Client;
}

function saveCredentials(client: OAuth2Client): void {
  const keys = JSON.parse(fs.readFileSync(config.CLIENT_SECRET, "utf-8"));
  const key = keys.installed || keys.web;
  fs.writeFileSync(
    config.TOKEN_FILE,
    JSON.stringify({
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    })
  );
}

// Test seam: when set, getClients() returns these instead of running OAuth.
let testClients: Clients | null = null;
export function _setTestClients(clients: Clients | null): void {
  testClients = clients;
}

export async function getClients(): Promise<Clients> {
  if (testClients) return testClients;
  if (!fs.existsSync(config.CLIENT_SECRET)) {
    throw new Error(
      `OAuth client secret not found at '${config.CLIENT_SECRET}'. Download it from the ` +
        "Google Cloud Console (OAuth client of type 'Desktop app') and save it there."
    );
  }

  let client = loadSavedCredentials();
  if (!client) {
    client = (await authenticate({
      scopes: config.SCOPES,
      keyfilePath: config.CLIENT_SECRET,
    })) as unknown as OAuth2Client;
    if (client.credentials.refresh_token) saveCredentials(client);
  }

  const drive = google.drive({ version: "v3", auth: client });
  return { drive, oauth: client };
}
