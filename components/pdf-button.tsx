import { FileDown } from "lucide-react";

// A plain link: the browser downloads the PDF the server makes.
export function PdfButton({ href, label = "Download PDF" }: { href: string; label?: string }) {
  return (
    <a href={href} download className="no-print inline-flex grow sm:grow-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-amber-500 hover:bg-amber-600 min-h-10 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors">
      <FileDown className="h-4 w-4" /> {label}
    </a>
  );
}
