"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  File as FileIcon,
  Image,
  Film,
  Music,
  FileText,
  Archive,
  Table,
  Check,
  AlertCircle,
} from "lucide-react";
import { formatBytes, getFileIcon } from "@/lib/utils";
import type { UploadingFile } from "@/types";

const iconMap: Record<string, React.ReactNode> = {
  image: <Image className="h-4 w-4" strokeWidth={1.75} />,
  video: <Film className="h-4 w-4" strokeWidth={1.75} />,
  music: <Music className="h-4 w-4" strokeWidth={1.75} />,
  "file-text": <FileText className="h-4 w-4" strokeWidth={1.75} />,
  archive: <Archive className="h-4 w-4" strokeWidth={1.75} />,
  table: <Table className="h-4 w-4" strokeWidth={1.75} />,
  file: <FileIcon className="h-4 w-4" strokeWidth={1.75} />,
};

interface FileUploaderProps {
  files: UploadingFile[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  disabled?: boolean;
}

export default function FileUploader({
  files,
  onAddFiles,
  onRemoveFile,
  disabled,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onAddFiles(acceptedFiles);
    },
    [onAddFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    noClick: files.length > 0,
  });

  if (files.length === 0) {
    return (
      <div
        {...getRootProps()}
        className={`relative rounded-lg border border-dashed p-10 text-center transition-all duration-150 ${
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/60 cursor-pointer dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-gray-600 dark:hover:bg-gray-900"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white border border-gray-200 text-gray-700 shadow-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300">
            <Upload className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-950 dark:text-gray-50">
              Drop your files here
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              or click to browse — up to 5 GB per transfer
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div {...getRootProps()} className="p-2">
        <input {...getInputProps()} />
        <div className="space-y-1">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors duration-150"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {iconMap[getFileIcon(f.file.type)] || iconMap.file}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-950 dark:text-gray-50">
                  {f.file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 u-mono u-tnum">
                  {formatBytes(f.file.size)}
                </p>
              </div>

              {f.status === "uploading" && (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-600 dark:bg-brand-500 transition-all"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 u-tnum w-8 text-right">
                    {f.progress}%
                  </span>
                </div>
              )}

              {f.status === "completed" && (
                <span className="badge badge-success">
                  <Check className="h-3 w-3" strokeWidth={2} />
                  Done
                </span>
              )}

              {f.status === "error" && (
                <span className="badge badge-danger">
                  <AlertCircle className="h-3 w-3" strokeWidth={2} />
                  Failed
                </span>
              )}

              {(f.status === "pending" || f.status === "error") && !disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(f.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {!disabled && (
        <div className="border-t border-gray-200 dark:border-gray-800 px-2 py-2">
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            Add more files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  onAddFiles(Array.from(e.target.files));
                  e.target.value = "";
                }
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
