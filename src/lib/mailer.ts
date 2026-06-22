import nodemailer from "nodemailer";
import { getIntegrationConfig } from "./integrations";
import { ensureHtml, htmlToText } from "./email-templates";

interface SendOptions {
  to: string;
  subject: string;
  /** Body in HTML. Plain-text bodies are auto-wrapped to HTML. */
  body: string;
}

interface SendResult {
  ok: boolean;
  channel?: "resend" | "smtp";
  error?: string;
}

interface ResendConfig {
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
  bcc?: string;
}

interface SmtpConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
}

async function getResendConfig(): Promise<ResendConfig | null> {
  const db = await getIntegrationConfig("resend");
  const merge = (k: string, fallback?: string) => db?.[k] || fallback || "";
  const cfg: ResendConfig = {
    api_key: merge("api_key", process.env.RESEND_API_KEY),
    from_email: merge("from_email", process.env.RESEND_FROM_EMAIL),
    from_name: merge("from_name", process.env.RESEND_FROM_NAME),
    reply_to: merge("reply_to", process.env.RESEND_REPLY_TO) || undefined,
    bcc: merge("bcc", process.env.RESEND_BCC) || undefined,
  };
  if (!cfg.api_key || !cfg.from_email || !cfg.from_name) return null;
  return cfg;
}

async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const db = await getIntegrationConfig("smtp");
  const merge = (k: string, fallback?: string) => db?.[k] || fallback || "";
  const cfg: SmtpConfig = {
    host: merge("host", process.env.SMTP_HOST),
    port: merge("port", process.env.SMTP_PORT),
    username: merge("username", process.env.SMTP_USERNAME),
    password: merge("password", process.env.SMTP_PASSWORD),
    from_email: merge("from_email", process.env.SMTP_FROM_EMAIL),
  };
  if (
    !cfg.host ||
    !cfg.port ||
    !cfg.username ||
    !cfg.password ||
    !cfg.from_email
  )
    return null;
  return cfg;
}

async function sendViaResend(
  cfg: ResendConfig,
  opts: SendOptions
): Promise<SendResult> {
  const from = cfg.from_name
    ? `${cfg.from_name} <${cfg.from_email}>`
    : cfg.from_email;
  const html = ensureHtml(opts.body);
  const text = htmlToText(html);
  const payload: Record<string, unknown> = {
    from,
    to: [opts.to],
    subject: opts.subject,
    html,
    text,
  };
  if (cfg.reply_to) payload.reply_to = cfg.reply_to;
  if (cfg.bcc) payload.bcc = [cfg.bcc];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      return {
        ok: false,
        channel: "resend",
        error: `HTTP ${res.status}: ${txt.slice(0, 400)}`,
      };
    }
    return { ok: true, channel: "resend" };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { ok: false, channel: "resend", error: e.message || "request failed" };
  }
}

async function sendViaSmtp(
  cfg: SmtpConfig,
  opts: SendOptions
): Promise<SendResult> {
  const port = Number(cfg.port);
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port,
      secure: port === 465,
      auth: { user: cfg.username, pass: cfg.password },
    });
    const html = ensureHtml(opts.body);
    const text = htmlToText(html);
    await transporter.sendMail({
      from: cfg.from_email,
      to: opts.to,
      subject: opts.subject,
      html,
      text,
    });
    return { ok: true, channel: "smtp" };
  } catch (err: unknown) {
    const e = err as {
      code?: string;
      message?: string;
      response?: string;
    };
    return {
      ok: false,
      channel: "smtp",
      error: e.response || e.message || e.code || "smtp send failed",
    };
  }
}

export async function sendEmail(opts: SendOptions): Promise<SendResult> {
  const resend = await getResendConfig();
  if (resend) return sendViaResend(resend, opts);

  const smtp = await getSmtpConfig();
  if (smtp) return sendViaSmtp(smtp, opts);

  return { ok: false, error: "No email channel configured" };
}

export async function sendSlackMessage(text: string): Promise<SendResult> {
  const slack = await getIntegrationConfig("slack");
  const webhook = slack?.webhook_url || process.env.SLACK_WEBHOOK_URL || "";
  if (!webhook) return { ok: false, error: "Slack not configured" };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { ok: false, error: e.message || "Slack request failed" };
  }
}
