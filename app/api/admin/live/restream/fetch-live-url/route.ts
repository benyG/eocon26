import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getValidRestreamToken, fetchActiveYoutubeEmbedUrl } from "@/lib/restream";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let token: string;
  try {
    token = await getValidRestreamToken();
  } catch (e) {
    return NextResponse.json(
      { error: `Restream non configuré : ${(e as Error).message}` },
      { status: 503 },
    );
  }

  const result = await fetchActiveYoutubeEmbedUrl(token);

  if (!result) {
    return NextResponse.json({
      liveUrl: null,
      message:
        "Aucun live YouTube actif détecté. Lancez le stream dans Restream Studio puis réessayez, ou créez un événement en avance.",
    });
  }

  return NextResponse.json({ liveUrl: result.url, source: result.source });
}
