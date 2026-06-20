"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  File as FileIcon,
  ArrowDownToLine,
  Mail,
  Calendar,
  Clock,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes, formatDate } from "@/lib/utils";
import type { Transfer, TransferWithFiles } from "@/types";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "received", label: "Received" },
  { value: "downloaded", label: "Downloaded" },
  { value: "uploading", label: "Uploading" },
  { value: "expired", label: "Expired" },
];

const statusClass: Record<string, string> = {
  received: "badge badge-success",
  downloaded: "badge badge-info",
  uploading: "badge bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700",
  expired: "badge badge-warning",
  deleted: "badge badge-danger",
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TransferWithFiles | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
        if (data.transfers.length > 0) {
          setSelectedId((prev) =>
            prev && data.transfers.find((t: Transfer) => t.id === prev)
              ? prev
              : data.transfers[0].id
          );
        } else {
          setSelectedId(null);
          setDetail(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/transfers/${selectedId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDetail(d))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transfer and all its files?")) return;
    const res = await fetch(`/api/transfers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Transfer deleted");
      if (selectedId === id) setSelectedId(null);
      fetchTransfers();
    } else {
      toast.error("Failed to delete transfer");
    }
  };

  const handleDownloadZip = (id: string, fileIds?: string[]) => {
    const url = fileIds && fileIds.length > 0
      ? `/api/admin/transfers/${id}/zip?ids=${fileIds.join(",")}`
      : `/api/admin/transfers/${id}/zip`;
    window.location.href = url;
    setTimeout(() => fetchTransfers(), 1500);
  };

  const handleDownloadFile = async (
    transferId: string,
    fileId: string
  ) => {
    const res = await fetch(
      `/api/admin/transfers/${transferId}/download?fileId=${fileId}`
    );
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
      setTimeout(() => fetchTransfers(), 1500);
    } else {
      toast.error("Failed to generate download link");
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] items-start">
        <div className="space-y-4 min-w-0">
          <div className="flex gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-px overflow-x-auto">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => {
                    setStatusFilter(f.value);
                    setPage(1);
                  }}
                  className={`relative px-3 py-2 -mb-px text-[13px] font-medium transition-colors duration-150 border-b-2 whitespace-nowrap ${
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

          {transfers.length === 0 ? (
            <div className="card flex flex-col items-center py-12">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No transfers yet
              </p>
            </div>
          ) : (
            <div className="card divide-y divide-gray-200 dark:divide-gray-800 overflow-hidden">
              {transfers.map((t) => {
                const selected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`relative w-full text-left px-5 py-3.5 transition-colors duration-150 ${
                      selected
                        ? "bg-gray-50 dark:bg-gray-800/40"
                        : "hover:bg-gray-50/60 dark:hover:bg-gray-800/30"
                    }`}
                  >
                    {selected && (
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gray-950 dark:bg-gray-50" />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm font-semibold text-gray-950 dark:text-gray-50 truncate">
                            {t.sender_name}
                          </p>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 u-mono shrink-0">
                            {t.id.slice(0, 8)}
                          </span>
                        </div>
                        <p
                          className="mt-0.5 text-sm text-gray-700 dark:text-gray-300 truncate"
                          title={t.subject || undefined}
                        >
                          {t.subject || (
                            <span className="text-gray-400 dark:text-gray-500 italic">
                              No subject
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 u-tnum">
                          {formatDate(t.created_at)} · {t.file_count}{" "}
                          {t.file_count === 1 ? "file" : "files"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p className="text-sm text-gray-950 dark:text-gray-50 u-mono u-tnum">
                          {formatBytes(t.total_size)}
                        </p>
                        <span
                          className={
                            statusClass[t.status] || statusClass.completed
                          }
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

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

        <div className="lg:mt-[56px] lg:sticky lg:top-8">
          {detailLoading && !detail ? (
            <div className="card-pad">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading…
              </p>
            </div>
          ) : detail ? (
            <DetailPanel
              transfer={detail}
              onView={() => handleView(detail.id)}
              onDownloadAll={() => handleDownloadZip(detail.id)}
              onDownloadSelected={(ids) => handleDownloadZip(detail.id, ids)}
              onDownloadFile={(fileId) =>
                handleDownloadFile(detail.id, fileId)
              }
              onDelete={() => handleDelete(detail.id)}
            />
          ) : (
            <div className="card-pad flex flex-col items-center text-center py-16">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a transfer to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  transfer,
  onView,
  onDownloadAll,
  onDownloadSelected,
  onDownloadFile,
  onDelete,
}: {
  transfer: TransferWithFiles;
  onView: () => void;
  onDownloadAll: () => void;
  onDownloadSelected: (fileIds: string[]) => void;
  onDownloadFile: (fileId: string) => void;
  onDelete: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [transfer.id]);

  const multiFile = transfer.files.length > 1;
  const allSelected =
    multiFile && selected.size === transfer.files.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(transfer.files.map((f) => f.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const downloadable =
    transfer.status === "received" || transfer.status === "downloaded";

  return (
    <div className="card-pad space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className={statusClass[transfer.status] || statusClass.received}>
          {transfer.status}
        </span>
        <div className="flex gap-2">
          <button onClick={onView} className="btn-secondary btn-sm">
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
            View
          </button>
          <button
            onClick={onDelete}
            className="btn-ghost btn-sm text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-500/10 dark:hover:text-danger-300"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 u-mono">
          {transfer.id.slice(0, 8)}
        </p>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Subject
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          {transfer.subject || (
            <span className="text-gray-400 dark:text-gray-500 italic">
              No subject
            </span>
          )}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {transfer.sender_name}{" "}
          <span className="text-gray-400 dark:text-gray-500">·</span>{" "}
          <a
            href={`mailto:${transfer.sender_email}`}
            className="u-mono text-brand-600 dark:text-brand-400 hover:underline"
          >
            {transfer.sender_email}
          </a>
        </p>
      </div>

      {transfer.message && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Mail className="h-3 w-3" strokeWidth={2} />
            Message
          </p>
          <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {transfer.message}
            </p>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 border-t border-gray-200 dark:border-gray-800 pt-4">
        <Stat
          icon={<Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Sent"
          value={formatDate(transfer.created_at)}
        />
        <Stat
          icon={<Clock className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Expires"
          value={formatDate(transfer.expires_at)}
        />
        <Stat
          icon={<HardDrive className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Size"
          value={formatBytes(transfer.total_size)}
          mono
        />
        <Stat
          icon={<ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Downloads"
          value={String(transfer.download_count ?? 0)}
          mono
        />
      </dl>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Files · {transfer.files.length}
          </p>
          {multiFile && (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-950 focus:ring-brand-500"
              />
              Select all
            </label>
          )}
        </div>
        <ul className="border border-gray-200 dark:border-gray-800 rounded-md divide-y divide-gray-200 dark:divide-gray-800">
          {transfer.files.map((file) => {
            const isSelected = selected.has(file.id);
            return (
              <li
                key={file.id}
                className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "bg-gray-50 dark:bg-gray-800/40"
                    : ""
                }`}
              >
                {multiFile && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(file.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-950 focus:ring-brand-500"
                    aria-label={`Select ${file.filename}`}
                  />
                )}
                <FileIcon
                  className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
                  strokeWidth={1.75}
                />
                <span className="flex-1 truncate text-gray-950 dark:text-gray-50">
                  {file.filename}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 u-mono u-tnum">
                  {formatBytes(file.file_size)}
                </span>
                {downloadable && (
                  <button
                    onClick={() => onDownloadFile(file.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 transition-colors"
                    aria-label={`Download ${file.filename}`}
                    title="Download this file"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {downloadable && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          {multiFile ? (
            <button
              onClick={() =>
                selected.size > 0
                  ? onDownloadSelected(Array.from(selected))
                  : onDownloadAll()
              }
              className="btn-primary w-full"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              {selected.size > 0
                ? `Download ${selected.size} selected (.zip)`
                : "Download all (.zip)"}
            </button>
          ) : (
            <button
              onClick={() => onDownloadFile(transfer.files[0].id)}
              className="btn-primary w-full"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Download
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm font-medium text-gray-950 dark:text-gray-50 ${
          mono ? "u-mono u-tnum" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
