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

        <footer className="mt-20 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          Built with love · Inspired by sankey budget visualizations
        </footer>
      </main>
    </div>
  );
}
