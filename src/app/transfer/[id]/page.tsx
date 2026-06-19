"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, FileIcon, ArrowLeft, Copy, Check } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";
import type { TransferWithFiles } from "@/types";

export default function TransferConfirmationPage() {
  const params = useParams();
  const [transfer, setTransfer] = useState<TransferWithFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchTransfer() {
      try {
        const res = await fetch(`/api/transfers/${params.id}`);
        if (res.ok) {
          setTransfer(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTransfer();
  }, [params.id]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(params.id as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50/30">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-brand-50/30">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Transfer not found
          </h2>
          <p className="mt-2 text-gray-500">
            This transfer may have expired or been deleted.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Send new files
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-brand-50/30">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
              G
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">GDM Send</h1>
              <p className="text-xs text-gray-500">by Gaviso</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="card text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Files sent successfully!
          </h2>
          <p className="mt-2 text-gray-600">
            Your files have been delivered to our team. We&apos;ll be in touch
            if needed.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm">
            <span className="text-gray-500">Transfer ID:</span>
            <code className="font-mono font-medium text-gray-900">
              {(params.id as string).slice(0, 8)}
            </code>
            <button
              onClick={handleCopyId}
              className="ml-1 rounded p-1 hover:bg-gray-200 transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div className="card mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Transfer details
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">From</dt>
              <dd className="font-medium text-gray-900">
                {transfer.sender_name}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">
                {transfer.sender_email}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Sent</dt>
              <dd className="font-medium text-gray-900">
                {formatDate(transfer.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Expires</dt>
              <dd className="font-medium text-gray-900">
                {formatDate(transfer.expires_at)}
              </dd>
            </div>
          </dl>

          {transfer.message && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-gray-700">{transfer.message}</p>
            </div>
          )}

          <div className="mt-4 border-t pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Files ({transfer.files.length})
            </h4>
            <ul className="space-y-2">
              {transfer.files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <FileIcon className="h-4 w-4 text-gray-400" />
                  <span className="flex-1 truncate text-gray-900">
                    {file.filename}
                  </span>
                  <span className="text-gray-500">
                    {formatBytes(file.file_size)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Send more files
          </Link>
        </div>
      </main>
    </div>
  );
}
