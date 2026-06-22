export type EmailTemplateKey =
  | "master_layout"
  | "transfer_confirmation"
  | "transfer_received_admin"
  | "transfer_expiring_soon"
  | "transfer_expired";

export interface EmailTemplateDefinition {
  key: EmailTemplateKey;
  name: string;
  description: string;
  audience: "Sender" | "Admin" | "Layout";
  /** True for the master layout — no subject, always applied as wrapper. */
  isLayout?: boolean;
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

const MASTER_VARS = [
  {
    name: "content",
    description: "The rendered message body — required, place inside <body>",
  },
  { name: "subject", description: "The email subject (after rendering)" },
  { name: "year", description: "Current 4-digit year" },
  ...COMMON_VARS,
];

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    key: "master_layout",
    name: "Master layout",
    description:
      "Shared wrapper applied to every outgoing email. Drop your header, footer, and styling here. Message templates are injected via {{content}}.",
    audience: "Layout",
    isLayout: true,
    variables: MASTER_VARS,
    defaultSubject: "",
    defaultBody: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{subject}}</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #ececee;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="display:inline-block;width:28px;height:28px;background:#ff3d33;border-radius:6px;"></span>
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <strong style="font-size:14px;letter-spacing:-0.01em;color:#09090b;">GDM Send</strong>
                    <span style="font-size:11px;color:#71717a;margin-left:6px;">by Gaviso</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;font-size:14px;line-height:1.55;color:#18181b;">
{{content}}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #ececee;font-size:11px;color:#71717a;">
              &copy; {{year}} Gaviso Digital Marketing, LLC. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    key: "transfer_confirmation",
    name: "Upload confirmation",
    description:
      "Sent to the sender after their files upload successfully. Confirms the transfer was received and gives a reference.",
    audience: "Sender",
    variables: COMMON_VARS,
    defaultSubject: "We received your files — {{subject}}",
    defaultBody: `<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #18181b;">
<p style="margin:0 0 12px;">Hi {{sender_name}},</p>

<p>Thanks for sending us files. Your transfer arrived safely:</p>

<table style="border-collapse:collapse;margin:12px 0;">
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Subject</td><td style="padding:2px 0;"><strong>{{subject}}</strong></td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Files</td><td style="padding:2px 0;">{{file_count}}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Total size</td><td style="padding:2px 0;">{{total_size}}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Reference</td><td style="padding:2px 0;font-family:ui-monospace,Menlo,Consolas,monospace;">{{transfer_id}}</td></tr>
</table>

<p>The team will be in touch if anything needs your attention. Your files are available until <strong>{{expires_at}}</strong> ({{expiry_days}} days from today).</p>

<p>You can review the transfer here:<br>
<a href="{{transfer_url}}" style="color:#2451e9;">{{transfer_url}}</a></p>

<p style="color:#71717a;margin-top:24px;">— Gaviso Digital Marketing</p>
</div>`,
  },
  {
    key: "transfer_received_admin",
    name: "New transfer (admin)",
    description:
      "Sent to the admin notification email when a new transfer arrives.",
    audience: "Admin",
    variables: COMMON_VARS,
    defaultSubject: "New transfer from {{sender_name}} — {{subject}}",
    defaultBody: `<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #18181b;">
<p style="margin:0 0 12px;"><strong>New transfer received</strong></p>

<table style="border-collapse:collapse;margin:12px 0;">
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">From</td><td style="padding:2px 0;">{{sender_name}} &lt;<a href="mailto:{{sender_email}}" style="color:#2451e9;">{{sender_email}}</a>&gt;</td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Subject</td><td style="padding:2px 0;"><strong>{{subject}}</strong></td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Files</td><td style="padding:2px 0;">{{file_count}} ({{total_size}})</td></tr>
</table>

<p style="color:#71717a;margin-bottom:4px;">Message</p>
<blockquote style="margin:0 0 16px;padding:8px 12px;border-left:3px solid #e4e4e7;background:#fafafa;color:#3f3f46;">
{{message}}
</blockquote>

<p style="margin:0 0 12px;"><a href="{{transfer_url}}" style="display:inline-block;padding:8px 14px;background:#09090b;color:#fff;text-decoration:none;border-radius:6px;font-weight:500;">Open the transfer</a></p>
</div>`,
  },
  {
    key: "transfer_expiring_soon",
    name: "Transfer expiring soon",
    description: "Reminder sent 24 hours before a transfer expires.",
    audience: "Sender",
    variables: COMMON_VARS,
    defaultSubject: "Your transfer expires soon — {{subject}}",
    defaultBody: `<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #18181b;">
<p style="margin:0 0 12px;">Hi {{sender_name}},</p>

<p>This is a heads up that your transfer is about to expire:</p>

<table style="border-collapse:collapse;margin:12px 0;">
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Subject</td><td style="padding:2px 0;"><strong>{{subject}}</strong></td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Reference</td><td style="padding:2px 0;font-family:ui-monospace,Menlo,Consolas,monospace;">{{transfer_id}}</td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#71717a;">Expires</td><td style="padding:2px 0;"><strong>{{expires_at}}</strong></td></tr>
</table>

<p>If the team still needs to act on it, no action is needed from you — we'll grab the files. If you sent these by mistake or need to resend, just upload again.</p>

<p style="color:#71717a;margin-top:24px;">— Gaviso Digital Marketing</p>
</div>`,
  },
  {
    key: "transfer_expired",
    name: "Transfer expired",
    description: "Sent when a transfer reaches its expiry and is removed.",
    audience: "Sender",
    variables: COMMON_VARS,
    defaultSubject: "Your transfer has expired — {{subject}}",
    defaultBody: `<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #18181b;">
<p style="margin:0 0 12px;">Hi {{sender_name}},</p>

<p>Your transfer "<strong>{{subject}}</strong>" (reference <code style="font-family:ui-monospace,Menlo,Consolas,monospace;">{{transfer_id}}</code>) has reached its expiry date and the files have been removed from our storage.</p>

<p>If you still need to send these to us, please upload them again.</p>

<p style="color:#71717a;margin-top:24px;">— Gaviso Digital Marketing</p>
</div>`,
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
 * Wraps plain-text bodies in minimal HTML for backwards-compatibility
 * with templates that were authored before the editor switched to HTML.
 * If the body already looks like HTML (contains a tag), return as-is.
 */
export function ensureHtml(body: string): string {
  if (/<[a-z!][\s\S]*?>/i.test(body)) return body;
  return body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r|\n/g, "<br>");
}

/**
 * Derives a plain-text fallback from an HTML body. Strips tags, decodes
 * a few common HTML entities, and collapses excessive whitespace.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Renders a MESSAGE template (the body of an email) and wraps it in the
 * current master layout. Returns null if the message template is disabled.
 * The master layout is always applied; disabling it isn't supported.
 */
export async function renderEmailWithMaster(
  messageKey: EmailTemplateKey,
  vars: Record<string, string>,
  loadOverride: (
    key: EmailTemplateKey
  ) => Promise<{
    subject: string;
    body: string;
    is_enabled: boolean;
  } | null>
): Promise<{ subject: string; body: string } | null> {
  const messageDef = getTemplateDefinition(messageKey);
  if (!messageDef || messageDef.isLayout) return null;

  const messageOverride = await loadOverride(messageKey);
  const messageEnabled = messageOverride ? messageOverride.is_enabled : true;
  if (!messageEnabled) return null;

  const subject = substitute(
    messageOverride?.subject ?? messageDef.defaultSubject,
    vars
  );
  const messageBody = substitute(
    messageOverride?.body ?? messageDef.defaultBody,
    vars
  );

  const masterDef = getTemplateDefinition("master_layout");
  if (!masterDef) {
    return { subject, body: messageBody };
  }
  const masterOverride = await loadOverride("master_layout");
  const masterBody = masterOverride?.body ?? masterDef.defaultBody;

  const masterVars: Record<string, string> = {
    ...vars,
    subject,
    content: messageBody,
    year: String(new Date().getFullYear()),
  };
  const body = substitute(masterBody, masterVars);
  return { subject, body };
}

/**
 * Stand-in message content used when previewing the master layout itself.
 * The wrapping div sets a font so the preview reflects what real (styled)
 * content will look like even if the layout's content cell doesn't
 * declare its own font-family.
 */
export const SAMPLE_MESSAGE_CONTENT = `<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #18181b;">
<p style="margin:0 0 12px;">Hi {{sender_name}},</p>
<p style="margin:0 0 12px;">This is a placeholder message used for previewing the master layout.</p>
<p style="margin:0 0 12px;">When the layout is applied to a real email, the content area between the header and footer is replaced with the rendered message body.</p>
</div>`;

/**
 * Sample variable values used by the editor preview so admins can see
 * roughly what a sent email will look like.
 */
export const SAMPLE_VARS: Record<string, string> = {
  sender_name: "Jane Smith",
  sender_email: "jane.smith@company.com",
  subject: "Brand assets — Q1 launch",
  message:
    "Hi team, here is the kit for the Q1 launch. Let me know if you need anything else.",
  file_count: "3",
  total_size: "168.79 MB",
  expires_at: "Jul 20, 2026, 12:00 PM",
  expiry_days: "30",
  transfer_id: "c0cb2b12",
  transfer_url: "https://gdmsend.gaviso.agency/transfer/c0cb2b12-156c-44c8-badc-e1bd33cbdf0d",
};

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
