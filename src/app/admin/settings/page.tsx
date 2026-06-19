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
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-96 rounded-xl bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure transfer limits and preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Transfer Limits
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum transfer size
            </label>
            <select
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
            <p className="mt-1 text-xs text-gray-500">
              Current:{" "}
              {formatBytes(Number(settings.max_transfer_size))}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer expiry (days)
            </label>
            <input
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
              className="input-field"
            />
            <p className="mt-1 text-xs text-gray-500">
              Transfers will expire after this many days
            </p>
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Notifications
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification email
            </label>
            <input
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
            <p className="mt-1 text-xs text-gray-500">
              Receive notifications when new transfers arrive
            </p>
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Cleanup
          </h2>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_delete"
              checked={settings.auto_delete_expired === "true"}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  auto_delete_expired: e.target.checked ? "true" : "false",
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label
              htmlFor="auto_delete"
              className="text-sm font-medium text-gray-700"
            >
              Automatically delete expired transfers
            </label>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </div>
  );
}
