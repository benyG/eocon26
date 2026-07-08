// Instagram Graph API — Business Account posting
// Required env vars:
//   META_ACCESS_TOKEN           — System User token with instagram_content_publish permission
//   INSTAGRAM_BUSINESS_ACCOUNT_ID — Numeric IG Business Account ID

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function getCredentials() {
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!accountId || !token) {
    throw new Error("Instagram credentials missing: INSTAGRAM_BUSINESS_ACCOUNT_ID, META_ACCESS_TOKEN");
  }
  return { accountId, token };
}

export interface InstagramPostResult {
  id: string;
  url: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Poll a media container until Instagram has finished processing it. Publishing
// before the container is FINISHED yields error 9007 / subcode 2207027
// ("Media ID is not available ... please wait for a moment").
async function waitForContainerReady(creationId: string, token: string): Promise<void> {
  const MAX_ATTEMPTS = 12; // ~30s total (image containers usually finish in a few seconds)
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(
      `${GRAPH_BASE}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
    );
    if (res.ok) {
      const { status_code: statusCode, status } = (await res.json()) as {
        status_code?: string;
        status?: string;
      };
      if (statusCode === "FINISHED") return;
      if (statusCode === "ERROR" || statusCode === "EXPIRED") {
        throw new Error(`Instagram media container ${statusCode}${status ? `: ${status}` : ""}`);
      }
      // IN_PROGRESS (or unknown) → keep waiting
    }
    await sleep(2500);
  }
  throw new Error("Instagram media container not ready after 30s (still processing)");
}

export async function publishInstagramPost(caption: string, imageUrl: string): Promise<InstagramPostResult> {
  const { accountId, token } = getCredentials();

  // Step 1 — Create media container (image required by Instagram API)
  const containerRes = await fetch(`${GRAPH_BASE}/${accountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: token,
    }),
  });
  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`Instagram media container error ${containerRes.status}: ${err}`);
  }
  const { id: creationId } = await containerRes.json() as { id: string };

  // Step 2 — Wait for the container to finish processing before publishing.
  await waitForContainerReady(creationId, token);

  // Step 3 — Publish the container
  const publishRes = await fetch(`${GRAPH_BASE}/${accountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: token,
    }),
  });
  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram media publish error ${publishRes.status}: ${err}`);
  }
  const { id: mediaId } = await publishRes.json() as { id: string };

  // Step 4 — Resolve the real public permalink (the numeric media id is NOT a
  // valid /p/<shortcode>/ URL). Fall back gracefully if the lookup fails.
  let url = `https://www.instagram.com/`;
  try {
    const permaRes = await fetch(
      `${GRAPH_BASE}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`,
    );
    if (permaRes.ok) {
      const { permalink } = (await permaRes.json()) as { permalink?: string };
      if (permalink) url = permalink;
    }
  } catch {
    /* keep fallback url */
  }

  return { id: mediaId, url };
}
