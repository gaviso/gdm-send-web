import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getDownloadUrl } from "@/lib/b2";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const avatarPath = user.user_metadata?.avatar_path as string | undefined;
    let avatarUrl: string | null = null;
    if (avatarPath) {
      try {
        avatarUrl = await getDownloadUrl(avatarPath, 3600);
      } catch {
        avatarUrl = null;
      }
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata?.full_name as string) || "",
      avatar_path: avatarPath || null,
      avatar_url: avatarUrl,
      created_at: user.created_at,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
