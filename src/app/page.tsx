"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shield, Zap, Clock } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import TransferForm from "@/components/TransferForm";
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
    message?: string
  ) => {
    setError(null);
    try {
      const transferId = await uploadFiles(name, email, message);
      toast.success("Files sent successfully!");
      router.push(`/transfer/${transferId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-brand-50/30">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
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

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr,380px]">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Send files to our team
            </h2>
            <p className="mt-3 text-lg text-gray-600">
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
              <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Secure transfer
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Files are encrypted and stored securely.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Zap className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    No account needed
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Just add your files and send.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Up to 5 GB
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Large files are handled with ease.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Your details
              </h3>
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

      <footer className="border-t border-gray-200 bg-white/60">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Gaviso. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
