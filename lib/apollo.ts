const APOLLO_BASE = "https://api.apollo.io/v1";

function getKey(): string {
  const k = process.env.APOLLO_API_KEY;
  if (!k) throw new Error("APOLLO_API_KEY env var is required");
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

export async function searchOrganizations(params: {
  q_organization_keyword_tags?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  page?: number;
  per_page?: number;
}): Promise<ApolloOrg[]> {
  const res = await fetch(`${APOLLO_BASE}/mixed_companies/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": getKey(),
    },
    body: JSON.stringify({ ...params, per_page: params.per_page || 10 }),
  });
  if (!res.ok) throw new Error(`Apollo API error: ${res.status}`);
  const data = await res.json();
  return (data.organizations || data.accounts || []) as ApolloOrg[];
}

export async function searchPeople(params: {
  q_organization_name?: string;
  organization_ids?: string[];
  person_titles?: string[];
  person_locations?: string[];
  page?: number;
  per_page?: number;
}): Promise<ApolloContact[]> {
  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": getKey(),
    },
    body: JSON.stringify({ ...params, per_page: params.per_page || 5 }),
  });
  if (!res.ok) throw new Error(`Apollo API error: ${res.status}`);
  const data = await res.json();
  return (data.people || []) as ApolloContact[];
}

export async function enrichOrganization(domain: string): Promise<ApolloOrg | null> {
  const res = await fetch(`${APOLLO_BASE}/organizations/enrich?domain=${encodeURIComponent(domain)}`, {
    headers: { "X-Api-Key": getKey(), "Cache-Control": "no-cache" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.organization || null) as ApolloOrg | null;
}
