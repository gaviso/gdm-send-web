"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Slack,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

interface ChannelEvent {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface ChannelInfo {
  channel: "email" | "slack";
  configured: boolean;
  destination: string | null;
  events: ChannelEvent[];
}

const CHANNEL_META: Record<
  ChannelInfo["channel"],
  { name: string; description: string; icon: LucideIcon }
> = {
  email: {
    name: "Email",
    description:
      "Receive notifications by email. Uses Resend or your SMTP integration.",
    icon: Mail,
  },
  slack: {
    name: "Slack",
    description:
      "Post notifications to a Slack channel via incoming webhook.",
    icon: Slack,
  },
};

export default function NotificationsPage() {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (
    channel: ChannelInfo["channel"],
    eventId: string,
    nextEnabled: boolean
  ) => {
    // Optimistic
    setChannels((prev) =>
      prev.map((c) =>
        c.channel === channel
          ? {
              ...c,
              events: c.events.map((e) =>
                e.id === eventId ? { ...e, enabled: nextEnabled } : e
              ),
            }
          : c
      )
    );

    const res = await fetch("/api/admin/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        event_type: eventId,
        is_enabled: nextEnabled,
      }),
    });

    if (!res.ok) {
      toast.error("Failed to update preference");
      // Roll back
      setChannels((prev) =>
        prev.map((c) =>
          c.channel === channel
            ? {
                ...c,
                events: c.events.map((e) =>
                  e.id === eventId ? { ...e, enabled: !nextEnabled } : e
                ),
              }
            : c
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-44 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-72 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-72 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choose what events you want to be notified about, and where
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {channels.map((c) => (
          <ChannelCard
            key={c.channel}
            info={c}
            onToggle={(eventId, next) => handleToggle(c.channel, eventId, next)}
          />
        ))}
      </div>
    </div>
  );
}

function ChannelCard({
  info,
  onToggle,
}: {
  info: ChannelInfo;
  onToggle: (eventId: string, nextEnabled: boolean) => void;
}) {
  const meta = CHANNEL_META[info.channel];
  const Icon = meta.icon;
  const disabled = !info.configured;

  return (
    <div className="card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50">
              {meta.name}
            </h3>
            {info.configured ? (
              <span className="badge badge-success mt-1">
                <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                Connected
              </span>
            ) : (
              <span className="badge bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 mt-1">
                <AlertCircle className="h-3 w-3" strokeWidth={2} />
                Not connected
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {meta.description}
      </p>

      {info.configured && info.destination && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Sending to{" "}
          <span className="u-mono text-gray-700 dark:text-gray-300">
            {info.destination}
          </span>
        </p>
      )}

      {disabled && (
        <Link
          href="/admin/integrations"
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
        >
          Set up in Integrations
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>
      )}

      <div className="mt-5 border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3">
        {info.events.map((ev) => (
          <label
            key={ev.id}
            className={`flex items-start gap-3 ${
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={ev.enabled}
              disabled={disabled}
              onChange={(e) => onToggle(ev.id, e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-950 focus:ring-brand-500 disabled:cursor-not-allowed"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-gray-950 dark:text-gray-50">
                {ev.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {ev.description}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
