import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getB2Client } from "@/lib/b2";
import { Readable } from "node:stream";
import * as archiverNs from "archiver";
import type { Archiver, ArchiverOptions } from "archiver";

// The @types/archiver v8 namespace doesn't expose the default callable export,
// so wrap it as the function the runtime actually provides.
const archiver = archiverNs as unknown as (
  format: "zip" | "tar" | "json",
  options?: ArchiverOptions
) => Archiver;

export const runtime = "nodejs";
export const maxDuration = 300;

function safeFilename(input: string, fallback: string): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");
  const fileIds = idsParam
    ? idsParam.split(",").filter(Boolean)
    : null;

  const admin = createAdminClient();

  const { data: transfer } = await admin
    .from("transfers")
    .select("subject")
    .eq("id", id)
    .single();

  if (!transfer) {
    return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  }

  let query = admin
    .from("files")
    .select("id, filename, storage_path")
    .eq("transfer_id", id);

  if (fileIds && fileIds.length > 0) {
    query = query.in("id", fileIds);
  }

  const { data: files } = await query;

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 404 });
  }

  const archive = archiver("zip", { zlib: { level: 0 } });

  archive.on("warning", (err) => {
    if (err.code !== "ENOENT") {
      console.error("Archive warning:", err);
    }
  });
  archive.on("error", (err) => {
    console.error("Archive error:", err);
  });

  const { client: s3, config: b2Config } = await getB2Client();

  (async () => {
    try {
      for (const file of files) {
        const obj = await s3.send(
          new GetObjectCommand({
            Bucket: b2Config.bucket,
            Key: file.storage_path,
          })
        );
        if (obj.Body) {
          archive.append(obj.Body as Readable, { name: file.filename });
        }
      }
      await archive.finalize();
    } catch (err) {
      console.error("Zip pipeline error:", err);
      archive.abort();
    }
  })();

  await admin.from("download_logs").insert({
    transfer_id: id,
    ip_address:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip"),
  });

  await admin
    .from("transfers")
    .update({ status: "downloaded" })
    .eq("id", id)
    .eq("status", "received");

  const baseName = safeFilename(transfer.subject || "transfer", "transfer");
  const filename = `${baseName}.zip`;

  const stream = Readable.toWeb(archive) as ReadableStream<Uint8Array>;

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
