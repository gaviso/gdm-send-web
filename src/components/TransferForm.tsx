"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface TransferFormProps {
  totalSize: number;
  fileCount: number;
  isUploading: boolean;
  overallProgress: number;
  onSubmit: (name: string, email: string, message?: string) => void;
  disabled?: boolean;
}

export default function TransferForm({
  totalSize,
  fileCount,
  isUploading,
  overallProgress,
  onSubmit,
  disabled,
}: TransferFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSubmit(name.trim(), email.trim(), message.trim() || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Your name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="input-field"
          disabled={isUploading}
        />
      </div>

      <div>
        <label htmlFor="email" className="label">
          Your email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
          className="input-field"
          disabled={isUploading}
        />
      </div>

      <div>
        <label htmlFor="message" className="label">
          Message <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a note for the team"
          rows={3}
          className="textarea-field"
          disabled={isUploading}
        />
      </div>

      <div className="pt-1">
        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Uploading {fileCount} {fileCount === 1 ? "file" : "files"}
              </span>
              <span className="text-gray-950 dark:text-gray-50 font-semibold u-tnum">
                {overallProgress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-150 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-950 dark:bg-gray-50 transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={disabled || fileCount === 0}
            className="btn-primary w-full"
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
            <span>
              {fileCount === 0
                ? "Send"
                : `Send ${fileCount} ${fileCount === 1 ? "file" : "files"}${totalSize > 0 ? ` · ${formatBytes(totalSize)}` : ""}`}
            </span>
          </button>
        )}
      </div>
    </form>
  );
}
