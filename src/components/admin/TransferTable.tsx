"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Trash2, Eye, MoreHorizontal, ArrowDownToLine } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";
import type { Transfer } from "@/types";

interface TransferTableProps {
  transfers: Transfer[];
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onView: (id: string) => void;
}

const statusClass: Record<string, string> = {
  received: "badge badge-success",
  downloaded: "badge badge-info",
  uploading: "badge bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700",
  expired: "badge badge-warning",
  deleted: "badge badge-danger",
};

function ActionMenu({
  status,
  isOpen,
  onToggle,
  onClose,
  onView,
  onDownload,
  onDelete,
}: {
  transferId: string;
  status: string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right - 168 });
    }
  }, [isOpen]);

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        onClick={onToggle}
        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 transition-colors"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={onClose} />
          <div
            className="fixed z-[9999] w-[168px] rounded-md border border-gray-200 bg-white py-1 shadow-md dark:border-gray-800 dark:bg-gray-900"
            style={{ top: pos.top, left: pos.left }}
          >
            <button
              onClick={onView}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
              View
            </button>
            {(status === "received" || status === "downloaded") && (
              <button
                onClick={onDownload}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                Download
              </button>
            )}
            <div className="my-1 h-px bg-gray-150 dark:bg-gray-800" />
            <button
              onClick={onDelete}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TransferTable({
  transfers,
  onDelete,
  onDownload,
  onView,
}: TransferTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (transfers.length === 0) {
    return (
      <div className="card flex flex-col items-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">No transfers yet</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Sender
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Subject
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Files
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Size
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Downloads
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Date
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {transfers.map((transfer) => (
              <tr
                key={transfer.id}
                className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
              >
                <td className="px-5 py-3">
                  <p className="text-sm font-medium text-gray-950 dark:text-gray-50">
                    {transfer.sender_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 u-mono">
                    {transfer.sender_email}
                  </p>
                </td>
                <td className="px-5 py-3 max-w-[260px]">
                  <p
                    className="text-sm text-gray-950 dark:text-gray-50 truncate"
                    title={transfer.subject || undefined}
                  >
                    {transfer.subject || (
                      <span className="text-gray-400 dark:text-gray-500 italic">
                        No subject
                      </span>
                    )}
                  </p>
                  {transfer.message && (
                    <p
                      className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
                      title={transfer.message}
                    >
                      {transfer.message}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 u-tnum">
                  {transfer.file_count}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300 u-mono u-tnum">
                  {formatBytes(transfer.total_size)}
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1.5 u-tnum">
                    <ArrowDownToLine className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" strokeWidth={1.75} />
                    {transfer.download_count ?? 0}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={statusClass[transfer.status] || statusClass.completed}>
                    {transfer.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(transfer.created_at)}
                </td>
                <td className="px-5 py-3 text-right">
                  <ActionMenu
                    transferId={transfer.id}
                    status={transfer.status}
                    isOpen={openMenu === transfer.id}
                    onToggle={() => setOpenMenu(openMenu === transfer.id ? null : transfer.id)}
                    onClose={() => setOpenMenu(null)}
                    onView={() => { onView(transfer.id); setOpenMenu(null); }}
                    onDownload={() => { onDownload(transfer.id); setOpenMenu(null); }}
                    onDelete={() => { onDelete(transfer.id); setOpenMenu(null); }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
