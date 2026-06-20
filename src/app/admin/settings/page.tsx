"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";

interface Settings {
  max_file_size: string;
  max_transfer_size: string;
  transfer_expiry_days: string;
  notification_email: string;
  auto_delete_expired: string;
}

const defaultSettings: Settings = {
  max_file_size: "5368709120",
  max_transfer_size: "5368709120",
  transfer_expiry_days: "30",
  notification_email: "admin@gaviso.agency",
  auto_delete_expired: "true",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...defaultSettings, ...data });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const sizeOptions = [
    { label: "1 GB", value: "1073741824" },
    { label: "2 GB", value: "2147483648" },
    { label: "5 GB", value: "5368709120" },
    { label: "10 GB", value: "10737418240" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-32 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-96 rounded-lg bg-gray-200 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure transfer limits and preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <div className="card-pad">
          <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50 mb-5">
            Transfer limits
          </h2>

          <div className="space-y-5">
            <div>
              <label htmlFor="max-size" className="label">
                Maximum transfer size
              </label>
              <select
                id="max-size"
                value={settings.max_transfer_size}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    max_transfer_size: e.target.value,
                  }))
                }
                className="input-field"
              >
                {sizeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="hint mt-1.5">
                Current:{" "}
                <span className="u-mono">
                  {formatBytes(Number(settings.max_transfer_size))}
                </span>
              </p>
            </div>

            <div>
              <label htmlFor="expiry-days" className="label">
                Transfer expiry
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="expiry-days"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.transfer_expiry_days}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      transfer_expiry_days: e.target.value,
                    }))
                  }
                  className="input-field max-w-[120px]"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">days</span>
              </div>
              <p className="hint mt-1.5">
                Transfers will expire after this many days
              </p>
            </div>
          </div>
        </div>

        <div className="card-pad">
          <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50 mb-5">
            Notifications
          </h2>

          <div>
            <label htmlFor="notify-email" className="label">
              Notification email
            </label>
            <input
              id="notify-email"
              type="email"
              value={settings.notification_email}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  notification_email: e.target.value,
                }))
              }
              className="input-field"
              placeholder="admin@gaviso.agency"
            />
            <p className="hint mt-1.5">
              Receive a notification when new transfers arrive
            </p>
          </div>
        </div>

        <div className="card-pad">
          <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50 mb-5">
            Cleanup
          </h2>

          <label
            htmlFor="auto-delete"
            className="flex items-start gap-3 cursor-pointer"
          >
            <input
              type="checkbox"
              id="auto-delete"
              checked={settings.auto_delete_expired === "true"}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  auto_delete_expired: e.target.checked ? "true" : "false",
                }))
              }
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-950 focus:ring-brand-500"
            />
            <div>
              <span className="text-[13px] font-medium text-gray-950 dark:text-gray-50">
                Auto-delete expired transfers
              </span>
              <p className="hint mt-0.5">
                Files are removed from storage when a transfer expires
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" strokeWidth={1.75} />
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
