// Facebook Graph API — Page publishing
// Required env vars:
//   FACEBOOK_PAGE_ID          — Numeric ID of the EOCON Facebook Page
//   FACEBOOK_PAGE_ACCESS_TOKEN — Long-lived Page Access Token

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function getCredentials() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    throw new Error("Facebook credentials missing: FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN");
  }
  return { pageId, token };
}

export interface FacebookPostResult {
  id: string;
  url: string;
}

export async function publishFacebookPost(message: string, imageUrl?: string): Promise<FacebookPostResult> {
  const { pageId, token } = getCredentials();

  let postId: string;

  if (imageUrl) {
    // Photo post: upload photo with caption
    const body = new URLSearchParams({
      url: imageUrl,
      caption: message,
      access_token: token,
    });
    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Facebook API error ${res.status}: ${err}`);
    }
    const data = await res.json() as { id: string; post_id?: string };
    postId = data.post_id || data.id;
  } else {
    // Text-only post
    const body = new URLSearchParams({
      message,
      access_token: token,
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
