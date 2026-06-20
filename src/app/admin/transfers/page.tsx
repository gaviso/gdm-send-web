"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import TransferTable from "@/components/admin/TransferTable";
import { toast } from "sonner";
import type { Transfer } from "@/types";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "uploading", label: "Uploading" },
  { value: "expired", label: "Expired" },
];

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
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
            Transfers
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total} total transfer{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={fetchTransfers}
          disabled={loading}
          className="btn-secondary"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            strokeWidth={1.75}
          />
          Refresh
        </button>
      </div>

      <div className="flex gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-px">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`relative px-3 py-2 -mb-px text-[13px] font-medium transition-colors duration-150 border-b-2 ${
                active
                  ? "border-gray-950 text-gray-950 dark:border-gray-50 dark:text-gray-50"
                  : "border-transparent text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <TransferTable
        transfers={transfers}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onView={handleView}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary btn-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
