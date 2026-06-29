import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("prospection", "read")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const key = process.env.APOLLO_API_KEY;
  const checks: Record<string, unknown> = {};

  // 1. Env var
  checks.api_key_set = !!key;
  checks.api_key_prefix = key ? `${key.slice(0, 4)}…${key.slice(-4)}` : null;

  // 2. DNS / connectivity
  const APOLLO_BASE = "https://api.apollo.io/api/v1";
  let reachable = false;
  let httpStatus: number | null = null;
  let responseBody = "";
  let errorMessage: string | null = null;
  let latencyMs: number | null = null;

  if (key) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${APOLLO_BASE}/mixed_companies/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": key,
        },
        body: JSON.stringify({ api_key: key, per_page: 1, q_organization_keyword_tags: ["technology"] }),
        cache: "no-store",
      });
      latencyMs = Date.now() - t0;
      httpStatus = res.status;
      reachable = true;
      responseBody = await res.text().catch(() => "");
      // Try to parse to confirm shape
      try {
        const json = JSON.parse(responseBody) as Record<string, unknown>;
        checks.response_keys = Object.keys(json).slice(0, 10);
        checks.organizations_count = Array.isArray(json.organizations) ? json.organizations.length : "n/a";
        // Expose actual error details from Apollo
        if (json.error) checks.apollo_error = json.error;
        if (json.error_code) checks.apollo_error_code = json.error_code;
        if (json.message) checks.apollo_message = json.message;
      } catch {
        checks.response_preview = responseBody.slice(0, 300);
      }
    } catch (err) {
      latencyMs = Date.now() - t0;
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  checks.reachable = reachable;
  checks.http_status = httpStatus;
  checks.latency_ms = latencyMs;
  checks.network_error = errorMessage;

  // 3. Interpret result
  let verdict = "";
  if (!key) {
    verdict = "❌ APOLLO_API_KEY manquante — ajoutez-la dans vos variables d'environnement.";
  } else if (!reachable) {
    verdict = `❌ Impossible de joindre api.apollo.io depuis ce serveur. Erreur réseau: ${errorMessage}`;
  } else if (httpStatus === 401 || httpStatus === 403) {
    verdict = "❌ Clé API rejetée par Apollo (401/403). Vérifiez la valeur de APOLLO_API_KEY.";
  } else if (httpStatus === 429) {
    verdict = "⚠️ Rate limit Apollo (429). Quota mensuel ou minute atteint.";
  } else if (httpStatus === 200) {
    verdict = "✅ Apollo API opérationnelle. Clé valide, réseau OK.";
  } else {
    verdict = `⚠️ Réponse inattendue HTTP ${httpStatus}. Voir response_preview.`;
  }

  checks.verdict = verdict;

  return NextResponse.json(checks, {
    headers: { "Cache-Control": "no-store" },
  });
}
