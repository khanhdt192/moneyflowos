import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BudgetState } from "./types";
import { formatVND } from "@/lib/format";

export function AnnualSummary({ data }: { data: BudgetState }) {
  const [open, setOpen] = useState(false);
  const sum = (k: keyof BudgetState) => data[k].reduce((s, i) => s + i.amount, 0);

  const monthlyIncome = sum("income");
  const monthlyNeeds = sum("needs");
  const monthlyWants = sum("wants");
  const monthlySavings = sum("savings");
  const monthlyUnalloc = Math.max(0, monthlyIncome - monthlyNeeds - monthlyWants - monthlySavings);

  const rows = [
    { label: "Thu nhập", monthly: monthlyIncome, color: "var(--income)" },
    { label: "Thiết yếu", monthly: monthlyNeeds, color: "var(--needs)" },
    { label: "Cá nhân", monthly: monthlyWants, color: "var(--wants)" },
    { label: "Tiết kiệm", monthly: monthlySavings, color: "var(--savings)" },
    { label: "Chưa phân bổ", monthly: monthlyUnalloc, color: "var(--unallocated)" },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-foreground/[0.02]"
      >
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">Tổng Quan Năm</h3>
          <p className="text-[13px] text-muted-foreground">
            {open ? "Nhấn để thu gọn" : "Nhấn để xem chi tiết theo năm"}
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
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-2 font-semibold">Hạng mục</th>
                      <th className="py-2 text-right font-semibold">Hàng tháng</th>
                      <th className="py-2 text-right font-semibold">Hàng năm</th>
                      <th className="py-2 text-right font-semibold">% thu nhập</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.label} className="border-t border-border">
                        <td className="py-3">
                          <span className="inline-flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                            <span className="font-medium text-foreground">{r.label}</span>
                          </span>
                        </td>
                        <td className="num py-3 text-right">{formatVND(r.monthly)}</td>
                        <td className="num py-3 text-right">{formatVND(r.monthly * 12)}</td>
                        <td className="num py-3 text-right text-muted-foreground">
                          {monthlyIncome > 0 ? ((r.monthly / monthlyIncome) * 100).toFixed(1) : "0.0"}%
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
