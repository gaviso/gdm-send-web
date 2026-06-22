import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { deleteFiles } from "@/lib/b2";
import { notifyTransferReceived } from "@/lib/notify";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: transfer, error } = await supabase
      .from("transfers")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    const { data: files } = await supabase
      .from("files")
      .select("*")
      .eq("transfer_id", id)
      .order("created_at", { ascending: true });

    const { count: downloadCount } = await supabase
      .from("download_logs")
      .select("id", { count: "exact", head: true })
      .eq("transfer_id", id);

    return NextResponse.json({
      ...transfer,
      files: files || [],
      download_count: downloadCount ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const updates: Record<string, string> = {};
    if (body.status) updates.status = body.status;

    // Capture the previous state so we only fire notifications on the
    // first transition into "received" (avoids duplicate emails on retry).
    let previousStatus: string | null = null;
    if (updates.status === "received") {
      const { data: prev } = await supabase
        .from("transfers")
        .select("status")
        .eq("id", id)
        .maybeSingle();
      previousStatus = prev?.status ?? null;
    }

    const { error } = await supabase
      .from("transfers")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update transfer" },
        { status: 500 }
      );
    }

    if (updates.status === "received" && previousStatus !== "received") {
      const { data: transfer } = await supabase
        .from("transfers")
        .select(
          "id, sender_name, sender_email, subject, message, total_size, file_count, created_at, expires_at"
        )
        .eq("id", id)
        .single();

      if (transfer) {
        // Fire and forget — never block the API response on email delivery.
        notifyTransferReceived(transfer).catch((err) =>
          console.error(`[notify] dispatch failed for ${id}:`, err)
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: files } = await supabase
      .from("files")
      .select("storage_path")
      .eq("transfer_id", id);

    if (files && files.length > 0) {
      await deleteFiles(files.map((f) => f.storage_path));
    }

    const { error } = await supabase
      .from("transfers")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete transfer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
