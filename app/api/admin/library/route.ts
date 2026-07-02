import { NextRequest, NextResponse } from "next/server";
import { listGCSFiles, deleteGCSFile, uploadToGCS } from "@/lib/gcs";
import { hasPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
const MAX_BYTES = 8 * 1024 * 1024;

export async function GET() {
  if (!(await hasPermission("library", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [gcsFiles, assets] = await Promise.all([
    listGCSFiles(),
    prisma.mediaAsset.findMany({ include: { category: true } }),
  ]);

  const assetMap = new Map(assets.map(a => [a.gcsName, a]));

  const files = gcsFiles.map(f => {
    const asset = assetMap.get(f.name);
    return {
      ...f,
      categoryId: asset?.categoryId ?? null,
      categoryName: asset?.category?.name ?? null,
      categorySlug: asset?.category?.slug ?? null,
    };
  });

  return NextResponse.json(files);
}

export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("library", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, categoryId } = await req.json() as { name: string; categoryId: number | null };
  if (!name || typeof name !== "string") return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const asset = await prisma.mediaAsset.upsert({
    where: { gcsName: name },
    update: { categoryId: categoryId ?? null },
    create: { gcsName: name, url: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME || "eocon-assets"}/${name}`, categoryId: categoryId ?? null },
    include: { category: true },
  });

  return NextResponse.json(asset);
}

export async function DELETE(req: NextRequest) {
  if (!(await hasPermission("library", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.includes("..")) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  await deleteGCSFile(name);
  await prisma.mediaAsset.deleteMany({ where: { gcsName: name } }).catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("library", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const categoryId = formData.get("categoryId");
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED_MIME.includes(file.type)) return NextResponse.json({ error: "Type non autorisé" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop grand (max 8 Mo)" }, { status: 400 });
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(rawExt)) return NextResponse.json({ error: "Extension non autorisée" }, { status: 400 });
  const filename = `library/${Date.now()}-${Math.random().toString(36).slice(2)}.${rawExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToGCS(buffer, filename, file.type);

  const catId = categoryId && categoryId !== "null" ? parseInt(String(categoryId), 10) : null;
  await prisma.mediaAsset.create({
    data: { gcsName: filename, url, size: file.size, categoryId: catId || null },
  });

  return NextResponse.json({ url, name: filename });
}
