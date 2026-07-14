import { prisma } from "@/lib/db";
import { getCurrentPermissions, getSessionEmail } from "@/lib/adminPermissions";
import { sendApprovalRequest } from "@/lib/email";

// Flags describing the current request's admin with respect to the communication
// approval workflow.
export interface AdminApprovalFlags {
  email: string | null;
  requiresApproval: boolean; // this admin's actions must be validated before going out
  isApprover: boolean;       // this admin may validate/reject others' requests
  isLegacy: boolean;
}

// Resolve the current session's approval flags. Legacy shared-password sessions
// are never constrained and are always allowed to approve. Both underlying
// lookups (getCurrentPermissions / getSessionEmail) are React-cached, so this is
// at most one extra AdminUser query per request.
export async function getCurrentAdminFlags(): Promise<AdminApprovalFlags | null> {
  const perms = await getCurrentPermissions();
  if (!perms) return null; // unauthenticated
  if (perms.isLegacy) return { email: null, requiresApproval: false, isApprover: true, isLegacy: true };
  const email = await getSessionEmail();
  if (!email) return { email: null, requiresApproval: false, isApprover: false, isLegacy: false };
  const u = await prisma.adminUser.findUnique({
    where: { email },
    select: { requiresApproval: true, isCommApprover: true },
  });
  return {
    email,
    requiresApproval: !!u?.requiresApproval,
    isApprover: !!u?.isCommApprover,
    isLegacy: false,
  };
}

// Designated approvers = active admins flagged isCommApprover.
export async function getApproverEmails(): Promise<{ email: string; name: string }[]> {
  return prisma.adminUser.findMany({
    where: { isCommApprover: true, isActive: true },
    select: { email: true, name: true },
  });
}

interface CreateApprovalOpts {
  kind: "social" | "campaign";
  action: "schedule" | "publish" | "send";
  targetType: "SocialPost" | "Campaign";
  targetId: number;
  title: string;
  payload?: Record<string, unknown> | null;
  requestedBy: string | null;
}

// Record an approval request and notify every designated approver (in-app bell
// notification + email). Notifications are best-effort and never block the
// request creation.
export async function createApprovalRequest(opts: CreateApprovalOpts) {
  const request = await prisma.approvalRequest.create({
    data: {
      kind: opts.kind,
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      title: opts.title,
      payload: opts.payload ? JSON.stringify(opts.payload) : null,
      requestedBy: opts.requestedBy || "inconnu",
      status: "pending",
    },
  });

  const approvers = await getApproverEmails();

  // In-app notifications (upsert to respect the unique key on the bell table).
  await Promise.allSettled(
    approvers.map(a =>
      prisma.adminNotification.upsert({
        where: { recipientEmail_refType_refId: { recipientEmail: a.email, refType: "approval", refId: request.id } },
        create: {
          recipientEmail: a.email,
          type: "approval_pending",
          refType: "approval",
          refId: request.id,
          title: "Validation requise",
          body: `${opts.title} — soumis par ${opts.requestedBy || "un administrateur"}. À valider avant envoi.`,
        },
        update: { readAt: null },
      }),
    ),
  );

  // Emails (fire-and-forget).
  for (const a of approvers) {
    sendApprovalRequest(a.email, a.name, {
      title: opts.title,
      kind: opts.kind,
      requestedBy: opts.requestedBy || "un administrateur",
    }).catch(e => console.error("[approval email]", e));
  }

  return request;
}
