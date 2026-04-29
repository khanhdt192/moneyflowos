import { createFileRoute } from "@tanstack/react-router";
import { BudgetBuilder } from "@/components/budget/BudgetBuilder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sankey Budget — Visualize Your Money Flow" },
      {
        name: "description",
        content:
          "Build a beautiful, interactive Sankey diagram of your budget. Map income to needs, wants and savings — and see exactly where your money goes.",
      },
      { property: "og:title", content: "Sankey Budget — Visualize Your Money Flow" },
      {
        property: "og:description",
        content:
          "Interactive Sankey diagram for personal budgeting. See your money flow at a glance.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto max-w-7xl px-6 pt-12 pb-8 lg:flex lg:items-end lg:justify-between lg:pt-16">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-savings" />
            Personal finance, made visual
          </span>
          <h1 className="mt-4 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground lg:text-6xl">
            Visualize Your <span className="text-primary">Money Flow</span>
          </h1>
        </div>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground lg:mt-0 lg:text-right">
          Create a beautiful, interactive diagram to understand where your money goes
          and take control of your financial future.
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-20">
        <BudgetBuilder />

        <section className="mt-20 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Understanding Your Money Flow
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Use the diagram above to map out your income sources and spending
              categories. This visualization helps you spot overspending and find
              new room to save.
            </p>

            <h3 className="mt-10 text-xl font-bold">The 50 / 30 / 20 Rule</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                { p: "50%", t: "Needs", d: "Housing, utilities, groceries, basic transport.", c: "var(--needs)" },
                { p: "30%", t: "Wants", d: "Dining out, entertainment, hobbies, travel.", c: "var(--wants)" },
                { p: "20%", t: "Savings", d: "Emergency fund, investing, debt payoff.", c: "var(--savings)" },
              ].map((r) => (
                <div
                  key={r.t}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card"
                  style={{ borderTop: `3px solid ${r.c}` }}
                >
                  <div className="text-3xl font-extrabold" style={{ color: r.c }}>
                    {r.p}
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground">{r.t}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.d}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h3 className="text-lg font-bold">How to read the chart</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Width = amount.</strong> Wider
                ribbons mean more money flowing.
              </li>
              <li>
                <strong className="text-foreground">Left to right.</strong> Income
                flows into your total budget, then out to categories.
              </li>
              <li>
                <strong className="text-foreground">Unallocated.</strong> Money you
                haven't assigned yet — a chance to save more.
              </li>
            </ul>
          </aside>
        </section>

        <footer className="mt-20 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          Built with love · Inspired by sankey budget visualizations
        </footer>
      </main>
    </div>
  );
}
