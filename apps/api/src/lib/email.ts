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
