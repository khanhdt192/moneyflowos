import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Copy } from "lucide-react";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import { formatMonthLabel, monthKey, shiftMonth } from "@/lib/finance-types";

export function MonthSelector() {
  const state = useFinance();
  const actions = useFinanceActions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const monthList = useMemo(() => {
    const seen = new Set(Object.keys(state.months));
    const current = monthKey();
    seen.add(current);
    // Always show 12 months (current ± 6) plus any with data
    for (let i = -6; i <= 1; i++) seen.add(shiftMonth(current, i));
    return Array.from(seen).sort().reverse();
  }, [state.months]);

  const prevKey = shiftMonth(state.activeMonth, -1);
  const hasPrev = !!state.months[prevKey];
  const activeMonthEmpty =
    (state.months[state.activeMonth]?.income.length ?? 0) === 0 &&
    (state.months[state.activeMonth]?.needs.length ?? 0) === 0 &&
    (state.months[state.activeMonth]?.wants.length ?? 0) === 0 &&
    (state.months[state.activeMonth]?.savings.length ?? 0) === 0;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card/70 p-1">
        <button
          type="button"
          aria-label="Tháng trước"
          onClick={() => actions.setActiveMonth(shiftMonth(state.activeMonth, -1))}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/[0.04]"
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="num">{formatMonthLabel(state.activeMonth)}</span>
        </button>
        <button
          type="button"
          aria-label="Tháng sau"
          onClick={() => actions.setActiveMonth(shiftMonth(state.activeMonth, 1))}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
          <div className="max-h-64 overflow-y-auto p-1">
            {monthList.map((k) => {
              const active = k === state.activeMonth;
              const hasData = !!state.months[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    actions.setActiveMonth(k);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-foreground/[0.06] font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                  }`}
                >
                  <span className="num">{formatMonthLabel(k)}</span>
                  {hasData ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-income" aria-hidden />
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider">trống</span>
                  )}
                </button>
              );
            })}
          </div>
          {activeMonthEmpty && hasPrev && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => {
                  actions.duplicateMonthFromPrev();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-foreground/[0.04]"
              >
                <Copy className="h-3.5 w-3.5" />
                Sao chép từ tháng trước
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
