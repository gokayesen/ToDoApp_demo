import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Tailwind,
  Text,
  pixelBasedPreset,
} from 'react-email';
import { render } from 'react-email';

// Story 6.5 (FR35): one shared layout for all 6 Notification event types
// (Story 6.3/6.4's card.assigned/comment.mention/workspace.added/
// board.added/card.due_soon/card.overdue) rather than six near-identical
// JSX files — the only thing that differs per type is copy (subject/
// heading/CTA label), which lib/email.ts's buildNotificationEmailContent
// (notification.service.ts) supplies as props. ctaUrl/ctaLabel are optional
// since workspace.added has nowhere to click through to (see Story 6.2's
// NotificationCenter, which has the same boardId-less "mark read only" case).
export interface NotificationEmailProps {
  heading: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

export function NotificationEmail({ heading, message, ctaUrl, ctaLabel }: NotificationEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>{message}</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl rounded-lg bg-white p-6">
            <Heading as="h2" className="text-xl font-semibold text-gray-800">
              {heading}
            </Heading>
            <Text className="text-base text-gray-700">{message}</Text>
            {ctaUrl && ctaLabel && (
              <Button
                href={ctaUrl}
                className="box-border block rounded bg-blue-600 px-5 py-3 text-center text-white no-underline"
              >
                {ctaLabel}
              </Button>
            )}
            <Hr className="my-6 border-gray-200" />
            <Text className="text-xs text-gray-400">
              You&apos;re receiving this because of your ToDoApp notification preferences. You can turn
              off email for this event from Notification settings.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Isolates the render() call (and its JSX literal) to this .tsx file so
// lib/email.ts — every other function in it a plain .ts string-template
// sender — doesn't itself need a .tsx extension just for this one path.
export function renderNotificationEmail(props: NotificationEmailProps): Promise<string> {
  return render(<NotificationEmail {...props} />);
}
