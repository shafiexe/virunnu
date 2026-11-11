"use client";

import { MessageCircle } from "lucide-react";
import { statementMessage, whatsappLink } from "@/lib/caterer-share";

export function CatererStatementShare({ token, phone, catererName, customerName, billedPaise, receivedPaise, balancePaise }: {
  token: string; phone: string; catererName: string; customerName: string; billedPaise: number; receivedPaise: number; balancePaise: number;
}) {
  const send = () => {
    const url = `${window.location.origin}/s/${token}`;
    window.open(whatsappLink(phone, statementMessage({ catererName, customerName, billedPaise, receivedPaise, balancePaise, url })), "_blank", "noopener");
  };
  return (
    <button type="button" onClick={send} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white">
      <MessageCircle className="h-4 w-4" /> Send statement on WhatsApp
    </button>
  );
}
