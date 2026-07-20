import { Resend } from 'resend';

import { renderNotificationEmail, type NotificationEmailProps } from '../emails/notification-email.js';

const isEmailConfigured = Boolean(process.env.RESEND_API_KEY);
const resend = isEmailConfigured ? new Resend(process.env.RESEND_API_KEY) : undefined;

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!resend) {
    // No Resend key configured (e.g. local dev) — log instead of failing the request,
    // so the reset flow is still testable end-to-end without a live email provider.
    console.log(`[email:dev] password reset link for ${to}: ${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'ToDoApp <onboarding@resend.dev>',
    to,
    subject: 'Reset your password',
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

export async function sendWorkspaceInviteEmail(
  to: string,
  workspaceName: string,
  registerUrl: string,
): Promise<void> {
  if (!resend) {
    console.log(`[email:dev] workspace invite for ${to} (${workspaceName}): ${registerUrl}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'ToDoApp <onboarding@resend.dev>',
    to,
    subject: `You've been invited to join ${workspaceName} on ToDoApp`,
    html: `<p>You've been invited to join the <strong>${workspaceName}</strong> workspace. Create an account to join:</p><p><a href="${registerUrl}">${registerUrl}</a></p><p>This invite expires in 7 days.</p>`,
  });
}

export async function sendBoardInviteEmail(
  to: string,
  boardName: string,
  registerUrl: string,
): Promise<void> {
  if (!resend) {
    console.log(`[email:dev] board invite for ${to} (${boardName}): ${registerUrl}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'ToDoApp <onboarding@resend.dev>',
    to,
    subject: `You've been invited to the board "${boardName}" on ToDoApp`,
    html: `<p>You've been invited to the <strong>${boardName}</strong> board. Create an account to join:</p><p><a href="${registerUrl}">${registerUrl}</a></p><p>This invite expires in 7 days.</p>`,
  });
}

// Story 6.5 (FR35): the transactional-email side of every Notification
// event (Story 6.3/6.4's triggers: card.assigned, comment.mention,
// workspace.added, board.added, card.due_soon, card.overdue) —
// notification.service.ts notifyUser() calls this alongside creating the
// in-app row, each independently gated by its own NotificationPreference
// flag (email vs. in-app). Supersedes the old unconditional
// sendWorkspaceMemberAddedEmail/sendBoardMemberAddedEmail (removed here) for
// the existing-user-direct-add case, which would otherwise double-send
// alongside this — sendWorkspaceInviteEmail/sendBoardInviteEmail above stay
// separate since they target an email with no User row yet, so there's no
// NotificationPreference (or Notification recipient) to gate against.
export async function sendNotificationEmail(
  to: string,
  subject: string,
  content: NotificationEmailProps,
): Promise<void> {
  if (!resend) {
    console.log(`[email:dev] notification email for ${to}: ${subject} — ${content.message}`);
    return;
  }

  const html = await renderNotificationEmail(content);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'ToDoApp <onboarding@resend.dev>',
    to,
    subject,
    html,
  });
}
