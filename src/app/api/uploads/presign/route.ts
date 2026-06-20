import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { getUploadUrl } from "@/lib/b2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transfer_id, file_id, storage_path, content_type } = body;

    if (!transfer_id || !file_id || !storage_path) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: transfer } = await supabase
      .from("transfers")
      .select("id")
      .eq("id", transfer_id)
      .single();

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    const url = await getUploadUrl(
      storage_path,
      content_type || "application/octet-stream"
    );

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
