// The WhatsApp messages a catering team sends, as templates they can edit. {{name}} marks a gap that is filled in when sending.

export const TEMPLATE_KEYS = ["caterer_invoice", "caterer_invoices", "caterer_reminder", "caterer_statement", "caterer_quotation"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export type Templates = Record<TemplateKey, string>;

export const TEMPLATE_INFO: Record<TemplateKey, { label: string; when: string; vars: string[] }> = {
  caterer_reminder: { label: "Payment reminder", when: "“Send reminder” on an unpaid invoice, and the follow-up list", vars: ["businessName", "customerName", "balance", "invoiceNo", "functionDate", "upiLine", "link"] },
  caterer_invoice: { label: "Send one invoice", when: "“WhatsApp” on a single invoice", vars: ["businessName", "customerName", "billLabel", "invoiceNo", "functionDate", "total", "received", "balance", "balanceLine", "link"] },
  caterer_invoices: { label: "Send both invoices", when: "“Share both” on an order", vars: ["businessName", "customerName", "functionDate", "invoiceLines", "total", "received", "balance", "balanceLine", "link"] },
  caterer_statement: { label: "Account statement", when: "“WhatsApp statement” on a customer", vars: ["businessName", "customerName", "billed", "received", "balance", "balanceLine", "link"] },
  caterer_quotation: { label: "Quotation", when: "“WhatsApp” on a quotation", vars: ["businessName", "customerName", "quoteNo", "functionDate", "total", "validLine", "link"] },
};

export const TEMPLATE_DEFAULTS: Templates = {
  caterer_reminder: `Hello {{customerName}}, a gentle reminder from *{{businessName}}*.

*{{balance}}* is still pending for the function on {{functionDate}} ({{invoiceNo}}).
{{upiLine}}
View invoice: {{link}}

Thank you!`,
  caterer_invoice: `*{{businessName}}*
Hello {{customerName}}, here is your {{billLabel}} ({{invoiceNo}}) for {{functionDate}}.

Total: {{total}}
Received: {{received}}
{{balanceLine}}

View invoice: {{link}}`,
  caterer_invoices: `*{{businessName}}*
Hello {{customerName}}, here are your invoices for the function on {{functionDate}}.

{{invoiceLines}}

Total: {{total}}
Received: {{received}}
{{balanceLine}}

View invoices: {{link}}`,
  caterer_statement: `*{{businessName}}*
Hello {{customerName}}, here is your account statement.

Total billed: {{billed}}
Received: {{received}}
{{balanceLine}}

All invoices: {{link}}`,
  caterer_quotation: `*{{businessName}}*
Hello {{customerName}}, here is our quotation {{quoteNo}} for the function on {{functionDate}}.

Total: *{{total}}*
{{validLine}}

View quotation: {{link}}

Reply YES to confirm and we will book your date.`,
};

// The templates in use on this screen. Set once by the page shell, so the buttons can build a message without asking the server.
let active: Partial<Templates> = {};
export const setActiveTemplates = (t: Partial<Templates>) => { active = t; };

// Who is sending, for messages built on the screen
let business: { name: string; upiId: string | null } = { name: "", upiId: null };
export const setActiveBusiness = (b: { name: string; upiId: string | null }) => { business = b; };
export const getActiveBusiness = () => business;

export function renderTemplate(key: TemplateKey, vars: Record<string, string>, templates: Partial<Templates> = active) {
  const body = (templates[key]?.trim() ? templates[key]! : TEMPLATE_DEFAULTS[key]);
  return body
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => vars[name] ?? "")
    // a gap that came out empty should not leave a blank line behind
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Words used to try a template with made-up details
export const SAMPLE_VARS: Record<string, string> = {
  businessName: "Kahani Caterers", customerName: "Ayesha", balance: "₹26,500", invoiceNo: "Invoice 12", functionDate: "14-11-2026",
  upiLine: "Pay by UPI to kahani@upi.", link: "https://virunnu.com/b/abc123", billLabel: "food bill", total: "₹53,000", received: "₹26,500",
  balanceLine: "*Balance: ₹26,500*", invoiceLines: "Invoice 12 · Food bill: ₹53,000\nInvoice 13 · Service & Settings bill: ₹13,000", billed: "₹66,000",
  quoteNo: "Q-004", validLine: "Price valid until 20-11-2026", 
};
