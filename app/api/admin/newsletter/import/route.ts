import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// Map Mailchimp CSV header variants → our field names
const HEADER_MAP: Record<string, string> = {
  "email address":  "email",
  "email":          "email",
  "first name":     "firstName",
  "firstname":      "firstName",
  "prénom":         "firstName",
  "last name":      "lastName",
  "lastname":       "lastName",
  "nom":            "lastName",
  "phone number":   "phone",
  "phone":          "phone",
  "téléphone":      "phone",
  "mobile":         "phone",
  "profession":     "profession",
  "métier":         "profession",
  "job title":      "profession",
  "company":        "company",
  "entreprise":     "company",
  "organization":   "company",
  "twitter":        "twitter",
  "linkedin":       "linkedin",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse a CSV line respecting quoted fields
  const parseLine = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQ) { inQ = true; continue; }
      if (ch === '"' && inQ) {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; }
        continue;
      }
      if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  const rawHeaders = parseLine(lines[0]).map(h => h.toLowerCase().trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map(h => HEADER_MAP[h] ?? null);

  if (!headers.includes("email")) return [];

  return lines.slice(1).map(line => {
    const cols = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((field, i) => {
      if (field && cols[i]) row[field] = cols[i];
    });
    return row;
  }).filter(r => r.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contentType = req.headers.get("content-type") || "";
  let csvText: string;

  if (contentType.includes("application/json")) {
    const body = await req.json() as { csv: string };
    csvText = body.csv || "";
  } else {
    csvText = await req.text();
  }

  if (!csvText.trim()) return NextResponse.json({ error: "Corps CSV vide" }, { status: 400 });

  const rows = parseCSV(csvText);
  if (rows.length === 0) return NextResponse.json({ error: "Aucun contact valide trouvé (vérifiez le format CSV)" }, { status: 400 });

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: row.email } });
      if (existing) {
        // Update enrichment fields if the existing record has empty values
        const update: Record<string, string> = {};
        if (!existing.firstName && row.firstName) update.firstName = row.firstName;
        if (!existing.lastName  && row.lastName)  update.lastName  = row.lastName;
        if (!existing.phone     && row.phone)     update.phone     = row.phone;
        if (!existing.profession && row.profession) update.profession = row.profession;
        if (!existing.company   && row.company)   update.company   = row.company;
        if (!existing.twitter   && row.twitter)   update.twitter   = row.twitter;
        if (!existing.linkedin  && row.linkedin)  update.linkedin  = row.linkedin;
        if (Object.keys(update).length > 0) {
          await prisma.newsletterSubscriber.update({ where: { email: row.email }, data: update });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await prisma.newsletterSubscriber.create({
          data: {
            email: row.email,
            firstName:  row.firstName  || null,
            lastName:   row.lastName   || null,
            phone:      row.phone      || null,
            profession: row.profession || null,
            company:    row.company    || null,
            twitter:    row.twitter    || null,
            linkedin:   row.linkedin   || null,
            source:     "import",
          },
        });
        imported++;
      }
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ imported, updated, skipped, total: rows.length });
}
