import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    const admin = createAdminClient();

    if (fileId) {
      const { data: file } = await admin
        .from("files")
        .select("*")
        .eq("id", fileId)
        .eq("transfer_id", id)
        .single();

      if (!file) {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        );
      }

      const { data: signedUrl } = await admin.storage
        .from("transfers")
        .createSignedUrl(file.storage_path, 3600);

      if (!signedUrl) {
        return NextResponse.json(
          { error: "Failed to generate download URL" },
          { status: 500 }
        );
      }

      await admin.from("download_logs").insert({
        transfer_id: id,
        file_id: fileId,
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
      });

      return NextResponse.json({ url: signedUrl.signedUrl });
    }

    const { data: files } = await admin
      .from("files")
      .select("*")
      .eq("transfer_id", id);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files found" },
        { status: 404 }
      );
    }

    const urls = await Promise.all(
      files.map(async (file) => {
        const { data } = await admin.storage
          .from("transfers")
          .createSignedUrl(file.storage_path, 3600);
        return {
          filename: file.filename,
          url: data?.signedUrl,
        };
      })
    );

    await admin.from("download_logs").insert({
      transfer_id: id,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip"),
    });

    return NextResponse.json({ files: urls });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
