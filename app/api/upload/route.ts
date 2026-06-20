export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { uploadToGCS } from "@/lib/gcs";
import { getCurrentPermissions } from "@/lib/adminPermissions";
import { checkRateLimit, getIp } from "@/lib/rateLimit";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  if (!(await getCurrentPermissions())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await checkRateLimit(`upload:${getIp(req)}`, 40, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop d'uploads, réessayez plus tard." }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop grand (max 8 Mo)" }, { status: 400 });
  }

  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(rawExt)) {
    return NextResponse.json({ error: "Extension non autorisée" }, { status: 400 });
  }

  // Sanitize folder: alphanumeric + dash/underscore only, no path traversal
  const rawFolder = (formData.get("folder") as string) || "uploads";
  const folder = rawFolder.replace(/[^a-z0-9_-]/g, "").slice(0, 32) || "uploads";

  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${rawExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const url = await uploadToGCS(buffer, filename, file.type);
  return NextResponse.json({ url });
}
