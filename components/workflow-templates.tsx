"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquare, Mail, Save, RotateCcw, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface TemplateData {
  key: string;
  body: string;
  isDefault: boolean;
  variables: string[];
}

// One event = one notification trigger, with 1–2 channels
interface EventChannel {
  tab: "WhatsApp" | "Email";
  bodyKey: string;
  subjectKey?: string;
}

interface EventDef {
  id: string;
  label: string;
  description: string;
  channels: EventChannel[];
}

const EVENTS: EventDef[] = [
  {
    id: "confirmed",
    label: "Booking Confirmed",
    description: "Sent to customer after a booking is confirmed with payment.",
    channels: [
      { tab: "WhatsApp", bodyKey: "customer_booking_confirmed_whatsapp" },
      { tab: "Email", bodyKey: "customer_booking_confirmed_email", subjectKey: "customer_booking_confirmed_email_subject" },
    ],
  },
  {
    id: "approved",
    label: "Booking Approved",
    description: "Sent to customer when owner approves a pending booking.",
    channels: [
      { tab: "WhatsApp", bodyKey: "customer_booking_approved_whatsapp" },
      { tab: "Email", bodyKey: "customer_booking_approved_email", subjectKey: "customer_booking_approved_email_subject" },
    ],
  },
  {
    id: "new_request",
    label: "New Booking Request",
    description: "Sent to the owner when a customer submits a new booking.",
    channels: [
      { tab: "WhatsApp", bodyKey: "owner_new_booking_whatsapp" },
      { tab: "Email", bodyKey: "owner_new_booking_email", subjectKey: "owner_new_booking_email_subject" },
    ],
  },
  {
    id: "reminder",
    label: "Balance Reminder",
    description: "Sent to customer when you tap the Remind button on a booking.",
    channels: [
      { tab: "WhatsApp", bodyKey: "customer_balance_reminder_whatsapp" },
      { tab: "Email", bodyKey: "customer_balance_reminder_email", subjectKey: "customer_balance_reminder_email_subject" },
    ],
  },
  {
    id: "expired",
    label: "Booking Expired",
    description: "Sent to customer when a held slot expires without payment.",
    channels: [
      { tab: "WhatsApp", bodyKey: "customer_booking_expired_whatsapp" },
    ],
  },
];

// ── TemplateEditor ────────────────────────────────────────────────────────────

interface EditorProps {
  channel: EventChannel;
  templateMap: Map<string, TemplateData>;
  edits: Record<string, string>;
  setEdits: (edits: Record<string, string>) => void;
  serverValues: Record<string, string>;
  onSave: (channel: EventChannel) => Promise<void>;
  onReset: (channel: EventChannel) => Promise<void>;
}

function TemplateEditor({ channel, templateMap, edits, setEdits, serverValues, onSave, onReset }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const bodyTemplate = templateMap.get(channel.bodyKey);
  const subjectTemplate = channel.subjectKey ? templateMap.get(channel.subjectKey) : undefined;

  const bodyValue = edits[channel.bodyKey] ?? bodyTemplate?.body ?? "";
  const subjectValue = channel.subjectKey ? (edits[channel.subjectKey] ?? subjectTemplate?.body ?? "") : "";

  const isBodyDirty = bodyValue !== (serverValues[channel.bodyKey] ?? bodyTemplate?.body ?? "");
  const isSubjectDirty = channel.subjectKey
    ? subjectValue !== (serverValues[channel.subjectKey] ?? subjectTemplate?.body ?? "")
    : false;
  const isDirty = isBodyDirty || isSubjectDirty;

  const isDefault = (bodyTemplate?.isDefault ?? true) && (subjectTemplate?.isDefault ?? true);

  const bodyVars = bodyTemplate?.variables ?? [];
  const subjectVars = subjectTemplate?.variables ?? [];

  function insertVariable(v: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const token = `{{${v}}}`;
    const newVal = bodyValue.slice(0, start) + token + bodyValue.slice(end);
    setEdits({ ...edits, [channel.bodyKey]: newVal });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      await onSave(channel);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await onReset(channel);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-3 pt-3">
      {channel.subjectKey && (
        <div>
          <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
            Email subject
          </label>
          <input
            value={subjectValue}
            onChange={(e) => setEdits({ ...edits, [channel.subjectKey!]: e.target.value })}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Email subject line…"
          />
          {subjectVars.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {subjectVars.map((v) => (
                <code
                  key={v}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono"
                >
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
          Message body
        </label>
        <textarea
          ref={textareaRef}
          value={bodyValue}
          onChange={(e) => setEdits({ ...edits, [channel.bodyKey]: e.target.value })}
          rows={channel.tab === "WhatsApp" ? 8 : 12}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono resize-y leading-relaxed"
        />
      </div>

      {bodyVars.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 mb-1.5">Click to insert a variable at cursor:</p>
          <div className="flex flex-wrap gap-1.5">
            {bodyVars.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-amber-100 dark:bg-zinc-800 dark:hover:bg-amber-900/30 text-zinc-600 dark:text-zinc-400 hover:text-amber-700 dark:hover:text-amber-400 font-mono transition-colors"
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            status === "saved"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : status === "error"
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300"
          }`}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === "saved" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {status === "saved" ? "Saved!" : status === "error" ? "Failed" : "Save"}
        </button>

        {!isDefault && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}

// ── EventCard ─────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: EventDef;
  templateMap: Map<string, TemplateData>;
  edits: Record<string, string>;
  setEdits: (edits: Record<string, string>) => void;
  serverValues: Record<string, string>;
  onSave: (channel: EventChannel) => Promise<void>;
  onReset: (channel: EventChannel) => Promise<void>;
}

function EventCard({ event, templateMap, edits, setEdits, serverValues, onSave, onReset }: EventCardProps) {
  const [open, setOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState(0);

  const hasCustom = event.channels.some((ch) => {
    const body = templateMap.get(ch.bodyKey);
    const subj = ch.subjectKey ? templateMap.get(ch.subjectKey) : null;
    return !body?.isDefault || (subj && !subj.isDefault);
  });

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{event.label}</span>
            {hasCustom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 font-semibold">
                Custom
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">{event.description}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {event.channels.map((ch) => (
              <span
                key={ch.tab}
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  ch.tab === "WhatsApp"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                }`}
              >
                {ch.tab === "WhatsApp" ? "WA" : "Email"}
              </span>
            ))}
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 pb-5">
          {event.channels.length > 1 && (
            <div className="flex gap-1 pt-4 mb-1">
              {event.channels.map((ch, i) => (
                <button
                  key={ch.tab}
                  type="button"
                  onClick={() => setActiveChannel(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeChannel === i
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {ch.tab === "WhatsApp" ? (
                    <MessageSquare className="h-3.5 w-3.5" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  {ch.tab}
                </button>
              ))}
            </div>
          )}

          <TemplateEditor
            key={`${event.id}-${activeChannel}`}
            channel={event.channels[activeChannel]}
            templateMap={templateMap}
            edits={edits}
            setEdits={setEdits}
            serverValues={serverValues}
            onSave={onSave}
            onReset={onReset}
          />
        </div>
      )}
    </div>
  );
}

// ── WorkflowTemplates ─────────────────────────────────────────────────────────

export function WorkflowTemplates() {
  const [templateMap, setTemplateMap] = useState<Map<string, TemplateData>>(new Map());
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [serverValues, setServerValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/owner/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const { templates } = (await res.json()) as { templates: TemplateData[] };
      const map = new Map(templates.map((t) => [t.key, t]));
      const vals = Object.fromEntries(templates.map((t) => [t.key, t.body]));
      setTemplateMap(map);
      setEdits(vals);
      setServerValues(vals);
    } catch {
      setFetchError("Failed to load templates. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleSave = useCallback(async (channel: EventChannel) => {
    const keys = [channel.bodyKey, ...(channel.subjectKey ? [channel.subjectKey] : [])];
    await Promise.all(
      keys.map((key) =>
        fetch(`/api/owner/templates/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: edits[key] ?? "" }),
        }).then((r) => {
          if (!r.ok) throw new Error("Save failed");
        })
      )
    );
    // Update server values + isDefault flags
    setServerValues((prev) => {
      const next = { ...prev };
      keys.forEach((k) => { next[k] = edits[k] ?? ""; });
      return next;
    });
    setTemplateMap((prev) => {
      const next = new Map(prev);
      keys.forEach((k) => {
        const t = next.get(k);
        if (t) next.set(k, { ...t, body: edits[k] ?? "", isDefault: false });
      });
      return next;
    });
  }, [edits]);

  const handleReset = useCallback(async (channel: EventChannel) => {
    const keys = [channel.bodyKey, ...(channel.subjectKey ? [channel.subjectKey] : [])];
    await Promise.all(
      keys.map((key) =>
        fetch(`/api/owner/templates/${key}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error("Reset failed");
        })
      )
    );
    // Reload to get defaults from server
    await loadTemplates();
  }, [loadTemplates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading templates…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700 dark:text-red-400">{fetchError}</p>
          <button
            onClick={loadTemplates}
            className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {EVENTS.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          templateMap={templateMap}
          edits={edits}
          setEdits={setEdits}
          serverValues={serverValues}
          onSave={handleSave}
          onReset={handleReset}
        />
      ))}
    </div>
  );
}
