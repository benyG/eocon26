// Facebook Graph API — Page publishing
// Required env vars:
//   FACEBOOK_PAGE_ID   — Numeric ID of the EOCON Facebook Page
//   META_ACCESS_TOKEN  — System User token (Business Manager) — auto-exchanged for a Page token
//   FACEBOOK_PAGE_ACCESS_TOKEN — (legacy) direct Page token, skips the exchange

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

// A System User token cannot post directly to a Page's /feed.
// We exchange it for the Page's own access_token first (one extra GET call).
// If the caller already supplies a Page token via FACEBOOK_PAGE_ACCESS_TOKEN, we skip this.
async function getPageToken(pageId: string, systemToken: string): Promise<string> {
  // Fast-path: if FACEBOOK_PAGE_ACCESS_TOKEN is set it's already a Page token.
  if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) return process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  const res = await fetch(
    `${GRAPH_BASE}/${pageId}?fields=access_token&access_token=${systemToken}`,
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook: impossible d'obtenir le Page token (${res.status}): ${err}`);
  }
  const data = await res.json() as { access_token?: string; error?: { message: string } };
  if (data.error) throw new Error(`Facebook: échange de token échoué — ${data.error.message}`);
  if (!data.access_token) throw new Error("Facebook: Page token absent dans la réponse (le System User n'est-il pas admin de cette page ?)");
  return data.access_token;
}

function getCredentials() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const systemToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !systemToken) {
    throw new Error("Facebook credentials missing: FACEBOOK_PAGE_ID + META_ACCESS_TOKEN (or FACEBOOK_PAGE_ACCESS_TOKEN)");
  }
  return { pageId, systemToken };
}

export interface FacebookPostResult {
  id: string;
  url: string;
}

export async function publishFacebookPost(message: string, imageUrl?: string): Promise<FacebookPostResult> {
  const { pageId, systemToken } = getCredentials();
  const pageToken = await getPageToken(pageId, systemToken);

  let postId: string;

  if (imageUrl) {
    // published:true ensures Graph API creates a feed post (not just a photo in album)
    const body = new URLSearchParams({
      url: imageUrl,
      caption: message,
      published: "true",
      access_token: pageToken,
    });
    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      // Common cause: imageUrl is not publicly accessible (private GCS bucket).
      throw new Error(`Facebook photo error ${res.status}: ${err}`);
    }
    const data = await res.json() as { id: string; post_id?: string };
    postId = data.post_id || data.id;
  } else {
    const body = new URLSearchParams({
      message,
      access_token: pageToken,
    });
    const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook API error ${res.status}: ${err}`);
    }
    const data = await res.json() as { id: string };
    postId = data.id;
  }

  return {
    id: postId,
    url: `https://www.facebook.com/${pageId}/posts/${postId.split("_")[1] || postId}`,
  };
}
