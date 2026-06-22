import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";

interface IntegrationSummary {
  provider: string;
  is_active: boolean;
  source: "database" | "env" | "none";
  // Non-secret fields for display; secret fields are masked
  fields: Record<string, string>;
  has_secret: boolean;
  updated_at: string | null;
}

function envB2Source(): {
  fields: Record<string, string>;
  hasSecret: boolean;
  configured: boolean;
} {
  const fields: Record<string, string> = {
    endpoint: process.env.B2_ENDPOINT || "",
    region: process.env.B2_REGION || "",
    bucket: process.env.B2_BUCKET_NAME || "",
    key_id: process.env.B2_KEY_ID || "",
  };
  const hasSecret = !!process.env.B2_APP_KEY;
  const configured =
    !!fields.endpoint && !!fields.bucket && !!fields.key_id && hasSecret;
  return { fields, hasSecret, configured };
}

function envResendSource(): {
  fields: Record<string, string>;
  hasSecret: boolean;
  configured: boolean;
} {
  const fields: Record<string, string> = {
    from_email: process.env.RESEND_FROM_EMAIL || "",
    from_name: process.env.RESEND_FROM_NAME || "",
    reply_to: process.env.RESEND_REPLY_TO || "",
    bcc: process.env.RESEND_BCC || "",
  };
  const hasSecret = !!process.env.RESEND_API_KEY;
  const configured = !!fields.from_email && !!fields.from_name && hasSecret;
  return { fields, hasSecret, configured };
}

function envSmtpSource(): {
  fields: Record<string, string>;
  hasSecret: boolean;
  configured: boolean;
} {
  const fields: Record<string, string> = {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT || "",
    username: process.env.SMTP_USERNAME || "",
    from_email: process.env.SMTP_FROM_EMAIL || "",
  };
  const hasSecret = !!process.env.SMTP_PASSWORD;
  const configured =
    !!fields.host &&
    !!fields.port &&
    !!fields.username &&
    !!fields.from_email &&
    hasSecret;
  return { fields, hasSecret, configured };
}

function envSlackSource(): {
  fields: Record<string, string>;
  hasSecret: boolean;
  configured: boolean;
} {
  // webhook URL is itself a secret; no non-secret display fields
  const fields: Record<string, string> = {};
  const hasSecret = !!process.env.SLACK_WEBHOOK_URL;
  const configured = hasSecret;
  return { fields, hasSecret, configured };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("integrations")
    .select("provider, config, is_active, updated_at");

  const byProvider = new Map<
    string,
    { config: Record<string, string>; is_active: boolean; updated_at: string }
  >();
  for (const row of rows || []) {
    byProvider.set(row.provider, {
      config: row.config as Record<string, string>,
      is_active: row.is_active,
      updated_at: row.updated_at,
    });
  }

  // For now only B2 is exposed; add more providers later.
  const integrations: IntegrationSummary[] = [];

  const b2Db = byProvider.get("backblaze_b2");
  const b2Env = envB2Source();

  if (b2Db && b2Db.is_active) {
    integrations.push({
      provider: "backblaze_b2",
      is_active: true,
      source: "database",
      fields: {
        endpoint: b2Db.config.endpoint || "",
        region: b2Db.config.region || "",
        bucket: b2Db.config.bucket || "",
        key_id: b2Db.config.key_id || "",
      },
      has_secret: !!b2Db.config.app_key,
      updated_at: b2Db.updated_at,
    });
  } else if (b2Env.configured) {
    integrations.push({
      provider: "backblaze_b2",
      is_active: true,
      source: "env",
      fields: b2Env.fields,
      has_secret: b2Env.hasSecret,
      updated_at: null,
    });
  } else {
    integrations.push({
      provider: "backblaze_b2",
      is_active: false,
      source: "none",
      fields: { endpoint: "", region: "", bucket: "", key_id: "" },
      has_secret: false,
      updated_at: null,
    });
  }

  const resendDb = byProvider.get("resend");
  const resendEnv = envResendSource();

  if (resendDb && resendDb.is_active) {
    integrations.push({
      provider: "resend",
      is_active: true,
      source: "database",
      fields: {
        from_email: resendDb.config.from_email || "",
        from_name: resendDb.config.from_name || "",
        reply_to: resendDb.config.reply_to || "",
        bcc: resendDb.config.bcc || "",
      },
      has_secret: !!resendDb.config.api_key,
      updated_at: resendDb.updated_at,
    });
  } else if (resendEnv.configured) {
    integrations.push({
      provider: "resend",
      is_active: true,
      source: "env",
      fields: resendEnv.fields,
      has_secret: resendEnv.hasSecret,
      updated_at: null,
    });
  } else {
    integrations.push({
      provider: "resend",
      is_active: false,
      source: "none",
      fields: { from_email: "", from_name: "", reply_to: "", bcc: "" },
      has_secret: false,
      updated_at: null,
    });
  }

  const smtpDb = byProvider.get("smtp");
  const smtpEnv = envSmtpSource();

  if (smtpDb && smtpDb.is_active) {
    integrations.push({
      provider: "smtp",
      is_active: true,
      source: "database",
      fields: {
        host: smtpDb.config.host || "",
        port: smtpDb.config.port || "",
        username: smtpDb.config.username || "",
        from_email: smtpDb.config.from_email || "",
      },
      has_secret: !!smtpDb.config.password,
      updated_at: smtpDb.updated_at,
    });
  } else if (smtpEnv.configured) {
    integrations.push({
      provider: "smtp",
      is_active: true,
      source: "env",
      fields: smtpEnv.fields,
      has_secret: smtpEnv.hasSecret,
      updated_at: null,
    });
  } else {
    integrations.push({
      provider: "smtp",
      is_active: false,
      source: "none",
      fields: { host: "", port: "", username: "", from_email: "" },
      has_secret: false,
      updated_at: null,
    });
  }

  const slackDb = byProvider.get("slack");
  const slackEnv = envSlackSource();

  if (slackDb && slackDb.is_active) {
    integrations.push({
      provider: "slack",
      is_active: true,
      source: "database",
      fields: {},
      has_secret: !!slackDb.config.webhook_url,
      updated_at: slackDb.updated_at,
    });
  } else if (slackEnv.configured) {
    integrations.push({
      provider: "slack",
      is_active: true,
      source: "env",
      fields: slackEnv.fields,
      has_secret: slackEnv.hasSecret,
      updated_at: null,
    });
  } else {
    integrations.push({
      provider: "slack",
      is_active: false,
      source: "none",
      fields: {},
      has_secret: false,
      updated_at: null,
    });
  }

  return NextResponse.json({ integrations });
}
