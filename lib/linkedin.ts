const LINKEDIN_API = "https://api.linkedin.com/v2";

function getAccessToken(): string {
  const t = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!t) throw new Error("LINKEDIN_ACCESS_TOKEN env var is required");
  return t;
}

function getAuthorUrn(): string {
  // Can be a person URN: urn:li:person:xxx or organization URN: urn:li:organization:xxx
  const urn = process.env.LINKEDIN_AUTHOR_URN;
  if (!urn) throw new Error("LINKEDIN_AUTHOR_URN env var is required");
  return urn;
}

export interface LinkedInPostResult {
  id: string;
  url: string;
}

export async function publishPost(text: string, imageUrl?: string): Promise<LinkedInPostResult> {
  const token = getAccessToken();
  const author = getAuthorUrn();

  // Build share content
  const body: Record<string, unknown> = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
        ...(imageUrl ? {
          media: [{
            status: "READY",
            description: { text: "EOCON 2026" },
            media: await uploadImage(imageUrl, token, author),
            title: { text: "EOCON 2026" },
          }],
        } : {}),
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn API error ${res.status}: ${err}`);
  }

  const postId = res.headers.get("x-restli-id") || (await res.json() as { id: string }).id;
  return {
    id: postId,
    url: `https://www.linkedin.com/feed/update/${postId}/`,
  };
}

async function uploadImage(imageUrl: string, token: string, author: string): Promise<string> {
  // Register upload
  const registerRes = await fetch(`${LINKEDIN_API}/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: author,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        }],
      },
    }),
  });

  if (!registerRes.ok) throw new Error("LinkedIn image register failed");
  const registerData = await registerRes.json() as {
    value: {
      asset: string;
      uploadMechanism: { "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string } };
    };
  };

  const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const assetUrn = registerData.value.asset;

  // Fetch image and upload
  const imgRes = await fetch(imageUrl);
  const imgBuffer = await imgRes.arrayBuffer();

  await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
    body: imgBuffer,
  });

  return assetUrn;
}

export async function getProfile(): Promise<{ id: string; name: string }> {
  const token = getAccessToken();
  const res = await fetch(`${LINKEDIN_API}/me?projection=(id,localizedFirstName,localizedLastName)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LinkedIn profile error: ${res.status}`);
  const data = await res.json() as { id: string; localizedFirstName: string; localizedLastName: string };
  return { id: data.id, name: `${data.localizedFirstName} ${data.localizedLastName}` };
}
