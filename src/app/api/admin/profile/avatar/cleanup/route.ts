import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { deleteFile } from "@/lib/b2";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = (await request.json()) as { path?: string };
    if (!path || !path.startsWith(`avatars/${user.id}-`)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    try {
      await deleteFile(path);
    } catch {
      // ignore — file may already be gone
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to clean up avatar" },
      { status: 500 }
    );
  }
}
