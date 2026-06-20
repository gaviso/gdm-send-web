import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { generateExpiryDate } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import type { CreateTransferPayload } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: CreateTransferPayload = await request.json();

    if (!body.sender_name?.trim() || !body.sender_email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (!body.files?.length) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      );
    }

    const totalSize = body.files.reduce((acc, f) => acc + f.file_size, 0);
    const maxSize = Number(process.env.NEXT_PUBLIC_MAX_TRANSFER_SIZE || 5368709120);

    if (totalSize > maxSize) {
      return NextResponse.json(
        { error: "Transfer size exceeds the maximum allowed" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: settings } = await supabase
      .from("settings")
      .select("key, value")
      .eq("key", "transfer_expiry_days")
      .single();

    const expiryDays = settings ? Number(settings.value) : 30;
    const transferId = uuidv4();

    const { error: transferError } = await supabase.from("transfers").insert({
      id: transferId,
      sender_name: body.sender_name.trim(),
      sender_email: body.sender_email.trim(),
      message: body.message?.trim() || null,
      total_size: totalSize,
      file_count: body.files.length,
      status: "uploading",
      expires_at: generateExpiryDate(expiryDays),
    });

    if (transferError) {
      return NextResponse.json(
        { error: "Failed to create transfer" },
        { status: 500 }
      );
    }

    const fileRecords = body.files.map((f) => {
      const fileId = uuidv4();
      const storagePath = `${transferId}/${fileId}-${f.filename}`;
      return {
        id: fileId,
        transfer_id: transferId,
        filename: f.filename,
        file_size: f.file_size,
        mime_type: f.mime_type || "application/octet-stream",
        storage_path: storagePath,
      };
    });

    const { error: filesError } = await supabase
      .from("files")
      .insert(fileRecords);

    if (filesError) {
      await supabase.from("transfers").delete().eq("id", transferId);
      return NextResponse.json(
        { error: "Failed to create file records" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: transferId,
      files: fileRecords.map((f) => ({
        id: f.id,
        filename: f.filename,
        storage_path: f.storage_path,
        mime_type: f.mime_type,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("transfers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch transfers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transfers: data,
      total: count,
      page,
      limit,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
