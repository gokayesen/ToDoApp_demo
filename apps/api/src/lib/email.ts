import { Resend } from 'resend';

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

export async function sendWorkspaceMemberAddedEmail(to: string, workspaceName: string): Promise<void> {
  if (!resend) {
    console.log(`[email:dev] added ${to} to workspace ${workspaceName}`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'ToDoApp <onboarding@resend.dev>',
    to,
    subject: `You've been added to ${workspaceName} on ToDoApp`,
    html: `<p>You've been added to the <strong>${workspaceName}</strong> workspace.</p>`,
  });
}
