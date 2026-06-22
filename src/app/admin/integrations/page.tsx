"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Database,
  Mail,
  Server,
  Slack,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  X,
  Save,
  Unplug,
  Eye,
  EyeOff,
  Zap,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDate } from "@/lib/utils";

interface Integration {
  provider: string;
  is_active: boolean;
  source: "database" | "env" | "none";
  fields: Record<string, string>;
  has_secret: boolean;
  updated_at: string | null;
}

interface ProviderMeta {
  name: string;
  description: string;
  icon: LucideIcon;
  fieldOrder: string[];
  fieldLabels: Record<string, string>;
  secretFields: string[];
  optionalFields: string[];
  fieldPlaceholders: Record<string, string>;
  fieldHints: Record<string, string>;
  monoFields: string[];
}

const PROVIDERS: Record<string, ProviderMeta> = {
  backblaze_b2: {
    name: "Backblaze B2",
    description:
      "Object storage for uploaded files. Used as the S3-compatible backend for every transfer.",
    icon: Database,
    fieldOrder: ["endpoint", "region", "bucket", "key_id", "app_key"],
    fieldLabels: {
      endpoint: "Endpoint",
      region: "Region",
      bucket: "Bucket",
      key_id: "Key ID",
      app_key: "Application Key",
    },
    fieldPlaceholders: {
      endpoint: "https://s3.us-west-001.backblazeb2.com",
      region: "us-west-001",
      bucket: "gdm-send",
      key_id: "000000000000000000000000",
      app_key: "K00000000000000000000000000000000",
    },
    monoFields: ["endpoint", "region", "bucket", "key_id", "app_key"],
    secretFields: ["app_key"],
    optionalFields: [],
    fieldHints: {},
  },
  resend: {
    name: "Resend",
    description:
      "Transactional email API. Used to send notification emails when transfers arrive.",
    icon: Mail,
    fieldOrder: ["api_key", "from_email", "from_name", "reply_to", "bcc"],
    fieldLabels: {
      api_key: "API Key",
      from_email: "From email",
      from_name: "From name",
      reply_to: "Reply-to email",
      bcc: "BCC email",
    },
    fieldPlaceholders: {
      api_key: "re_00000000000000000000000000000000",
      from_email: "notifications@gaviso.agency",
      from_name: "Gaviso",
      reply_to: "team@gaviso.agency",
      bcc: "archive@gaviso.agency",
    },
    fieldHints: {
      from_name: "Display name shown in the recipient's inbox",
      reply_to: "Optional. Replies to platform emails go here instead of the From address",
      bcc: "Optional. Every outgoing email is silently copied to this address",
    },
    monoFields: ["api_key", "from_email", "reply_to", "bcc"],
    secretFields: ["api_key"],
    optionalFields: ["reply_to", "bcc"],
  },
  smtp: {
    name: "SMTP",
    description:
      "Generic SMTP relay for sending email. Use as a fallback or in place of Resend.",
    icon: Server,
    fieldOrder: ["host", "port", "username", "password", "from_email"],
    fieldLabels: {
      host: "Host",
      port: "Port",
      username: "Username",
      password: "Password",
      from_email: "From email",
    },
    fieldPlaceholders: {
      host: "smtp.gaviso.agency",
      port: "587",
      username: "postmaster@gaviso.agency",
      password: "••••••••••••",
      from_email: "notifications@gaviso.agency",
    },
    monoFields: ["host", "port", "username", "from_email"],
    secretFields: ["password"],
    optionalFields: [],
    fieldHints: {},
  },
  slack: {
    name: "Slack",
    description:
      "Post a message to a Slack channel when transfers arrive. Uses an incoming webhook.",
    icon: Slack,
    fieldOrder: ["webhook_url"],
    fieldLabels: {
      webhook_url: "Webhook URL",
    },
    fieldPlaceholders: {
      webhook_url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXX",
    },
    monoFields: ["webhook_url"],
    secretFields: ["webhook_url"],
    optionalFields: [],
    fieldHints: {},
  },
};

export default function IntegrationsPage() {
  const confirm = useConfirm();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Integration | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = async () => {
    setEditing(null);
    await load();
  };

  const handleDisconnect = async (provider: string) => {
    const meta = PROVIDERS[provider];
    const ok = await confirm({
      title: `Disconnect ${meta.name}?`,
      description:
        "The stored credentials will be cleared. The app will fall back to environment variables if they are set.",
      confirmLabel: "Disconnect",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/integrations/${provider}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success(`${meta.name} disconnected`);
      setEditing(null);
      await load();
    } else {
      toast.error("Failed to disconnect");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-44 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage external services this platform connects to
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((it) => (
          <IntegrationCard
            key={it.provider}
            integration={it}
            onConfigure={() => setEditing(it)}
          />
        ))}
      </div>

      {editing && (
        <IntegrationModal
          integration={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDisconnect={() => handleDisconnect(editing.provider)}
        />
      )}
    </div>
  );
}

function IntegrationCard({
  integration,
  onConfigure,
}: {
  integration: Integration;
  onConfigure: () => void;
}) {
  const meta = PROVIDERS[integration.provider];
  if (!meta) return null;
  const Icon = meta.icon;

  const connected =
    integration.is_active && integration.source !== "none" && integration.has_secret;

  return (
    <button
      onClick={onConfigure}
      className="card-pad text-left hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50">
              {meta.name}
            </h3>
            {connected ? (
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
        <SettingsIcon
          className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors"
          strokeWidth={1.75}
        />
      </div>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        {meta.description}
      </p>
    </button>
  );
}

function IntegrationModal({
  integration,
  onClose,
  onSaved,
  onDisconnect,
}: {
  integration: Integration;
  onClose: () => void;
  onSaved: () => void;
  onDisconnect: () => void;
}) {
  const meta = PROVIDERS[integration.provider];
  const Icon = meta.icon;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of meta.fieldOrder) {
      v[f] = integration.fields[f] || "";
    }
    return v;
  });
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Reset test result when the form changes
  useEffect(() => {
    setTestResult(null);
  }, [values]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/admin/integrations/${integration.provider}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: values }),
        }
      );
      const data = (await res.json()) as { ok: boolean; message: string };
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Network error" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/integrations/${integration.provider}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: values }),
        }
      );
      if (res.ok) {
        toast.success(`${meta.name} saved`);
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const connected =
    integration.is_active && integration.source !== "none" && integration.has_secret;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="integration-title"
    >
      <div
        className="absolute inset-0 bg-gray-950/45 backdrop-blur-[2px] animate-[fade-in_120ms_ease-out]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 animate-[scale-in_140ms_ease-out]">
        <div className="flex items-start justify-between gap-3 p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="integration-title"
                className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50"
              >
                {meta.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {connected
                  ? `Active source: ${integration.source === "database" ? "Database" : "Environment variables"}`
                  : "Not connected"}
                {integration.updated_at &&
                  ` · Updated ${formatDate(integration.updated_at)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {meta.fieldOrder.map((field) => {
            const isSecret = meta.secretFields.includes(field);
            const isMono = meta.monoFields.includes(field);
            const isOptional = meta.optionalFields.includes(field);
            const hint = meta.fieldHints[field];
            const isRevealed = reveal[field];
            return (
              <div key={field}>
                <label
                  htmlFor={`int-${field}`}
                  className="label flex items-center justify-between"
                >
                  <span>
                    {meta.fieldLabels[field]}
                    {isOptional && (
                      <span className="ml-1.5 text-gray-400 dark:text-gray-500 font-normal">
                        (optional)
                      </span>
                    )}
                  </span>
                  {isSecret && (
                    <button
                      type="button"
                      onClick={() =>
                        setReveal((r) => ({ ...r, [field]: !r[field] }))
                      }
                      className="flex items-center gap-1 text-[11px] font-normal text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50 transition-colors"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="h-3 w-3" strokeWidth={1.75} />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" strokeWidth={1.75} />
                          Reveal
                        </>
                      )}
                    </button>
                  )}
                </label>
                <input
                  id={`int-${field}`}
                  type={isSecret && !isRevealed ? "password" : "text"}
                  value={values[field] || ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field]: e.target.value }))
                  }
                  placeholder={meta.fieldPlaceholders[field]}
                  className={`input-field ${isMono ? "u-mono" : ""}`}
                  spellCheck={false}
                  autoComplete="off"
                  disabled={saving}
                />
                {hint && <p className="hint mt-1.5">{hint}</p>}
              </div>
            );
          })}

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                testResult.ok
                  ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
                  : "border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-400"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2
                  className="h-4 w-4 flex-shrink-0 mt-0.5"
                  strokeWidth={1.75}
                />
              ) : (
                <AlertCircle
                  className="h-4 w-4 flex-shrink-0 mt-0.5"
                  strokeWidth={1.75}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {testResult.ok ? "Connection successful" : "Connection failed"}
                </p>
                <pre className="mt-1 text-[12px] u-mono whitespace-pre-wrap break-all opacity-90">
                  {testResult.message}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-800 px-6 py-3 bg-gray-50/60 dark:bg-gray-900/40 rounded-b-lg">
          {connected && integration.source === "database" ? (
            <button
              onClick={onDisconnect}
              className="btn-ghost btn-sm text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-500/10 dark:hover:text-danger-300"
            >
              <Unplug className="h-3.5 w-3.5" strokeWidth={1.75} />
              Disconnect
            </button>
          ) : (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {integration.source === "env"
                ? "Currently using environment variables. Saving here overrides them."
                : ""}
            </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              className="btn-secondary btn-sm"
              disabled={testing || saving}
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
              ) : (
                <Zap className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {testing ? "Testing…" : "Test"}
            </button>
            <button
              onClick={onClose}
              className="btn-secondary btn-sm"
              disabled={saving || testing}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary btn-sm"
              disabled={saving || testing}
            >
              <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
