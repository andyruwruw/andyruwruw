/**
 * Google Photos upload (two-step contract):
 *   1. POST raw bytes to the uploads endpoint -> receive an upload token.
 *   2. mediaItems:batchCreate with that token -> the item appears in the
 *      user's library.
 *
 * Post-2025 the app can only later see items IT created -- irrelevant here,
 * since we only ever upload.
 */
import axios from "axios";
import type { OAuth2Client } from "google-auth-library";
import * as config from "./config";

export interface UploadResult {
  ok: boolean;
  mediaItemId?: string;
  error?: string;
}

async function accessToken(oauth: OAuth2Client): Promise<string> {
  const res = await oauth.getAccessToken();
  if (!res.token) throw new Error("could not obtain an access token");
  return res.token;
}

async function uploadBytes(token: string, data: Buffer, filename: string): Promise<string> {
  const res = await axios.post(config.PHOTOS_UPLOAD_URL, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-Goog-Upload-Content-Type": "application/octet-stream",
      "X-Goog-Upload-Protocol": "raw",
      "X-Goog-Upload-File-Name": filename,
    },
    // Bytes can be large; don't let axios cap them.
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  const uploadToken = String(res.data).trim();
  if (!uploadToken) throw new Error("Photos upload returned an empty upload token");
  return uploadToken;
}

export async function upload(
  oauth: OAuth2Client,
  data: Buffer,
  filename: string,
  description = ""
): Promise<UploadResult> {
  try {
    const token = await accessToken(oauth);
    const uploadToken = await uploadBytes(token, data, filename);

    const res = await axios.post(
      config.PHOTOS_BATCH_CREATE_URL,
      {
        newMediaItems: [
          {
            description,
            simpleMediaItem: { fileName: filename, uploadToken },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    const results = res.data?.newMediaItemResults || [];
    if (results.length === 0) return { ok: false, error: "batchCreate returned no results" };

    const status = results[0].status || {};
    if (status.code && status.code !== 0) {
      return { ok: false, error: status.message || "unknown error" };
    }
    return { ok: true, mediaItemId: results[0].mediaItem?.id };
  } catch (err: unknown) {
    const e = err as { response?: { data?: unknown }; message?: string };
    const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    return { ok: false, error: detail || "upload failed" };
  }
}
