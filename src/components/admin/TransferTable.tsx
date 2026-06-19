"use client";

import { useState } from "react";
import { Download, Trash2, Eye, MoreHorizontal } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";
import type { Transfer } from "@/types";

interface TransferTableProps {
  transfers: Transfer[];
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onView: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  completed:
    "bg-green-50 text-green-700 ring-green-600/20",
  uploading:
    "bg-blue-50 text-blue-700 ring-blue-600/20",
  expired:
    "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  deleted:
    "bg-red-50 text-red-700 ring-red-600/20",
};

export default function TransferTable({
  transfers,
  onDelete,
  onDownload,
  onView,
}: TransferTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (transfers.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">No transfers found</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Sender
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Files
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transfers.map((transfer) => (
              <tr
                key={transfer.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {transfer.sender_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transfer.sender_email}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {transfer.file_count}{" "}
                  {transfer.file_count === 1 ? "file" : "files"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {formatBytes(transfer.total_size)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      statusStyles[transfer.status] || statusStyles.completed
                    }`}
                  >
                    {transfer.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(transfer.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() =>
                        setOpenMenu(
                          openMenu === transfer.id ? null : transfer.id
                        )
                      }
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {openMenu === transfer.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenu(null)}
                        />
                        <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-200">
                          <button
                            onClick={() => {
                              onView(transfer.id);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          {transfer.status === "completed" && (
                            <button
                              onClick={() => {
                                onDownload(transfer.id);
                                setOpenMenu(null);
                              }}
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onDelete(transfer.id);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
