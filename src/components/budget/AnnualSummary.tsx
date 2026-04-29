import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BudgetState } from "./types";

export function AnnualSummary({ data }: { data: BudgetState }) {
  const [open, setOpen] = useState(false);

  const sum = (k: keyof BudgetState) =>
    data[k].reduce((s, i) => s + i.amount, 0);

  const monthlyIncome = sum("income");
  const monthlyNeeds = sum("needs");
  const monthlyWants = sum("wants");
  const monthlySavings = sum("savings");
  const monthlyUnalloc = Math.max(0, monthlyIncome - monthlyNeeds - monthlyWants - monthlySavings);

  const rows = [
    { label: "Income", monthly: monthlyIncome, color: "var(--income)" },
    { label: "Needs", monthly: monthlyNeeds, color: "var(--needs)" },
    { label: "Wants", monthly: monthlyWants, color: "var(--wants)" },
    { label: "Savings", monthly: monthlySavings, color: "var(--savings)" },
    { label: "Unallocated", monthly: monthlyUnalloc, color: "var(--unallocated)" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <div>
          <h3 className="text-lg font-bold text-foreground">Annual Summary</h3>
          <p className="text-sm text-muted-foreground">
            {open ? "Click to collapse" : "Click to expand"}
          </p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-6 py-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 font-semibold">Category</th>
                      <th className="py-2 text-right font-semibold">Monthly</th>
                      <th className="py-2 text-right font-semibold">Yearly</th>
                      <th className="py-2 text-right font-semibold">% of income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label} className="border-t border-border">
                        <td className="py-3">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: r.color }}
                            />
                            <span className="font-medium text-foreground">{r.label}</span>
                          </span>
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          ${r.monthly.toFixed(2)}
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          ${(r.monthly * 12).toFixed(2)}
                        </td>
                        <td className="py-3 text-right tabular-nums text-muted-foreground">
                          {monthlyIncome > 0
                            ? ((r.monthly / monthlyIncome) * 100).toFixed(1)
                            : "0.0"}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
