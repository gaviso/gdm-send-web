import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { invalidateB2Cache } from "@/lib/b2";
import { invalidateIntegrationCache } from "@/lib/integrations";

const KNOWN_PROVIDERS = ["backblaze_b2", "resend", "smtp", "slack"] as const;
type Provider = (typeof KNOWN_PROVIDERS)[number];

const REQUIRED_FIELDS: Record<Provider, readonly string[]> = {
  backblaze_b2: ["endpoint", "region", "bucket", "key_id", "app_key"],
  resend: ["api_key", "from_email", "from_name"],
  smtp: ["host", "port", "username", "password", "from_email"],
  slack: ["webhook_url"],
};

const OPTIONAL_FIELDS: Record<Provider, readonly string[]> = {
  backblaze_b2: [],
  resend: ["reply_to", "bcc"],
  smtp: [],
  slack: [],
};

function isKnownProvider(p: string): p is Provider {
  return (KNOWN_PROVIDERS as readonly string[]).includes(p);
}

function bumpCache(provider: Provider) {
  invalidateIntegrationCache(provider);
  if (provider === "backblaze_b2") invalidateB2Cache();
}

export async function PUT(
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
  if (!isKnownProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const body = (await request.json()) as { config?: Record<string, string> };
  const incoming = body.config || {};
  const cleaned: Record<string, string> = {};

  for (const field of REQUIRED_FIELDS[provider]) {
    const v = incoming[field];
    if (typeof v !== "string" || !v.trim()) {
      return NextResponse.json(
        { error: `Missing or empty field: ${field}` },
        { status: 400 }
      );
    }
    cleaned[field] = v.trim();
  }
  for (const field of OPTIONAL_FIELDS[provider]) {
    const v = incoming[field];
    if (typeof v === "string" && v.trim()) {
      cleaned[field] = v.trim();
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("integrations")
    .upsert({
      provider,
      config: cleaned,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save integration" },
      { status: 500 }
    );
  }

  bumpCache(provider);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
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
  if (!isKnownProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("integrations")
    .delete()
    .eq("provider", provider);

  if (error) {
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  bumpCache(provider);

  return NextResponse.json({ ok: true });
}
