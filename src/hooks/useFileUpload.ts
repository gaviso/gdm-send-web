"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase";
import type { UploadingFile, CreateTransferPayload } from "@/types";
import { MAX_TRANSFER_SIZE } from "@/lib/utils";

export function useFileUpload() {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);

  const addFiles = useCallback((newFiles: File[]) => {
    const uploadingFiles: UploadingFile[] = newFiles.map((file) => ({
      file,
      id: uuidv4(),
      progress: 0,
      status: "pending" as const,
    }));

    setFiles((prev) => {
      const combined = [...prev, ...uploadingFiles];
      return combined;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setTransferId(null);
    setOverallProgress(0);
  }, []);

  const getTotalSize = useCallback(() => {
    return files.reduce((acc, f) => acc + f.file.size, 0);
  }, [files]);

  const validateFiles = useCallback(() => {
    const totalSize = getTotalSize();
    if (totalSize > MAX_TRANSFER_SIZE) {
      return `Total size exceeds the ${(MAX_TRANSFER_SIZE / 1073741824).toFixed(0)} GB limit`;
    }
    if (files.length === 0) {
      return "Please add at least one file";
    }
    return null;
  }, [files, getTotalSize]);

  const uploadFiles = useCallback(
    async (senderName: string, senderEmail: string, message?: string) => {
      const validationError = validateFiles();
      if (validationError) throw new Error(validationError);

      setIsUploading(true);
      const supabase = createClient();

      try {
        const payload: CreateTransferPayload = {
          sender_name: senderName,
          sender_email: senderEmail,
          message,
          files: files.map((f) => ({
            filename: f.file.name,
            file_size: f.file.size,
            mime_type: f.file.type || "application/octet-stream",
          })),
        };

        const response = await fetch("/api/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create transfer");
        }

        const transfer = await response.json();
        setTransferId(transfer.id);

        const fileRecords = transfer.files as {
          id: string;
          storage_path: string;
          filename: string;
        }[];

        let completedBytes = 0;
        const totalBytes = files.reduce((acc, f) => acc + f.file.size, 0);

        for (let i = 0; i < files.length; i++) {
          const uploadingFile = files[i];
          const fileRecord = fileRecords[i];

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id ? { ...f, status: "uploading" } : f
            )
          );

          const { error } = await supabase.storage
            .from("transfers")
            .upload(fileRecord.storage_path, uploadingFile.file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (error) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id
                  ? { ...f, status: "error", error: error.message }
                  : f
              )
            );
            throw new Error(`Failed to upload ${uploadingFile.file.name}`);
          }

          completedBytes += uploadingFile.file.size;
          const progress = Math.round((completedBytes / totalBytes) * 100);
          setOverallProgress(progress);

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id
                ? { ...f, status: "completed", progress: 100 }
                : f
            )
          );
        }

        await fetch(`/api/transfers/${transfer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });

        return transfer.id;
      } catch (error) {
        setIsUploading(false);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [files, validateFiles]
  );

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    getTotalSize,
    validateFiles,
    uploadFiles,
    isUploading,
    transferId,
    overallProgress,
  };
}
