import { createAdminClient } from "./supabase-server";
import { sendEmail, sendSlackMessage } from "./mailer";
import { renderEmailTemplate, type EmailTemplateKey } from "./email-templates";
import { formatBytes, formatDate } from "./utils";

interface TransferData {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  message: string | null;
  total_size: number;
  file_count: number;
  created_at: string;
  expires_at: string;
}

async function loadTemplateOverride(key: EmailTemplateKey) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_templates")
    .select("subject, body, is_enabled")
    .eq("key", key)
    .maybeSingle();
  return data;
}

async function isEventEnabled(
  channel: "email" | "slack",
  event_type: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notification_preferences")
    .select("is_enabled")
    .eq("channel", channel)
    .eq("event_type", event_type)
    .maybeSingle();
  return data?.is_enabled ?? false;
}

async function getNotificationEmail(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("settings")
    .select("value")
    .eq("key", "notification_email")
    .maybeSingle();
  return data?.value || null;
}

async function getExpiryDays(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("settings")
    .select("value")
    .eq("key", "transfer_expiry_days")
    .maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function buildVars(
  transfer: TransferData,
  expiryDays: number,
  appUrl: string
): Record<string, string> {
  return {
    sender_name: transfer.sender_name,
    sender_email: transfer.sender_email,
    subject: transfer.subject,
    message: transfer.message || "",
    file_count: String(transfer.file_count),
    total_size: formatBytes(transfer.total_size),
    expires_at: formatDate(transfer.expires_at),
    expiry_days: String(expiryDays),
    transfer_id: transfer.id.slice(0, 8),
    transfer_url: `${appUrl}/transfer/${transfer.id}`,
  };
}

/**
 * Fire-and-forget: send the sender confirmation, admin email, and Slack
 * message for a transfer that just transitioned to status='received'.
 * Each leg respects template enabled/disabled state and notification
 * preferences. Failures are logged but don't propagate.
 */
export async function notifyTransferReceived(transfer: TransferData) {
  const expiryDays = await getExpiryDays();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const vars = buildVars(transfer, expiryDays, appUrl);

  // 1. Always try to send the upload confirmation to the sender (template
  //    is the on/off switch for this, not the notification_preferences).
  if (transfer.sender_email) {
    try {
      const rendered = await renderEmailTemplate(
        "transfer_confirmation",
        vars,
        loadTemplateOverride
      );
      if (rendered) {
        const result = await sendEmail({
          to: transfer.sender_email,
          subject: rendered.subject,
          body: rendered.body,
        });
        if (!result.ok) {
          console.error(
            `[notify] confirmation email failed for ${transfer.id}:`,
            result.error
          );
        }
      }
    } catch (err) {
      console.error(`[notify] confirmation error for ${transfer.id}:`, err);
    }
  }

  // 2. Admin email notification (gated by notification_preferences)
  if (await isEventEnabled("email", "new_transfer")) {
    const notifEmail = await getNotificationEmail();
    if (notifEmail) {
      try {
        const rendered = await renderEmailTemplate(
          "transfer_received_admin",
          vars,
          loadTemplateOverride
        );
        if (rendered) {
          const result = await sendEmail({
            to: notifEmail,
            subject: rendered.subject,
            body: rendered.body,
          });
          if (!result.ok) {
            console.error(
              `[notify] admin email failed for ${transfer.id}:`,
              result.error
            );
          }
        }
      } catch (err) {
        console.error(`[notify] admin email error for ${transfer.id}:`, err);
      }
    }
  }

  // 3. Admin Slack notification (gated by notification_preferences)
  if (await isEventEnabled("slack", "new_transfer")) {
    try {
      const text =
        `*New transfer from ${transfer.sender_name}*\n` +
        `${transfer.subject}\n` +
        `${transfer.file_count} ${transfer.file_count === 1 ? "file" : "files"} · ${formatBytes(transfer.total_size)}\n` +
        `${appUrl}/admin/transfers`;
      const result = await sendSlackMessage(text);
      if (!result.ok) {
        console.error(
          `[notify] slack failed for ${transfer.id}:`,
          result.error
        );
      }
    } catch (err) {
      console.error(`[notify] slack error for ${transfer.id}:`, err);
    }
  }
}
