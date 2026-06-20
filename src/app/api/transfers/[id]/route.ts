import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { deleteFiles } from "@/lib/b2";

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

    return NextResponse.json({ ...transfer, files: files || [] });
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
