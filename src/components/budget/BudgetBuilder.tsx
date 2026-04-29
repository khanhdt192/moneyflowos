import { useState } from "react";
import { CategoryPanel } from "./CategoryPanel";
import { SankeyChart } from "./SankeyChart";
import { AnnualSummary } from "./AnnualSummary";
import type { BudgetItem, BudgetState, CategoryKey } from "./types";

const uid = () => Math.random().toString(36).slice(2, 9);

const initial: BudgetState = {
  income: [
    { id: uid(), name: "Primary Job", amount: 5000 },
    { id: uid(), name: "Side Gig", amount: 1000 },
  ],
  needs: [
    { id: uid(), name: "Housing", amount: 2000 },
    { id: uid(), name: "Transportation", amount: 500 },
    { id: uid(), name: "Groceries", amount: 600 },
  ],
  wants: [
    { id: uid(), name: "Entertainment", amount: 400 },
    { id: uid(), name: "Shopping", amount: 300 },
    { id: uid(), name: "Dining Out", amount: 300 },
  ],
  savings: [
    { id: uid(), name: "Emergency Fund", amount: 500 },
    { id: uid(), name: "Investments", amount: 1000 },
  ],
};

export function BudgetBuilder() {
  const [data, setData] = useState<BudgetState>(initial);

  const add = (cat: CategoryKey, name: string, amount: number) =>
    setData((d) => ({ ...d, [cat]: [...d[cat], { id: uid(), name, amount }] }));

  const remove = (cat: CategoryKey, id: string) =>
    setData((d) => ({ ...d, [cat]: d[cat].filter((i) => i.id !== id) }));

  const update = (cat: CategoryKey, id: string, patch: Partial<BudgetItem>) =>
    setData((d) => ({
      ...d,
      [cat]: d[cat].map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));

  const cats: CategoryKey[] = ["income", "needs", "wants", "savings"];

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-card lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
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
        </aside>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
          <SankeyChart data={data} />
        </div>
      </div>
      <AnnualSummary data={data} />
    </div>
  );
}
