"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, Zap, HardDrive } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import TransferForm from "@/components/TransferForm";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { useFileUpload } from "@/hooks/useFileUpload";

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    files,
    addFiles,
    removeFile,
    getTotalSize,
    uploadFiles,
    isUploading,
    overallProgress,
  } = useFileUpload();

  const handleSubmit = async (
    name: string,
    email: string,
    subject: string,
    message: string
  ) => {
    setError(null);
    try {
      const transferId = await uploadFiles(name, email, subject, message);
      toast.success("Files sent successfully");
      router.push(`/transfer/${transferId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
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

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr,380px]">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950 dark:text-gray-50 sm:text-4xl">
              Send files to our team
            </h1>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400">
              Upload files up to 5 GB securely. No account needed.
            </p>

            <div className="mt-8">
              <FileUploader
                files={files}
                onAddFiles={addFiles}
                onRemoveFile={removeFile}
                disabled={isUploading}
              />
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400">
                {error}
              </div>
            )}

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <Feature
                icon={<Shield className="h-5 w-5" strokeWidth={1.75} />}
                title="Secure transfer"
                description="Files are encrypted in transit and stored on private infrastructure."
              />
              <Feature
                icon={<Zap className="h-5 w-5" strokeWidth={1.75} />}
                title="No account"
                description="Just add your files, your details, and send."
              />
              <Feature
                icon={<HardDrive className="h-5 w-5" strokeWidth={1.75} />}
                title="Up to 5 GB"
                description="Large files are handled with ease, no compression."
              />
            </div>

            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex items-center gap-4 flex-wrap">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sending from your phone? Get the iOS app.
              </p>
              <a
                href="https://apps.apple.com/app/gdm-send/id6766103102"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-opacity hover:opacity-80"
                aria-label="Download GDM Send on the App Store"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/app-store-badge.svg"
                  alt="Download on the App Store"
                  height={40}
                  className="h-10 w-auto block dark:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/app-store-badge-white.svg"
                  alt="Download on the App Store"
                  height={40}
                  className="h-10 w-auto hidden dark:block"
                />
              </a>
            </div>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="card-pad">
              <h2 className="text-lg font-semibold tracking-tight text-gray-950 dark:text-gray-50 mb-5">
                Your details
              </h2>
              <TransferForm
                totalSize={getTotalSize()}
                fileCount={files.length}
                isUploading={isUploading}
                overallProgress={overallProgress}
                onSubmit={handleSubmit}
                disabled={files.length === 0}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Gaviso Digital Marketing, LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">{title}</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
