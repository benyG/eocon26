import { prisma } from "@/lib/db";

export function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function getTransactionalTemplate(slug: string): Promise<{ subject: string; htmlBody: string } | null> {
  try {
    const t = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (t) return { subject: t.subject, htmlBody: t.htmlBody };
    return null;
  } catch {
    return null;
  }
}
