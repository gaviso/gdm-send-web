import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { getIntegrationConfig } from "@/lib/integrations";

const EVENT_TYPES = [
  {
    id: "new_transfer",
    label: "New transfer received",
    description: "When someone sends files to the team",
  },
  {
    id: "transfer_expiring_soon",
    label: "Transfer expiring soon",
    description: "Sent 24 hours before a transfer expires",
  },
  {
    id: "transfer_expired",
    label: "Transfer expired",
    description: "When a transfer reaches its expiry date",
  },
] as const;

const CHANNELS = ["email", "slack"] as const;
type Channel = (typeof CHANNELS)[number];

function isChannel(s: string): s is Channel {
  return (CHANNELS as readonly string[]).includes(s);
}

async function isEmailChannelConfigured(): Promise<boolean> {
  const resend = await getIntegrationConfig("resend");
  if (resend?.api_key) return true;
  if (process.env.RESEND_API_KEY) return true;
  const smtp = await getIntegrationConfig("smtp");
  if (smtp?.password) return true;
  if (process.env.SMTP_PASSWORD) return true;
  return false;
}

async function isSlackChannelConfigured(): Promise<boolean> {
  const slack = await getIntegrationConfig("slack");
  if (slack?.webhook_url) return true;
  if (process.env.SLACK_WEBHOOK_URL) return true;
  return false;
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
    .from("notification_preferences")
    .select("channel, event_type, is_enabled");

  const prefs = new Map<string, boolean>();
  for (const row of rows || []) {
    prefs.set(`${row.channel}:${row.event_type}`, row.is_enabled);
  }

  const [emailConfigured, slackConfigured, notificationEmail] =
    await Promise.all([
      isEmailChannelConfigured(),
      isSlackChannelConfigured(),
      getNotificationEmail(),
    ]);

  const channels = CHANNELS.map((channel) => ({
    channel,
    configured:
      channel === "email" ? emailConfigured : slackConfigured,
    destination:
      channel === "email"
        ? notificationEmail
        : slackConfigured
          ? "Configured webhook"
          : null,
    events: EVENT_TYPES.map((e) => ({
      id: e.id,
      label: e.label,
      description: e.description,
      enabled: prefs.get(`${channel}:${e.id}`) ?? false,
    })),
  }));

  return NextResponse.json({ channels });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    channel?: string;
    event_type?: string;
    is_enabled?: boolean;
  };

  if (!body.channel || !isChannel(body.channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }
  if (
    !body.event_type ||
    !EVENT_TYPES.some((e) => e.id === body.event_type)
  ) {
    return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
  }
  if (typeof body.is_enabled !== "boolean") {
    return NextResponse.json(
      { error: "is_enabled must be a boolean" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("notification_preferences").upsert({
    channel: body.channel,
    event_type: body.event_type,
    is_enabled: body.is_enabled,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
