import { redirect } from "next/navigation";

// Receipts now live in the Day Book; this keeps old links and bookmarks working.
export default async function CatererPaymentsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  redirect(`/caterer/daybook?kind=RECEIPT${month && /^\d{4}-\d{2}$/.test(month) ? `&month=${month}` : ""}`);
}
