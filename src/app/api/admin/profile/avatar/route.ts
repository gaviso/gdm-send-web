import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getUploadUrl, deleteFile } from "@/lib/b2";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content_type, file_size } = body as {
      content_type?: string;
      file_size?: number;
    };

    if (!content_type || !ALLOWED_TYPES.includes(content_type)) {
      return NextResponse.json(
        { error: "Unsupported image type" },
        { status: 400 }
      );
    }
    if (typeof file_size !== "number" || file_size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Avatar must be 5 MB or smaller" },
        { status: 400 }
      );
    }

    const ext = content_type.split("/")[1];
    const storage_path = `avatars/${user.id}-${uuidv4()}.${ext}`;
    const url = await getUploadUrl(storage_path, content_type);

    return NextResponse.json({ url, storage_path });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const avatarPath = user.user_metadata?.avatar_path as string | undefined;
    if (avatarPath) {
      try {
        await deleteFile(avatarPath);
      } catch {
        // ignore — file may already be gone
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
