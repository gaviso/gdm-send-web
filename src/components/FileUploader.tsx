"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileIcon, Image, Film, Music, FileText, Archive, Table } from "lucide-react";
import { formatBytes, getFileIcon } from "@/lib/utils";
import type { UploadingFile } from "@/types";

const iconMap: Record<string, React.ReactNode> = {
  image: <Image className="h-5 w-5 text-purple-500" />,
  video: <Film className="h-5 w-5 text-blue-500" />,
  music: <Music className="h-5 w-5 text-pink-500" />,
  "file-text": <FileText className="h-5 w-5 text-orange-500" />,
  archive: <Archive className="h-5 w-5 text-yellow-600" />,
  table: <Table className="h-5 w-5 text-green-500" />,
  file: <FileIcon className="h-5 w-5 text-gray-400" />,
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

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragActive
            ? "border-brand-500 bg-brand-50"
            : files.length > 0
              ? "border-gray-200 bg-gray-50/50"
              : "border-gray-300 bg-white hover:border-brand-400 hover:bg-brand-50/50 cursor-pointer"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />

        {files.length === 0 ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-brand-100 p-4">
              <Upload className="h-8 w-8 text-brand-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Drop your files here
              </p>
              <p className="mt-1 text-sm text-gray-500">
                or click to browse. Up to 5 GB per transfer.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200"
              >
                {iconMap[getFileIcon(f.file.type)] || iconMap.file}
                <div className="flex-1 min-w-0 text-left">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {f.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(f.file.size)}
                  </p>
                </div>

                {f.status === "uploading" && (
                  <div className="w-24">
                    <div className="h-1.5 rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-brand-500 transition-all"
                        style={{ width: `${f.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {f.status === "completed" && (
                  <span className="text-xs font-medium text-green-600">
                    Done
                  </span>
                )}

                {f.status === "error" && (
                  <span className="text-xs font-medium text-red-600">
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
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            {!disabled && (
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors">
                <Upload className="h-4 w-4" />
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
