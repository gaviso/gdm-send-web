"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { html as htmlLang } from "@codemirror/lang-html";
import {
  vscodeDark,
  vscodeLight,
} from "@uiw/codemirror-theme-vscode";
import {
  Mail,
  X,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Power,
  Code2,
  Eye,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { useTheme } from "@/components/ThemeProvider";
import { formatDate } from "@/lib/utils";
import {
  SAMPLE_VARS,
  SAMPLE_MESSAGE_CONTENT,
  ensureHtml,
} from "@/lib/email-templates";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-[360px] rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Loading editor…
      </span>
    </div>
  ),
});

interface TemplateVariable {
  name: string;
  description: string;
}

interface EmailTemplate {
  key: string;
  name: string;
  description: string;
  audience: "Sender" | "Admin" | "Layout";
  is_layout: boolean;
  variables: TemplateVariable[];
  subject: string;
  body: string;
  is_enabled: boolean;
  is_default: boolean;
  updated_at: string | null;
  default_subject: string;
  default_body: string;
}

export default function EmailTemplatesPage() {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const layout = useMemo(
    () => templates.find((t) => t.is_layout) || null,
    [templates]
  );
  const messages = useMemo(
    () => templates.filter((t) => !t.is_layout),
    [templates]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReset = async (key: string, name: string) => {
    const ok = await confirm({
      title: `Reset "${name}" to default?`,
      description:
        "Your customisations will be discarded and the built-in template will be used.",
      confirmLabel: "Reset",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/email-templates/${key}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Template reset to default");
      setEditing(null);
      await load();
    } else {
      toast.error("Failed to reset template");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid gap-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          Email templates
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize the emails this platform sends. Variables like{" "}
          <code className="u-mono text-[12px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
            {"{{sender_name}}"}
          </code>{" "}
          are replaced when the email is sent.
        </p>
      </div>

      {layout && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Master layout
          </p>
          <TemplateCard
            template={layout}
            onEdit={() => setEditing(layout)}
            onReset={() => handleReset(layout.key, layout.name)}
          />
        </div>
      )}

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
          Messages
        </p>
        <div className="space-y-4">
          {messages.map((t) => (
            <TemplateCard
              key={t.key}
              template={t}
              onEdit={() => setEditing(t)}
              onReset={() => handleReset(t.key, t.name)}
            />
          ))}
        </div>
      </div>

      {editing && (
        <TemplateEditor
          template={editing}
          masterBody={layout?.body || ""}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
          onReset={() => handleReset(editing.key, editing.name)}
        />
      )}
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onReset,
}: {
  template: EmailTemplate;
  onEdit: () => void;
  onReset: () => void;
}) {
  return (
    <div className="card-pad">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            <Mail className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50">
                {template.name}
              </h3>
              <span className="badge bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                {template.audience}
              </span>
              {!template.is_default && (
                <span className="badge badge-info">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                  Customised
                </span>
              )}
              {!template.is_enabled && (
                <span className="badge badge-warning">
                  <Power className="h-3 w-3" strokeWidth={2} />
                  Disabled
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {template.description}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!template.is_default && (
            <button
              onClick={onReset}
              className="btn-ghost btn-sm"
              title="Reset to default"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              Reset
            </button>
          )}
          <button onClick={onEdit} className="btn-secondary btn-sm">
            <Edit3 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Edit
          </button>
        </div>
      </div>

      {!template.is_layout && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Subject
          </p>
          <p className="mt-1 text-sm font-medium text-gray-950 dark:text-gray-50 u-mono truncate">
            {template.subject}
          </p>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  masterBody,
  onClose,
  onSaved,
  onReset,
}: {
  template: EmailTemplate;
  masterBody: string;
  onClose: () => void;
  onSaved: () => void;
  onReset: () => void;
}) {
  const { resolved: resolvedTheme } = useTheme();
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [isEnabled, setIsEnabled] = useState(template.is_enabled);
  const [saving, setSaving] = useState(false);

  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Prefill the test recipient with the admin's own email
  useEffect(() => {
    if (template.is_layout) return;
    fetch("/api/admin/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p?.email) setTestEmail(p.email);
      })
      .catch(() => {});
  }, [template.is_layout]);

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/admin/email-templates/${template.key}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: testEmail.trim(),
            subject,
            body,
          }),
        }
      );
      const data = (await res.json()) as { ok: boolean; message: string };
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "Network error" });
    } finally {
      setTestSending(false);
    }
  };

  const substituteVars = (
    text: string,
    extraVars: Record<string, string> = {}
  ) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      if (extraVars[name] != null) return extraVars[name];
      if (SAMPLE_VARS[name] != null) return SAMPLE_VARS[name];
      return `[[${name}]]`;
    });

  const previewHtml = useMemo(() => {
    if (template.is_layout) {
      // Preview the layout itself with sample message content.
      const sampleContent = substituteVars(SAMPLE_MESSAGE_CONTENT);
      return substituteVars(ensureHtml(body), {
        content: sampleContent,
        subject: SAMPLE_VARS.subject || "",
        year: String(new Date().getFullYear()),
      });
    }

    // For message templates, render the message and inject into the master.
    const renderedMessage = substituteVars(ensureHtml(body));
    const renderedSubject = substituteVars(subject);
    const wrapped = substituteVars(masterBody || "{{content}}", {
      content: renderedMessage,
      subject: renderedSubject,
      year: String(new Date().getFullYear()),
    });

    // Prepend a subject preview bar so admins see how it'll appear.
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${renderedSubject.replace(/</g, "&lt;")}</title>
</head>
<body style="margin:0;">
<div style="background:#fafafa;border-bottom:1px solid #e4e4e7;padding:10px 14px;font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#52525b;">
  <span style="color:#a1a1aa;">Subject:</span> <strong style="color:#18181b;">${renderedSubject.replace(/</g, "&lt;")}</strong>
</div>
${wrapped}
</body>
</html>`;
  }, [body, subject, masterBody, template.is_layout]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${template.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          is_enabled: isEnabled,
        }),
      });
      if (res.ok) {
        toast.success("Template saved");
        onSaved();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to save (HTTP ${res.status})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-editor-title"
    >
      <div
        className="absolute inset-0 bg-gray-950/45 backdrop-blur-[2px] animate-[fade-in_120ms_ease-out]"
        onClick={onClose}
      />
      <div className="relative w-[96vw] max-w-[1500px] max-h-[92vh] flex flex-col rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 animate-[scale-in_140ms_ease-out]">
        <div className="flex items-start justify-between gap-3 p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Mail className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2
                id="template-editor-title"
                className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50"
              >
                {template.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {template.is_layout
                  ? "Applied to every outgoing email"
                  : `Sent to ${template.audience.toLowerCase()}`}
                {template.updated_at &&
                  ` · Updated ${formatDate(template.updated_at)}`}
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

        <div className="overflow-y-auto p-6 space-y-4 min-h-0 flex-1 flex flex-col">
          {!template.is_layout && (
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label htmlFor="tmpl-subject" className="label">
                Subject
              </label>
              <input
                id="tmpl-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-field u-mono"
                spellCheck={false}
                disabled={saving}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 dark:bg-gray-900 text-gray-950 focus:ring-brand-500"
                disabled={saving}
              />
              <span className="text-[13px] font-medium text-gray-950 dark:text-gray-50">
                Enabled
              </span>
            </label>
          </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px] flex-1 min-h-0">
            <div className="flex flex-col min-h-0 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="label mb-0 flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  HTML
                </span>
              </div>
              <div className="flex-1 min-h-[360px] min-w-0 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                <CodeMirror
                  value={body}
                  onChange={(v) => setBody(v)}
                  height="100%"
                  theme={resolvedTheme === "dark" ? vscodeDark : vscodeLight}
                  extensions={[htmlLang()]}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    indentOnInput: true,
                    syntaxHighlighting: true,
                  }}
                  editable={!saving}
                  style={{
                    height: "100%",
                    fontSize: "12px",
                    fontFamily:
                      'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace',
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col min-h-0 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="label mb-0 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Preview
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  using sample data
                </span>
              </div>
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                className="flex-1 min-h-[360px] rounded-md border border-gray-200 dark:border-gray-700 bg-white"
                sandbox="allow-same-origin"
              />
            </div>

            <aside className="lg:border-l lg:border-gray-200 lg:dark:border-gray-800 lg:pl-4 min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                Available variables
              </p>
              <ul className="space-y-2">
                {template.variables.map((v) => (
                  <li key={v.name}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${v.name}}}`);
                        toast.success(`Copied {{${v.name}}}`);
                      }}
                      className="u-mono text-[12px] text-brand-600 dark:text-brand-400 hover:underline truncate text-left max-w-full"
                      title="Click to copy"
                    >
                      {`{{${v.name}}}`}
                    </button>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      {v.description}
                    </p>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>

        {!template.is_layout && (
          <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-3 bg-gray-50/30 dark:bg-gray-900/20">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="tmpl-test-to"
                className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Send test to
              </label>
              <input
                id="tmpl-test-to"
                type="email"
                value={testEmail}
                onChange={(e) => {
                  setTestEmail(e.target.value);
                  setTestResult(null);
                }}
                placeholder="you@example.com"
                className="input-field u-mono flex-1 min-w-[240px] max-w-md h-8 text-[13px]"
                disabled={testSending || saving}
              />
              <button
                onClick={handleSendTest}
                disabled={testSending || saving || !testEmail.trim()}
                className="btn-secondary btn-sm"
              >
                {testSending ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    strokeWidth={1.75}
                  />
                ) : (
                  <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                {testSending ? "Sending…" : "Send test"}
              </button>
              {testResult && (
                <span
                  className={`flex items-center gap-1 text-[12px] ${
                    testResult.ok
                      ? "text-success-700 dark:text-success-400"
                      : "text-danger-700 dark:text-danger-400"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-800 px-6 py-3 bg-gray-50/60 dark:bg-gray-900/40 rounded-b-lg">
          {!template.is_default ? (
            <button
              onClick={onReset}
              className="btn-ghost btn-sm text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-500/10 dark:hover:text-danger-300"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              Reset to default
            </button>
          ) : (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Currently using the built-in template
            </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="btn-secondary btn-sm"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary btn-sm"
              disabled={saving}
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
