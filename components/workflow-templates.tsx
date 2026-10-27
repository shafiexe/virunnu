"use client";

import { useState } from "react";
import { MessageSquare, Mail, ThumbsUp, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

type TemplateKey =
  | "bookingSMS"
  | "bookingEmail"
  | "invoiceEmail"
  | "feedbackSMS"
  | "feedbackEmail";

interface Template {
  key: TemplateKey;
  label: string;
  channel: "SMS" | "Email";
  icon: React.ReactNode;
  description: string;
  defaultBody: string;
  subject?: string;
  defaultSubject?: string;
  variables: string[];
}

const TEMPLATES: Template[] = [
  {
    key: "bookingSMS",
    label: "Booking Confirmation",
    channel: "SMS",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Sent to customer after a booking is confirmed.",
    defaultBody:
      "Hi {{customerName}}, your booking at {{venueName}} ({{hallName}}) is confirmed for {{bookingDate}}, {{slotName}} ({{startTime}}–{{endTime}}). Booking ID: {{bookingId}}. For queries call {{ownerPhone}}.",
    variables: ["customerName", "venueName", "hallName", "bookingDate", "slotName", "startTime", "endTime", "bookingId", "ownerPhone"],
  },
  {
    key: "bookingEmail",
    label: "Booking Confirmation",
    channel: "Email",
    icon: <Mail className="h-4 w-4" />,
    description: "Email sent to customer after booking confirmation.",
    subject: "subject",
    defaultSubject: "Your booking at {{venueName}} is confirmed — {{bookingDate}}",
    defaultBody: `Dear {{customerName}},

Your booking has been confirmed. Here are the details:

Venue: {{venueName}}
Hall: {{hallName}}
Date: {{bookingDate}}
Slot: {{slotName}} ({{startTime}} – {{endTime}})
Booking ID: {{bookingId}}
Total Amount: ₹{{totalAmount}}

For any queries, please contact us at {{ownerPhone}} or reply to this email.

Thank you for choosing {{venueName}}!`,
    variables: ["customerName", "venueName", "hallName", "bookingDate", "slotName", "startTime", "endTime", "bookingId", "totalAmount", "ownerPhone"],
  },
  {
    key: "feedbackSMS",
    label: "Feedback Request",
    channel: "SMS",
    icon: <ThumbsUp className="h-4 w-4" />,
    description: "Sent a day after the event to collect feedback.",
    defaultBody:
      "Hi {{customerName}}, thank you for hosting your event at {{venueName}}! We hope it went well. Please share your experience: {{feedbackLink}}",
    variables: ["customerName", "venueName", "feedbackLink"],
  },
  {
    key: "feedbackEmail",
    label: "Feedback Request",
    channel: "Email",
    icon: <ThumbsUp className="h-4 w-4" />,
    description: "Email sent a day after the event to collect feedback.",
    subject: "subject",
    defaultSubject: "How was your event at {{venueName}}?",
    defaultBody: `Dear {{customerName}},

We hope your event at {{venueName}} was a wonderful experience!

We'd love to hear your thoughts. Your feedback helps us improve and serve you better.

Share your experience here: {{feedbackLink}}

Thank you for choosing us. We look forward to hosting you again!

Warm regards,
{{venueName}} Team`,
    variables: ["customerName", "venueName", "feedbackLink"],
  },
];

const STORAGE_KEY = "virunnu_workflow_templates";

function loadSaved(): Partial<Record<TemplateKey, { body: string; subject?: string }>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToDisk(data: Partial<Record<TemplateKey, { body: string; subject?: string }>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function TemplateCard({ template }: { template: Template }) {
  const saved = loadSaved();
  const initial = saved[template.key] ?? { body: template.defaultBody, subject: template.defaultSubject };

  const [body, setBody] = useState(initial.body);
  const [subject, setSubject] = useState(initial.subject ?? "");
  const [open, setOpen] = useState(false);
  const [saved2, setSaved2] = useState(false);

  function handleSave() {
    const all = loadSaved();
    all[template.key] = { body, subject };
    saveToDisk(all);
    setSaved2(true);
    setTimeout(() => setSaved2(false), 1800);
  }

  function handleReset() {
    setBody(template.defaultBody);
    setSubject(template.defaultSubject ?? "");
  }

  const channelColor =
    template.channel === "SMS"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${channelColor}`}>
          {template.icon}
          {template.channel}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{template.label}</div>
          <div className="text-xs text-zinc-400 truncate">{template.description}</div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-3">
          {template.subject && (
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Subject line</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Message body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={template.channel === "Email" ? 10 : 4}
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono resize-y"
            />
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1.5">Available variables:</p>
            <div className="flex flex-wrap gap-1.5">
              {template.variables.map((v) => (
                <code
                  key={v}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono"
                >
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                saved2
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              {saved2 ? "Saved!" : "Save template"}
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkflowTemplates() {
  const smsTemplates = TEMPLATES.filter((t) => t.channel === "SMS");
  const emailTemplates = TEMPLATES.filter((t) => t.channel === "Email");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">SMS Templates</h2>
        <div className="space-y-2">
          {smsTemplates.map((t) => (
            <TemplateCard key={t.key} template={t} />
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">Email Templates</h2>
        <div className="space-y-2">
          {emailTemplates.map((t) => (
            <TemplateCard key={t.key} template={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
