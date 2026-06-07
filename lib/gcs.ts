import { Storage } from "@google-cloud/storage";

function getStorage() {
  // Prefer inline JSON credentials (avoids file permission issues in Docker)
  if (process.env.GCS_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GCS_CREDENTIALS_JSON);
      return new Storage({ credentials });
    } catch {
      throw new Error("GCS_CREDENTIALS_JSON is not valid JSON");
    }
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

export async function listGCSFiles(): Promise<{ name: string; url: string }[]> {
  const [files] = await getStorage().bucket(BUCKET).getFiles({ prefix: "library/" });
  return files.map((f) => ({
    name: f.name,
    url: `https://storage.googleapis.com/${BUCKET}/${f.name}`,
  }));
}

export async function deleteGCSFile(name: string): Promise<void> {
  await getStorage().bucket(BUCKET).file(name).delete();
}
