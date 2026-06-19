import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const [
      { count: totalTransfers },
      { count: activeTransfers },
      { data: transfers },
      { count: totalDownloads },
    ] = await Promise.all([
      admin
        .from("transfers")
        .select("*", { count: "exact", head: true }),
      admin
        .from("transfers")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      admin
        .from("transfers")
        .select("total_size")
        .eq("status", "completed"),
      admin
        .from("download_logs")
        .select("*", { count: "exact", head: true }),
    ]);

    const totalStorage = (transfers || []).reduce(
      (acc, t) => acc + (t.total_size || 0),
      0
    );

    return NextResponse.json({
      totalTransfers: totalTransfers || 0,
      activeTransfers: activeTransfers || 0,
      totalStorage,
      totalDownloads: totalDownloads || 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
