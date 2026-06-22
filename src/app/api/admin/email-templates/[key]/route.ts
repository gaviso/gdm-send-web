import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { getTemplateDefinition } from "@/lib/email-templates";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  const def = getTemplateDefinition(key);
  if (!def) {
    return NextResponse.json(
      { error: "Unknown template" },
      { status: 400 }
    );
  }

  const body = (await request.json()) as {
    subject?: string;
    body?: string;
    is_enabled?: boolean;
  };

  const subject = (body.subject ?? "").trim();
  const text = (body.body ?? "").trim();
  if (!def.isLayout && !subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }
  if (def.isLayout && !text.includes("{{content}}")) {
    return NextResponse.json(
      { error: "Layout body must include {{content}}" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("email_templates").upsert({
    key,
    subject,
    body: text,
    is_enabled: body.is_enabled ?? true,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save template" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  const def = getTemplateDefinition(key);
  if (!def) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("email_templates").delete().eq("key", key);

  if (error) {
    return NextResponse.json(
      { error: "Failed to reset template" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
