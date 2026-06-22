import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/mailer";
import {
  renderEmailWithMaster,
  getTemplateDefinition,
  SAMPLE_VARS,
  type EmailTemplateKey,
} from "@/lib/email-templates";

export const runtime = "nodejs";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(
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
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }
  if (def.isLayout) {
    return NextResponse.json(
      { ok: false, message: "Layouts can't be sent on their own" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    to?: string;
    subject?: string;
    body?: string;
  };

  const to = (body.to ?? "").trim();
  if (!isValidEmail(to)) {
    return NextResponse.json(
      { ok: false, message: "Invalid recipient email" },
      { status: 400 }
    );
  }

  const overrideSubject = body.subject?.trim() ?? "";
  const overrideBody = body.body?.trim() ?? "";

  const admin = createAdminClient();

  // Custom loader: for the message key we're testing, use the form's
  // current values; for everything else (the master layout), fall back
  // to the DB row or built-in default.
  const loadOverride = async (k: EmailTemplateKey) => {
    if (k === (key as EmailTemplateKey)) {
      return {
        subject: overrideSubject,
        body: overrideBody,
        is_enabled: true,
      };
    }
    const { data } = await admin
      .from("email_templates")
      .select("subject, body, is_enabled")
      .eq("key", k)
      .maybeSingle();
    return data ?? null;
  };

  const vars: Record<string, string> = { ...SAMPLE_VARS };
  const rendered = await renderEmailWithMaster(
    key as EmailTemplateKey,
    vars,
    loadOverride
  );

  if (!rendered) {
    return NextResponse.json(
      { ok: false, message: "Template is disabled or failed to render" },
      { status: 400 }
    );
  }

  const subject = `[TEST] ${rendered.subject}`;
  const result = await sendEmail({
    to,
    subject,
    body: rendered.body,
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      message: result.error || "Send failed",
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Test sent to ${to}${result.channel ? ` via ${result.channel}` : ""}`,
  });
}
