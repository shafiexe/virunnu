import { rs } from "@/lib/caterer-orders";

// Revenue (amber) and expenses (rose) side by side for each month; plain divs so it needs no chart library.
export function CatererBars({ data }: { data: { month: string; revenuePaise: number; expensePaise: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.revenuePaise, d.expensePaise]));
  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-2 h-40">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
            <div className="flex items-end gap-0.5 w-full h-full justify-center">
              <div className="w-1/2 max-w-3 rounded-t bg-amber-400" style={{ height: `${(d.revenuePaise / max) * 100}%`, minHeight: d.revenuePaise ? 2 : 0 }} title={`Billed ${rs(d.revenuePaise)}`} />
              <div className="w-1/2 max-w-3 rounded-t bg-rose-400" style={{ height: `${(d.expensePaise / max) * 100}%`, minHeight: d.expensePaise ? 2 : 0 }} title={`Expenses ${rs(d.expensePaise)}`} />
            </div>
            <span className="text-[10px] text-zinc-400">{d.month}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Billed</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Expenses</span>
      </div>
    </div>
  );
}
