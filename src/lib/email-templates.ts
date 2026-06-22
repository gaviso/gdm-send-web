export type EmailTemplateKey =
  | "transfer_confirmation"
  | "transfer_received_admin"
  | "transfer_expiring_soon"
  | "transfer_expired";

export interface EmailTemplateDefinition {
  key: EmailTemplateKey;
  name: string;
  description: string;
  audience: "Sender" | "Admin";
  variables: { name: string; description: string }[];
  defaultSubject: string;
  defaultBody: string;
}

const COMMON_VARS = [
  { name: "sender_name", description: "Sender's display name" },
  { name: "sender_email", description: "Sender's email address" },
  { name: "subject", description: "The transfer's subject" },
  { name: "message", description: "The note included with the transfer" },
  { name: "file_count", description: "Number of files in the transfer" },
  { name: "total_size", description: "Total size, formatted (e.g. 1.2 GB)" },
  { name: "expires_at", description: "Expiry date, formatted" },
  { name: "expiry_days", description: "Days until expiry (e.g. 30)" },
  { name: "transfer_id", description: "Short transfer reference (8 chars)" },
  { name: "transfer_url", description: "Link to the public transfer page" },
];

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    key: "transfer_confirmation",
    name: "Upload confirmation",
    description:
      "Sent to the sender after their files upload successfully. Confirms the transfer was received and gives a reference.",
    audience: "Sender",
    variables: COMMON_VARS,
    defaultSubject: "We received your files — {{subject}}",
    defaultBody: `Hi {{sender_name}},

Thanks for sending us files. Your transfer arrived safely:

  Subject: {{subject}}
  Files: {{file_count}}
  Total size: {{total_size}}
  Reference: {{transfer_id}}

The team will be in touch if anything needs your attention. Your files are available until {{expires_at}} ({{expiry_days}} days from today).

You can review the transfer here:
{{transfer_url}}

— Gaviso`,
  },
  {
    key: "transfer_received_admin",
    name: "New transfer (admin)",
    description:
      "Sent to the admin notification email when a new transfer arrives.",
    audience: "Admin",
    variables: COMMON_VARS,
    defaultSubject: "New transfer from {{sender_name}} — {{subject}}",
    defaultBody: `New transfer received

From: {{sender_name}} <{{sender_email}}>
Subject: {{subject}}
Files: {{file_count}} ({{total_size}})

Message:
{{message}}

Open the transfer:
{{transfer_url}}`,
  },
  {
    key: "transfer_expiring_soon",
    name: "Transfer expiring soon",
    description: "Reminder sent 24 hours before a transfer expires.",
    audience: "Sender",
    variables: COMMON_VARS,
    defaultSubject: "Your transfer expires soon — {{subject}}",
    defaultBody: `Hi {{sender_name}},

This is a heads up that your transfer is about to expire:

  Subject: {{subject}}
  Reference: {{transfer_id}}
  Expires: {{expires_at}}

If the team still needs to act on it, no action is needed from you — we'll grab the files. If you sent these by mistake or need to resend, just upload again.

— Gaviso`,
  },
  {
    key: "transfer_expired",
    name: "Transfer expired",
    description: "Sent when a transfer reaches its expiry and is removed.",
    audience: "Sender",
    variables: COMMON_VARS,
    defaultSubject: "Your transfer has expired — {{subject}}",
    defaultBody: `Hi {{sender_name}},

Your transfer "{{subject}}" (reference {{transfer_id}}) has reached its expiry date and the files have been removed from our storage.

If you still need to send these to us, please upload them again.

— Gaviso`,
  },
];

export function getTemplateDefinition(
  key: string
): EmailTemplateDefinition | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}

function substitute(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    vars[name] != null ? String(vars[name]) : ""
  );
}

/**
 * Resolves a template by key, applying any DB override, and substitutes
 * {{variable}} placeholders. Returns null if the template is unknown or
 * has been disabled by the admin.
 */
export async function renderEmailTemplate(
  key: EmailTemplateKey,
  vars: Record<string, string>,
  loadOverride: (
    key: EmailTemplateKey
  ) => Promise<{
    subject: string;
    body: string;
    is_enabled: boolean;
  } | null>
): Promise<{ subject: string; body: string } | null> {
  const def = getTemplateDefinition(key);
  if (!def) return null;

  const override = await loadOverride(key);
  const enabled = override ? override.is_enabled : true;
  if (!enabled) return null;

  const subject = substitute(override?.subject ?? def.defaultSubject, vars);
  const body = substitute(override?.body ?? def.defaultBody, vars);
  return { subject, body };
}
