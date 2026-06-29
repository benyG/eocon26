// Apollo.io API — correct base URL (note: /api/v1, not /v1).
// Auth: x-api-key request header. No api_key in body needed.
const APOLLO_BASE = "https://api.apollo.io/api/v1";

function getKey(): string {
  const k = process.env.APOLLO_API_KEY;
  if (!k) throw new Error("APOLLO_API_KEY env var is not set");
  return k;
}

export interface ApolloOrg {
  id: string;
  name: string;
  website_url?: string;
  industry?: string;
  estimated_num_employees?: number;
  city?: string;
  country?: string;
  short_description?: string;
  linkedin_url?: string;
}

export interface ApolloContact {
  id: string;
  name: string;
  title?: string;
  email?: string;
  linkedin_url?: string;
  organization_name?: string;
}

async function apolloPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = getKey();
  let res: Response;
  try {
    res = await fetch(`${APOLLO_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": key,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(`Apollo API: impossible de joindre api.apollo.io (erreur réseau: ${err instanceof Error ? err.message : String(err)}). Vérifiez que le serveur a accès à internet.`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Apollo API: clé invalide ou quota dépassé (HTTP ${res.status})`);
  }
  if (res.status === 429) {
    throw new Error("Apollo API: limite de requêtes atteinte (rate limit). Réessayez dans quelques minutes.");
  }
  if (res.status === 422) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apollo API: paramètres invalides (422): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apollo API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function searchOrganizations(params: {
  q_organization_keyword_tags?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  page?: number;
  per_page?: number;
}): Promise<ApolloOrg[]> {
  const data = await apolloPost<{ organizations?: ApolloOrg[]; accounts?: ApolloOrg[] }>(
    "/mixed_companies/search",
    { ...params, per_page: params.per_page || 10 },
  );
  return data.organizations || data.accounts || [];
}

export async function searchPeople(params: {
  q_organization_name?: string;
  organization_ids?: string[];
  person_titles?: string[];
  person_locations?: string[];
  page?: number;
  per_page?: number;
}): Promise<ApolloContact[]> {
  const data = await apolloPost<{ people?: ApolloContact[] }>(
    "/mixed_people/api_search",
    { ...params, per_page: params.per_page || 5 },
  );
  return data.people || [];
}

export async function enrichOrganization(domain: string): Promise<ApolloOrg | null> {
  const res = await fetch(
    `${APOLLO_BASE}/organizations/enrich?domain=${encodeURIComponent(domain)}`,
    { headers: { "x-api-key": getKey(), "Cache-Control": "no-cache" } },
  );
  if (!res.ok) return null;
  const data = await res.json() as { organization?: ApolloOrg };
  return data.organization ?? null;
}
