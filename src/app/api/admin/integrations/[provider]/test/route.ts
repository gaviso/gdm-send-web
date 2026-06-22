import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getIntegrationConfig } from "@/lib/integrations";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const maxDuration = 30;

const KNOWN_PROVIDERS = ["backblaze_b2", "resend", "smtp", "slack"] as const;
type Provider = (typeof KNOWN_PROVIDERS)[number];

function isProvider(p: string): p is Provider {
  return (KNOWN_PROVIDERS as readonly string[]).includes(p);
}

interface TestResult {
  ok: boolean;
  message: string;
}

async function loadEffectiveConfig(
  provider: Provider,
  bodyConfig: Record<string, string> | undefined
): Promise<Record<string, string>> {
  if (bodyConfig && Object.keys(bodyConfig).length > 0) {
    return bodyConfig;
  }
  const db = await getIntegrationConfig(provider);
  if (db) return db;

  // Fall back to env vars
  if (provider === "backblaze_b2") {
    return {
      endpoint: process.env.B2_ENDPOINT || "",
      region: process.env.B2_REGION || "",
      bucket: process.env.B2_BUCKET_NAME || "",
      key_id: process.env.B2_KEY_ID || "",
      app_key: process.env.B2_APP_KEY || "",
    };
  }
  if (provider === "resend") {
    return {
      api_key: process.env.RESEND_API_KEY || "",
      from_email: process.env.RESEND_FROM_EMAIL || "",
      from_name: process.env.RESEND_FROM_NAME || "",
      reply_to: process.env.RESEND_REPLY_TO || "",
      bcc: process.env.RESEND_BCC || "",
    };
  }
  if (provider === "smtp") {
    return {
      host: process.env.SMTP_HOST || "",
      port: process.env.SMTP_PORT || "",
      username: process.env.SMTP_USERNAME || "",
      password: process.env.SMTP_PASSWORD || "",
      from_email: process.env.SMTP_FROM_EMAIL || "",
    };
  }
  if (provider === "slack") {
    return {
      webhook_url: process.env.SLACK_WEBHOOK_URL || "",
    };
  }
  return {};
}

async function testB2(cfg: Record<string, string>): Promise<TestResult> {
  const missing = ["endpoint", "region", "bucket", "key_id", "app_key"].filter(
    (k) => !cfg[k]
  );
  if (missing.length > 0) {
    return { ok: false, message: `Missing: ${missing.join(", ")}` };
  }
  try {
    const s3 = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.key_id,
        secretAccessKey: cfg.app_key,
      },
    });
    await s3.send(new ListObjectsV2Command({ Bucket: cfg.bucket, MaxKeys: 1 }));
    return { ok: true, message: `Connected to bucket "${cfg.bucket}"` };
  } catch (err: unknown) {
    const e = err as {
      name?: string;
      message?: string;
      Code?: string;
      $metadata?: { httpStatusCode?: number; requestId?: string };
    };
    const status = e.$metadata?.httpStatusCode;
    const code = e.Code || e.name || "Error";
    const detail = e.message || "no detail";
    const reqId = e.$metadata?.requestId;
    const suffix = reqId ? `\nrequest id: ${reqId}` : "";

    if (status === 401 || status === 403) {
      return {
        ok: false,
        message: `Authentication failed (HTTP ${status} ${code})\n${detail}${suffix}`,
      };
    }
    if (status === 404) {
      return {
        ok: false,
        message: `Bucket "${cfg.bucket}" not found (HTTP ${status})\n${detail}${suffix}`,
      };
    }
    return {
      ok: false,
      message: `${code}${status ? ` (HTTP ${status})` : ""}\n${detail}${suffix}`,
    };
  }
}

async function testResend(cfg: Record<string, string>): Promise<TestResult> {
  if (!cfg.api_key) {
    return { ok: false, message: "Missing API Key" };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${cfg.api_key}`,
      },
    });
    if (!res.ok) {
      const txt = await res.text();
      const label =
        res.status === 401 || res.status === 403
          ? "Invalid API key"
          : "Resend API error";
      return {
        ok: false,
        message: `${label} (HTTP ${res.status})\n${txt.slice(0, 400)}`,
      };
    }
    const data = (await res.json()) as { data?: { name: string }[] };
    const count = data.data?.length ?? 0;
    return {
      ok: true,
      message: `API key valid — ${count} domain${count === 1 ? "" : "s"} configured`,
    };
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; cause?: { code?: string } };
    const code = e.code || e.cause?.code;
    return {
      ok: false,
      message: `${code ? code + " — " : ""}${e.message || "Request failed"}`,
    };
  }
}

async function testSmtp(cfg: Record<string, string>): Promise<TestResult> {
  const missing = ["host", "port", "username", "password"].filter(
    (k) => !cfg[k]
  );
  if (missing.length > 0) {
    return { ok: false, message: `Missing: ${missing.join(", ")}` };
  }
  const port = Number(cfg.port);
  if (!Number.isFinite(port) || port <= 0) {
    return { ok: false, message: `Invalid port: ${cfg.port}` };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port,
      secure: port === 465,
      auth: { user: cfg.username, pass: cfg.password },
      connectionTimeout: 10_000,
      socketTimeout: 10_000,
    });
    await transporter.verify();
    return { ok: true, message: `Connected to ${cfg.host}:${port}` };
  } catch (err: unknown) {
    const e = err as {
      code?: string;
      message?: string;
      command?: string;
      response?: string;
      responseCode?: number;
    };
    const lines: string[] = [];
    if (e.code === "EAUTH") {
      lines.push("Authentication failed — check username and password");
    } else if (e.code === "ECONNECTION" || e.code === "ETIMEDOUT") {
      lines.push(`Could not reach ${cfg.host}:${port}`);
    }

    // Always append the underlying detail for debugging
    if (e.response) {
      lines.push(`server: ${e.response}`);
    } else if (e.message) {
      lines.push(e.message);
    }
    if (e.code) lines.push(`code: ${e.code}`);
    if (e.command) lines.push(`command: ${e.command}`);

    return {
      ok: false,
      message: lines.length > 0 ? lines.join("\n") : "SMTP test failed",
    };
  }
}

async function testSlack(cfg: Record<string, string>): Promise<TestResult> {
  if (!cfg.webhook_url) {
    return { ok: false, message: "Missing webhook URL" };
  }
  try {
    const res = await fetch(cfg.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "GDM Send — test message. If you see this, the webhook is working.",
      }),
    });
    if (res.ok) {
      return { ok: true, message: "Test message posted to Slack" };
    }
    const txt = await res.text();
    return {
      ok: false,
      message: `Slack rejected the webhook (HTTP ${res.status})\n${txt.slice(0, 400) || "(empty response body)"}`,
    };
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; cause?: { code?: string } };
    const code = e.code || e.cause?.code;
    return {
      ok: false,
      message: `${code ? code + " — " : ""}${e.message || "Request failed"}`,
    };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    config?: Record<string, string>;
  };
  const cfg = await loadEffectiveConfig(provider, body.config);

  let result: TestResult;
  if (provider === "backblaze_b2") result = await testB2(cfg);
  else if (provider === "resend") result = await testResend(cfg);
  else if (provider === "smtp") result = await testSmtp(cfg);
  else if (provider === "slack") result = await testSlack(cfg);
  else result = { ok: false, message: "No test handler" };

  return NextResponse.json(result);
}
