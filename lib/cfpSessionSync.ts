import { prisma } from "@/lib/db";

// Keep a speaker's CFP pipeline stage in sync with their session schedule.
// The "scheduled" stage is owned by the calendar: a speaker becomes "Programmé"
// because their session got a date, and reverts to "confirmed" when unscheduled.
// This makes the kanban stage a reflection of the agenda rather than a manual move.
const PROMOTABLE = ["accepted", "onboarding", "confirmed"];

export async function syncCfpScheduleStage(speakerId: number | null | undefined, hasDate: boolean): Promise<void> {
  if (!speakerId) return;
  const cfp = await prisma.cFPSubmission.findFirst({ where: { speakerId } });
  if (!cfp) return;

  if (hasDate && PROMOTABLE.includes(cfp.pipelineStage)) {
    await prisma.cFPSubmission.update({ where: { id: cfp.id }, data: { pipelineStage: "scheduled" } });
  } else if (!hasDate && cfp.pipelineStage === "scheduled") {
    await prisma.cFPSubmission.update({ where: { id: cfp.id }, data: { pipelineStage: "confirmed" } });
  }
}
