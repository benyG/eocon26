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

  // Step 2 — Publish the container
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

  return {
    id: mediaId,
    url: `https://www.instagram.com/p/${mediaId}/`,
  };
}
