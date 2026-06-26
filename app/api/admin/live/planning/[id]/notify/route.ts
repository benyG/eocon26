import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { sendModeratorStreamingBriefing } from "@/lib/email";

type TeamMemberRow = Awaited<ReturnType<typeof prisma.teamMember.findMany>>[number];

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const planning = await prisma.sessionPlanning.findUnique({
    where: { id },
    include: {
      session: true,
      room: true,
    },
  });

  if (!planning) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { session, room } = planning;
  const techIds = (planning.technicienIds as number[]) ?? [];
  const modIds  = (planning.moderateurIds as number[]) ?? [];
  const allIds  = Array.from(new Set([...techIds, ...modIds]));

  // Fetch team members
  const teamMembers = allIds.length > 0
    ? await prisma.teamMember.findMany({ where: { id: { in: allIds } } })
    : [];

  // Fetch speaker if linked
  const speaker = session.speakerId
    ? await prisma.speaker.findUnique({ where: { id: session.speakerId } })
    : null;

  const notified: Array<{ name: string; email: string; role: string }> = [];

  const sessionTitle = session.title;
  const sessionTime  = session.time ?? "";
  const guestLink    = room?.guestLink ?? planning.lienWebinaire ?? "";
  const lienLive     = planning.lienLive ?? "";
  const rtmpUrl      = "rtmp://live.restream.io/live/";
  const streamKey    = "(voir admin)";
  const qaAdminUrl   = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/live/qa`
    : "https://eyesopensecurity.com/admin/live/qa";

  // Find any technician to use as tech contact for speaker emails
  const techMember = teamMembers.find((m: TeamMemberRow) => techIds.includes(m.id));
  const techContact = techMember?.name ?? "Équipe technique EOCON";

  // Send to speaker
  if (speaker?.name) {
    const speakerEmail = speaker.name; // Speaker model has name; email not in schema — log only
    console.log(`[notify] Would send speaker invite to: ${speaker.name} for session: ${sessionTitle}`);

    // If speaker had an email field we'd call sendRestreamSpeakerInvite here.
    // For now, log and include in notified list.
    if (guestLink) {
      try {
        // Speaker model doesn't have an email field in this schema, so we use speakerName from session.
        // This is a no-op placeholder if no email is available.
        console.log(`[notify] Speaker: ${speaker.name}, studio link: ${guestLink}`);
      } catch (e) {
        console.error("[notify] Speaker email error:", e);
      }
    }

    notified.push({ name: speaker.name, email: "(no email in schema)", role: "speaker" });
  }

  // Send to technicians
  for (const member of teamMembers.filter((m: TeamMemberRow) => techIds.includes(m.id))) {
    if (member.email) {
      try {
        // Technicians get the moderator briefing (they manage the stream)
        await sendModeratorStreamingBriefing(
          member.email,
          member.name,
          guestLink,
          rtmpUrl,
          streamKey,
          qaAdminUrl,
          sessionTitle,
          sessionTime,
          "fr",
        );
        notified.push({ name: member.name, email: member.email, role: "technicien" });
      } catch (e) {
        console.error(`[notify] Technicien email error (${member.name}):`, e);
        notified.push({ name: member.name, email: member.email, role: "technicien (error)" });
      }
    } else {
      console.log(`[notify] Technicien ${member.name} has no email`);
      notified.push({ name: member.name, email: "(no email)", role: "technicien" });
    }
  }

  // Send to moderators
  for (const member of teamMembers.filter((m: TeamMemberRow) => modIds.includes(m.id))) {
    if (member.email) {
      try {
        await sendModeratorStreamingBriefing(
          member.email,
          member.name,
          guestLink,
          rtmpUrl,
          streamKey,
          qaAdminUrl,
          sessionTitle,
          sessionTime,
          "fr",
        );
        notified.push({ name: member.name, email: member.email, role: "moderateur" });
      } catch (e) {
        console.error(`[notify] Moderateur email error (${member.name}):`, e);
        notified.push({ name: member.name, email: member.email, role: "moderateur (error)" });
      }
    } else {
      console.log(`[notify] Moderateur ${member.name} has no email`);
      notified.push({ name: member.name, email: "(no email)", role: "moderateur" });
    }
  }

  // Update notifiedAt
  await prisma.sessionPlanning.update({
    where: { id },
    data: { notifiedAt: new Date() },
  });

  logAction(req, "notify", "session_planning", id, { count: notified.length });
  return NextResponse.json({ ok: true, notified });
}
