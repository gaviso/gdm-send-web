"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import TransferTable from "@/components/admin/TransferTable";
import { toast } from "sonner";
import type { Transfer } from "@/types";

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/transfers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.transfers);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transfer and all its files?")) return;
    const res = await fetch(`/api/transfers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Transfer deleted");
      fetchTransfers();
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} total transfer{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={fetchTransfers}
          disabled={loading}
          className="btn-secondary gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="flex gap-2">
        {["", "completed", "uploading", "expired"].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === status
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {status || "All"}
          </button>
        ))}
      </div>

      <TransferTable
        transfers={transfers}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onView={handleView}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
