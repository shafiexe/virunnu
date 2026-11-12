import { sendRawMail } from "@/services/notification.service";

// Tells the person who runs Virunnu that something broke, by email to ALERT_EMAIL. Without ALERT_EMAIL it only logs.
// The same problem is mailed once every ten minutes, and at most twenty mails an hour leave one instance, so a loop of
// failures cannot fill an inbox (or the mail account's daily limit).
const WINDOW = 10 * 60_000;
const seen = new Map<string, number>();
let sent: number[] = [];

export async function raiseAlert(title: string, detail: string): Promise<void> {
  console.error(`[alert] ${title} — ${detail}`);
  const to = process.env.ALERT_EMAIL;
  if (!to) return;
  const now = Date.now();
  const key = `${title}|${detail.slice(0, 120)}`;
  if (now - (seen.get(key) ?? 0) < WINDOW) return;
  sent = sent.filter((t) => now - t < 60 * 60_000);
  if (sent.length >= 20) return;
  seen.set(key, now);
  sent.push(now);
  if (seen.size > 500) for (const [k, t] of seen) if (now - t >= WINDOW) seen.delete(k);
  try {
    await sendRawMail(to, `[Virunnu] ${title}`, `${title}\n\n${detail.slice(0, 2000)}\n\n${new Date().toISOString()}`);
  } catch (e) {
    console.error("[alert-mail-failed]", e);
  }
}
