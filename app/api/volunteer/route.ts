export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVolunteerConfirmation } from "@/lib/email";
import { checkRateLimit, getIp } from "@/lib/rateLimit";
import { getEventSettings } from "@/lib/settings";
import { evaluateCfpWindow } from "@/lib/cfpWindow";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["logistique", "communication", "technique", "accueil", "securite", "autre", "logistics", "communication", "technical", "welcome", "security", "other", ""];

export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`volunteer:${getIp(req)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de soumissions, réessayez plus tard." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { name, email, phone, city, role, experience, motivation, lang_expression, linkedin, twitter, whatsapp, hours_per_week } = body;

    // Check volunteer application window
    const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
    const win = evaluateCfpWindow(settings.volunteer_open_date || "", settings.volunteer_close_date || "");
    const deferred = win.hasWindow && !win.open;

    if (!name || !email || !motivation) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "Nom trop long" }, { status: 400 });
    }
    if (motivation.length > 3000) {
      return NextResponse.json({ error: "Motivation trop longue (max 3000 caractères)" }, { status: 400 });
    }
    if (experience && experience.length > 3000) {
      return NextResponse.json({ error: "Expérience trop longue (max 3000 caractères)" }, { status: 400 });
    }

    const application = await prisma.volunteerApplication.create({
      data: {
        name,
        email,
        phone: phone?.slice(0, 30),
        city: city?.slice(0, 100),
        role: role?.slice(0, 100),
        experience,
        motivation,
        linkedin,
        twitter,
        whatsapp,
        hoursPerWeek: hours_per_week,
        langExpression: lang_expression || "fr",
      },
    });

    sendVolunteerConfirmation(email, name, lang_expression === "en" ? "en" : "fr").catch(e => console.error("[Volunteer email]", e));

    return NextResponse.json({ success: true, id: application.id, deferred }, { status: 201 });
  } catch (err) {
    console.error("[Volunteer]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
