"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, File as FileIcon, ArrowLeft, Copy, Check } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
            Transfer not found
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-gray-950 dark:text-gray-50">
                GDM Send
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">by Gaviso</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-12">
        <div className="card-pad text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-50 ring-1 ring-success-100 dark:bg-success-500/15 dark:ring-success-500/30">
            <CheckCircle2 className="h-6 w-6 text-success-600 dark:text-success-400" strokeWidth={1.75} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
            Files sent
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Your files have been delivered to our team. We&apos;ll be in touch
            if needed.
          </p>

          <div className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400">Transfer ID</span>
            <code className="u-mono font-medium text-gray-950 dark:text-gray-50">
              {(params.id as string).slice(0, 8)}
            </code>
            <button
              onClick={handleCopyId}
              className="ml-0.5 flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
              aria-label="Copy transfer ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-success-600 dark:text-success-400" strokeWidth={2} />
              ) : (
                <Copy className="h-3 w-3" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        <div className="card-pad mt-6">
          <h2 className="text-sm font-semibold text-gray-950 dark:text-gray-50 mb-4">
            Transfer details
          </h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">From</dt>
              <dd className="mt-0.5 font-medium text-gray-950 dark:text-gray-50">
                {transfer.sender_name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="mt-0.5 font-medium text-gray-950 dark:text-gray-50 u-mono text-[13px]">
                {transfer.sender_email}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Sent</dt>
              <dd className="mt-0.5 font-medium text-gray-950 dark:text-gray-50">
                {formatDate(transfer.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400">Expires</dt>
              <dd className="mt-0.5 font-medium text-gray-950 dark:text-gray-50">
                {formatDate(transfer.expires_at)}
              </dd>
            </div>
            {transfer.subject && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500 dark:text-gray-400">Subject</dt>
                <dd className="mt-0.5 font-medium text-gray-950 dark:text-gray-50">
                  {transfer.subject}
                </dd>
              </div>
            )}
          </dl>

          {transfer.message && (
            <div className="mt-5 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 p-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{transfer.message}</p>
            </div>
          )}

          <div className="mt-5 border-t border-gray-200 dark:border-gray-800 pt-5">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Files · {transfer.files.length}
            </h3>
            <ul className="space-y-1">
              {transfer.files.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <FileIcon className="h-4 w-4 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 truncate text-gray-950 dark:text-gray-50">
                    {file.filename}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 u-mono u-tnum">
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Send more files
          </Link>
        </div>
      </main>
    </div>
  );
}
