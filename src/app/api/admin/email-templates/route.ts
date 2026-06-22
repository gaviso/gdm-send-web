import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { EMAIL_TEMPLATES } from "@/lib/email-templates";

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
    .from("email_templates")
    .select("key, subject, body, is_enabled, updated_at");

  const overrides = new Map<
    string,
    {
      subject: string;
      body: string;
      is_enabled: boolean;
      updated_at: string;
    }
  >();
  for (const row of rows || []) {
    overrides.set(row.key, {
      subject: row.subject,
      body: row.body,
      is_enabled: row.is_enabled,
      updated_at: row.updated_at,
    });
  }

  const templates = EMAIL_TEMPLATES.map((def) => {
    const override = overrides.get(def.key);
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      audience: def.audience,
      is_layout: !!def.isLayout,
      variables: def.variables,
      subject: override?.subject ?? def.defaultSubject,
      body: override?.body ?? def.defaultBody,
      is_enabled: override?.is_enabled ?? true,
      is_default: !override,
      updated_at: override?.updated_at ?? null,
      default_subject: def.defaultSubject,
      default_body: def.defaultBody,
    };
  });

  return NextResponse.json({ templates });
}
