"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import StatsCards from "@/components/admin/StatsCards";
import TransferTable from "@/components/admin/TransferTable";
import { toast } from "sonner";
import type { Transfer } from "@/types";

interface Stats {
  totalTransfers: number;
  activeTransfers: number;
  totalStorage: number;
  totalDownloads: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, transfersRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/transfers?limit=5"),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (transfersRes.ok) {
          const data = await transfersRes.json();
          setRecentTransfers(data.transfers);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transfer and all its files?")) return;
    const res = await fetch(`/api/transfers/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRecentTransfers((prev) => prev.filter((t) => t.id !== id));
      toast.success("Transfer deleted");
    } else {
      toast.error("Failed to delete transfer");
    }
  };

  const handleDownload = async (id: string) => {
    const res = await fetch(`/api/admin/transfers/${id}/download`);
    if (res.ok) {
      const data = await res.json();
      for (const file of data.files) {
        if (file.url) window.open(file.url, "_blank");
      }
    } else {
      toast.error("Failed to generate download links");
    }
  };

  const handleView = (id: string) => {
    window.open(`/transfer/${id}`, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of file transfers
        </p>
      </div>

      <StatsCards stats={stats} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Transfers
          </h2>
          <Link
            href="/admin/transfers"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <TransferTable
          transfers={recentTransfers}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onView={handleView}
        />
      </div>
    </div>
  );
}
