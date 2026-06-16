import { Storage } from "@google-cloud/storage";

function getStorage() {
  // Prefer inline JSON credentials (avoids file permission issues in Docker)
  if (process.env.GCS_CREDENTIALS_JSON) {
    let credentials: { private_key?: string; [k: string]: unknown };
    try {
      credentials = JSON.parse(process.env.GCS_CREDENTIALS_JSON);
    } catch {
      throw new Error("GCS_CREDENTIALS_JSON is not valid JSON");
    }
    // When the JSON is stored in an env var, the PEM newlines are often escaped
    // as literal "\n". Restore real newlines, otherwise JWT signing throws
    // "key must be a string, a buffer or an object".
    if (typeof credentials.private_key === "string") {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }
    return new Storage({ credentials });
  }
  // Fall back to key file path
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
