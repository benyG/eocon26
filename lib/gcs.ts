/// <reference types="node" />
import { Storage } from "@google-cloud/storage";

function normalizePrivateKey(key: string): string {
  // Service account JSON private keys use literal \n sequences when stored
  // in environment variables. Some systems double-escape them as \\n.
  // Normalize all variants to real newlines so the crypto module can parse the PEM.
  return key
    .replace(/\\\\n/g, "\n") // double-escaped (\\n → \n → newline)
    .replace(/\\n/g, "\n")   // single-escaped (\n → newline)
    .replace(/\\r/g, "")     // strip any \r
    .replace(/\r\n/g, "\n")  // normalize CRLF → LF
    .trim();
}

function getStorage() {
  // Prefer inline JSON credentials (avoids file permission issues in Docker)
  if (process.env.GCS_CREDENTIALS_JSON) {
    let raw = process.env.GCS_CREDENTIALS_JSON.trim();
    // Handle the case where the env var is accidentally double-stringified
    if (raw.startsWith('"') && raw.endsWith('"')) {
      try { raw = JSON.parse(raw); } catch { /* not double-stringified */ }
    }
    let credentials: { private_key?: string; client_email?: string; [k: string]: unknown };
    try {
      credentials = JSON.parse(raw);
    } catch {
      throw new Error(
        "GCS_CREDENTIALS_JSON is not valid JSON. Make sure newlines inside the JSON are " +
        "escaped as \\n and the whole value is a single line.",
      );
    }
    if (!credentials.private_key) {
      throw new Error(
        "GCS_CREDENTIALS_JSON is missing the 'private_key' field. " +
        "Ensure you are using a Service Account key (not a user credential).",
      );
    }
    if (!credentials.client_email) {
      throw new Error("GCS_CREDENTIALS_JSON is missing the 'client_email' field.");
    }
    credentials.private_key = normalizePrivateKey(credentials.private_key);
    if (!credentials.private_key.includes("-----BEGIN")) {
      throw new Error(
        "GCS_CREDENTIALS_JSON private_key does not look like a valid PEM key after normalization. " +
        "Check for extra escaping or encoding in the env var.",
      );
    }
    return new Storage({ credentials });
  }
  // Fall back to key file path (must point to a service account JSON file)
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "No GCS credentials found. Set GCS_CREDENTIALS_JSON (inline service account JSON) " +
      "or GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON file).",
    );
  }
  return new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
}

const BUCKET = process.env.GCS_BUCKET_NAME || "eocon-assets";

export async function uploadToGCS(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const bucket = getStorage().bucket(BUCKET);
  const file = bucket.file(filename);
  await file.save(buffer, { contentType, resumable: false });
  // Do NOT call makePublic() — incompatible with uniform bucket-level access.
  // Make the bucket publicly readable once via GCS IAM:
  //   gcloud storage buckets add-iam-policy-binding gs://BUCKET \
  //     --member=allUsers --role=roles/storage.objectViewer
  return `https://storage.googleapis.com/${BUCKET}/${filename}`;
}

export async function listGCSFiles(): Promise<{ name: string; url: string; size: number; updated: string }[]> {
  // List every object in the bucket (all folders: library/, sponsors/, team/,
  // speakers/, uploads/, …) and keep only images, read straight from GCS.
  try {
    const [files] = await getStorage().bucket(BUCKET).getFiles();
    const IMG_RE = /\.(jpe?g|png|webp|gif|svg)$/i;
    return files
      .filter((f) => IMG_RE.test(f.name))
      .map((f) => ({
        name: f.name,
        url: `https://storage.googleapis.com/${BUCKET}/${f.name}`,
        size: Number(f.metadata?.size ?? 0),
        updated: (f.metadata?.updated as string) ?? "",
      }))
      .sort((a, b) => (a.updated < b.updated ? 1 : -1));
  } catch (e) {
    console.error("[GCS listGCSFiles]", e);
    return [];
  }
}

export async function deleteGCSFile(name: string): Promise<void> {
  await getStorage().bucket(BUCKET).file(name).delete();
}
