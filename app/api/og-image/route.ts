import { promises as fs } from "fs";
import path from "path";

// Serves the social share image for Open Graph / Twitter cards.
// Looks in /public first, then /docs (where the file was uploaded).
const CANDIDATES = [
  ["public", "eocon_stay_tune_4.png"],
  ["docs", "eocon_stay_tune_4.png"],
];

export async function GET() {
  for (const parts of CANDIDATES) {
    try {
      const buf = await fs.readFile(path.join(process.cwd(), ...parts));
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    } catch {
      // try next candidate
    }
  }
  return new Response("Not found", { status: 404 });
}
