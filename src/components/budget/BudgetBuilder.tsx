import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { CategoryPanel } from "./CategoryPanel";
import { SankeyChart } from "./SankeyChart";
import { AnnualSummary } from "./AnnualSummary";
import { KpiCard } from "../dashboard/KpiCard";
import { InsightsGrid } from "../dashboard/InsightsGrid";
import type { BudgetItem, BudgetState, CategoryKey } from "./types";

const uid = () => Math.random().toString(36).slice(2, 9);

// realistic VND values
const initial: BudgetState = {
  income: [
    { id: uid(), name: "Lương chính", amount: 45_000_000 },
    { id: uid(), name: "Freelance", amount: 12_000_000 },
    { id: uid(), name: "Cho thuê căn hộ", amount: 8_000_000 },
  ],
  needs: [
    { id: uid(), name: "Tiền nhà", amount: 12_000_000 },
    { id: uid(), name: "Ăn uống", amount: 6_000_000 },
    { id: uid(), name: "Đi lại", amount: 2_500_000 },
    { id: uid(), name: "Điện nước, internet", amount: 1_500_000 },
  ],
  wants: [
    { id: uid(), name: "Cà phê & nhà hàng", amount: 3_000_000 },
    { id: uid(), name: "Giải trí, mua sắm", amount: 4_000_000 },
    { id: uid(), name: "Du lịch", amount: 2_500_000 },
  ],
  savings: [
    { id: uid(), name: "Quỹ khẩn cấp", amount: 6_000_000 },
    { id: uid(), name: "Đầu tư cổ phiếu", amount: 10_000_000 },
    { id: uid(), name: "Quỹ mua nhà", amount: 15_500_000 },
  ],
};

export function BudgetBuilder() {
  const [data, setData] = useState<BudgetState>(initial);

  const add = (cat: CategoryKey, name: string, amount: number) =>
    setData((d) => ({ ...d, [cat]: [...d[cat], { id: uid(), name, amount }] }));
  const remove = (cat: CategoryKey, id: string) =>
    setData((d) => ({ ...d, [cat]: d[cat].filter((i) => i.id !== id) }));
  const update = (cat: CategoryKey, id: string, patch: Partial<BudgetItem>) =>
    setData((d) => ({ ...d, [cat]: d[cat].map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const totalIncome = data.income.reduce((s, i) => s + i.amount, 0);
  const totalExpense =
    data.needs.reduce((s, i) => s + i.amount, 0) +
    data.wants.reduce((s, i) => s + i.amount, 0);
  const totalSavings = data.savings.reduce((s, i) => s + i.amount, 0);
  const netCashflow = totalIncome - totalExpense - totalSavings;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  const cats: CategoryKey[] = ["income", "needs", "wants", "savings"];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Tổng Thu Nhập"
          value={totalIncome}
          delta={8.4}
          icon={TrendingUp}
          accent="income"
          spark={[40, 42, 39, 44, 48, 52, 55, 58, 62, 65]}
        />
        <KpiCard
          index={1}
          label="Tổng Chi Tiêu"
          value={totalExpense}
          delta={-2.1}
          icon={TrendingDown}
          accent="needs"
          spark={[30, 34, 33, 31, 32, 30, 29, 31, 30, 29]}
        />
        <KpiCard
          index={2}
          label="Dòng Tiền Ròng"
          value={netCashflow}
          delta={12.6}
          icon={Wallet}
          accent="investments"
          spark={[5, 8, 10, 9, 12, 14, 13, 16, 18, 22]}
        />
        <KpiCard
          index={3}
          label="Tỷ Lệ Tiết Kiệm"
          value={savingsRate}
          isPercent
          delta={3.2}
          icon={PiggyBank}
          accent="savings"
          spark={[18, 20, 19, 22, 24, 23, 26, 28, 30, 31]}
        />
      </section>

      {/* Hero Sankey + sidebar */}
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card bg-hero">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-income" />
                Cash Flow · Tháng 4
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
                onAdd={(n, a) => add(c, n, a)}
                onRemove={(id) => remove(c, id)}
                onUpdate={(id, p) => update(c, id, p)}
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
