import { useMemo, useState } from "react";
import { Search, Trash2, ArrowDownRight, ArrowUpRight, PiggyBank, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { Transaction, TxType } from "@/lib/finance-types";
import { formatMoney } from "@/utils/format";

type FilterType = "all" | TxType;
type FilterRange = "current" | "all" | "last3";

const TYPE_META: Record<TxType, { label: string; color: string; icon: typeof ArrowUpRight }> = {
  income: { label: "Thu nhập", color: "var(--income)", icon: ArrowUpRight },
  expense: { label: "Chi tiêu", color: "var(--needs)", icon: ArrowDownRight },
  savings: { label: "Tiết kiệm", color: "var(--savings)", icon: PiggyBank },
  investment: { label: "Đầu tư", color: "var(--wants)", icon: TrendingUp },
};

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "income", label: "Thu" },
  { value: "expense", label: "Chi" },
  { value: "savings", label: "Tiết kiệm" },
  { value: "investment", label: "Đầu tư" },
];

const RANGES: { value: FilterRange; label: string }[] = [
  { value: "current", label: "Tháng này" },
  { value: "last3", label: "3 tháng gần nhất" },
  { value: "all", label: "Tất cả" },
];

export function TransactionList() {
  const state = useFinance();
  const actions = useFinanceActions();

  const [query, setQuery] = useState("");
  const [type, setType] = useState<FilterType>("all");
  const [range, setRange] = useState<FilterRange>("current");

  const txs = useMemo(() => {
    const all: (Transaction & { monthKey: string })[] = [];
    const keys = Object.keys(state.months).sort().reverse();
    const limit =
      range === "current" ? 1 : range === "last3" ? 3 : keys.length;
    const allowed = new Set(
      range === "current"
        ? [state.activeMonth]
        : keys.slice(0, limit),
    );
    for (const k of keys) {
      if (!allowed.has(k)) continue;
      for (const t of state.months[k].transactions) all.push({ ...t, monthKey: k });
    }
    return all
      .filter((t) => (type === "all" ? true : t.type === type))
      .filter((t) =>
        query.trim()
          ? `${t.category} ${t.note ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())
          : true,
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [state.months, state.activeMonth, type, query, range]);

  const totals = useMemo(() => {
    let income = 0,
      expense = 0,
      saved = 0;
    for (const t of txs) {
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
      else saved += t.amount;
    }
    return { income, expense, saved };
  }, [txs]);

  const handleDelete = (id: string, label: string) => {
    if (!confirm(`Xoá giao dịch "${label}"?`)) return;
    actions.removeTransaction(id);
    toast.success("Đã xoá giao dịch", {
      action: { label: "Hoàn tác", onClick: () => actions.undo() },
    });
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCell label="Tổng thu" value={totals.income} color="var(--income)" />
        <SummaryCell label="Tổng chi" value={totals.expense} color="var(--needs)" />
        <SummaryCell label="Tổng tiết kiệm" value={totals.saved} color="var(--savings)" />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo hạng mục, ghi chú…"
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as FilterRange)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = type === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setType(f.value)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  active
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {txs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-foreground/[0.04] text-2xl">
              ✨
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              Chưa có giao dịch nào
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Bấm "Giao dịch mới" để bắt đầu ghi chép
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Ngày</th>
                  <th className="px-4 py-3 font-semibold">Hạng mục</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
                  <th className="px-4 py-3 font-semibold">Ghi chú</th>
                  <th className="px-4 py-3" aria-label="Hành động" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {txs.map((t) => {
                    const meta = TYPE_META[t.type];
                    const Icon = meta.icon;
                    const sign = t.type === "income" ? "+" : t.type === "expense" ? "−" : "↑";
                    return (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="group border-b border-border last:border-0 hover:bg-foreground/[0.02]"
                      >
                        <td className="num whitespace-nowrap px-4 py-3 text-[13px] text-muted-foreground">
                          {t.date}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{t.category}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold"
                            style={{
                              background: `color-mix(in oklab, ${meta.color} 12%, transparent)`,
                              color: meta.color,
                            }}
                          >
                            <Icon className="h-3 w-3" strokeWidth={2.6} />
                            {meta.label}
                          </span>
                        </td>
                        <td
                          className="num whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums"
                          style={{ color: meta.color }}
                        >
                          {sign} {formatMoney(t.amount)}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-muted-foreground">
                          {t.note || "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            aria-label="Xoá"
                            onClick={() => handleDelete(t.id, t.category)}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="num mt-2 text-lg font-bold tabular-nums" style={{ color }}>
        {formatMoney(value)}
      </div>
    </div>
  );
}
