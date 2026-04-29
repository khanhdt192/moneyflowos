import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { CategoryPanel } from "./CategoryPanel";
import { SankeyChart } from "./SankeyChart";
import { AnnualSummary } from "./AnnualSummary";
import { KpiCard } from "../dashboard/KpiCard";
import { InsightsGrid } from "../dashboard/InsightsGrid";
import type { CategoryKey } from "@/lib/finance-types";
import { formatMonthLabel, shiftMonth } from "@/lib/finance-types";
import {
  useActiveMonth,
  useFinance,
  useFinanceActions,
} from "@/lib/finance-store";

export function BudgetBuilder() {
  const data = useActiveMonth();
  const state = useFinance();
  const actions = useFinanceActions();

  const totalIncome = data.income.reduce((s, i) => s + i.amount, 0);
  const totalExpense =
    data.needs.reduce((s, i) => s + i.amount, 0) +
    data.wants.reduce((s, i) => s + i.amount, 0);
  const totalSavings = data.savings.reduce((s, i) => s + i.amount, 0);
  const netCashflow = totalIncome - totalExpense - totalSavings;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // Compare vs previous month for KPI deltas
  const prev = state.months[shiftMonth(state.activeMonth, -1)];
  const prevIncome = prev?.income.reduce((s, i) => s + i.amount, 0) ?? 0;
  const prevExpense =
    (prev?.needs.reduce((s, i) => s + i.amount, 0) ?? 0) +
    (prev?.wants.reduce((s, i) => s + i.amount, 0) ?? 0);
  const prevSavings = prev?.savings.reduce((s, i) => s + i.amount, 0) ?? 0;

  const pctDelta = (current: number, previous: number) =>
    previous === 0 ? 0 : ((current - previous) / previous) * 100;

  const cats: CategoryKey[] = ["income", "needs", "wants", "savings"];

  // Build a 10-point spark trend from the last 10 months for each metric
  const sparks = useMemo(() => {
    const months: string[] = [];
    for (let i = 9; i >= 0; i--) months.push(shiftMonth(state.activeMonth, -i));
    const series = (k: CategoryKey | "expense" | "savingsRate") =>
      months.map((m) => {
        const md = state.months[m];
        if (!md) return 0;
        if (k === "expense")
          return (
            md.needs.reduce((s, i) => s + i.amount, 0) +
            md.wants.reduce((s, i) => s + i.amount, 0)
          );
        if (k === "savingsRate") {
          const inc = md.income.reduce((s, i) => s + i.amount, 0);
          const sav = md.savings.reduce((s, i) => s + i.amount, 0);
          return inc > 0 ? (sav / inc) * 100 : 0;
        }
        return md[k].reduce((s, i) => s + i.amount, 0);
      });

    const incomeSpark = series("income");
    const expenseSpark = series("expense");
    const savingsSpark = series("savings");
    const rateSpark = series("savingsRate");
    const netSpark = incomeSpark.map((v, i) => v - expenseSpark[i] - savingsSpark[i]);

    // Replace zero-only series with a gentle default so the cards don't look broken
    const polish = (xs: number[]) =>
      xs.every((v) => v === 0) ? [40, 42, 39, 44, 48, 52, 55, 58, 62, 65] : xs;

    return {
      income: polish(incomeSpark),
      expense: polish(expenseSpark),
      net: polish(netSpark),
      rate: polish(rateSpark),
    };
  }, [state.activeMonth, state.months]);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Tổng Thu Nhập"
          value={totalIncome}
          delta={pctDelta(totalIncome, prevIncome)}
          icon={TrendingUp}
          accent="income"
          spark={sparks.income}
        />
        <KpiCard
          index={1}
          label="Tổng Chi Tiêu"
          value={totalExpense}
          delta={pctDelta(totalExpense, prevExpense)}
          icon={TrendingDown}
          accent="needs"
          spark={sparks.expense}
        />
        <KpiCard
          index={2}
          label="Dòng Tiền Ròng"
          value={netCashflow}
          delta={pctDelta(netCashflow, prevIncome - prevExpense - prevSavings)}
          icon={Wallet}
          accent="investments"
          spark={sparks.net}
        />
        <KpiCard
          index={3}
          label="Tỷ Lệ Tiết Kiệm"
          value={savingsRate}
          isPercent
          delta={pctDelta(savingsRate, prevIncome > 0 ? (prevSavings / prevIncome) * 100 : 0)}
          icon={PiggyBank}
          accent="savings"
          spark={sparks.rate}
        />
      </section>

      {/* Hero Sankey + sidebar */}
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-card bg-hero sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-income" />
                Cash Flow · {formatMonthLabel(state.activeMonth)}
              </span>
              <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-foreground">
                Dòng Tiền Của Bạn
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Trực quan hoá hành trình tiền — từ thu nhập đến nơi nó đến.
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {(["income", "needs", "wants", "savings"] as const).map((k) => (
                <span
                  key={k}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: `var(--${k})` }} />
                  {k === "income" ? "Thu" : k === "needs" ? "Thiết yếu" : k === "wants" ? "Cá nhân" : "Tiết kiệm"}
                </span>
              ))}
            </div>
          </div>
          <SankeyChart data={data} />
        </div>

        <aside className="rounded-3xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between px-2 pb-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Quản lý Ngân sách</h3>
            <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Realtime
            </span>
          </div>
          <div className="scrollbar-slim max-h-[640px] space-y-5 overflow-y-auto px-2 pb-2 pr-1">
            {cats.map((c) => (
              <CategoryPanel
                key={c}
                category={c}
                items={data[c]}
                onAdd={(n, a) => actions.addBudgetItem(c, n, a)}
                onRemove={(id) => actions.removeBudgetItem(c, id)}
                onUpdate={(id, p) => actions.updateBudgetItem(c, id, p)}
              />
            ))}
          </div>
        </aside>
      </section>

      {/* Insights */}
      <InsightsGrid data={data} />

      {/* Annual */}
      <AnnualSummary data={data} />
    </div>
  );
}
