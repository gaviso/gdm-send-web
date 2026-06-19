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
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Your name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Smith"
          className="input-field"
          disabled={isUploading}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Your email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@company.com"
          className="input-field"
          disabled={isUploading}
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message for the team..."
          rows={3}
          className="input-field resize-none"
          disabled={isUploading}
        />
      </div>

      <div className="pt-2">
        {isUploading ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Uploading {fileCount} {fileCount === 1 ? "file" : "files"}...
              </span>
              <span className="text-brand-600 font-semibold">
                {overallProgress}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            type="submit"
            disabled={disabled || fileCount === 0}
            className="btn-primary w-full gap-2"
          >
            <Send className="h-4 w-4" />
            Send {fileCount > 0 && `${fileCount} ${fileCount === 1 ? "file" : "files"}`}
            {totalSize > 0 && ` (${formatBytes(totalSize)})`}
          </button>
        )}
      </div>
    </form>
  );
}
