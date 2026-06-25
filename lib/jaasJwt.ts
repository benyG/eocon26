import crypto from "crypto";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function jsonB64(obj: unknown): string {
  return b64url(Buffer.from(JSON.stringify(obj)));
}

export interface JaaSUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export function signJaaSToken(opts: {
  appId: string;       // vpaas-magic-cookie-xxxx
  apiKeyId: string;    // kid
  privateKeyPem: string;
  room: string;
  user: JaaSUser;
  moderator?: boolean;
  expiresInSeconds?: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (opts.expiresInSeconds ?? 7200);

  const header = { alg: "RS256", kid: opts.apiKeyId, typ: "JWT" };
  const payload = {
    aud: "jitsi",
    iss: "chat",
    iat: now,
    exp,
    nbf: now - 10,
    sub: opts.appId,
    context: {
      user: {
        id:        opts.user.id,
        name:      opts.user.name,
        email:     opts.user.email,
        avatar:    opts.user.avatar ?? "",
        moderator: opts.moderator ?? false,
      },
      features: {
        livestreaming:   false,
        "outbound-call": false,
        transcription:   false,
        recording:       false,
      },
    },
    room: opts.room,
  };

  const signingInput = `${jsonB64(header)}.${jsonB64(payload)}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(signingInput), {
    key:     opts.privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  });

  return `${signingInput}.${b64url(sig)}`;
}

export function jaaSMeetUrl(appId: string, room: string, jwt: string): string {
  return `https://8x8.vc/${appId}/${encodeURIComponent(room)}#jwt=${jwt}`;
}
