import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { DOC_TYPES } from "@/lib/documentTemplates";

export const dynamic = "force-dynamic";

// Registry of journey documents (metadata for the Documents & Contracts page).
export async function GET() {
  if (!(await hasPermission("documents", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json([...DOC_TYPES].sort((a, b) => a.order - b.order));
}
