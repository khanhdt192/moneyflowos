import { createFileRoute } from "@tanstack/react-router";
import { BudgetBuilder } from "@/components/budget/BudgetBuilder";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Money Flow OS — Personal Finance, Beautifully Visualized" },
      {
        name: "description",
        content:
          "Money Flow OS giúp bạn trực quan hoá dòng tiền với sơ đồ Sankey cao cấp, theo dõi thu nhập, chi tiêu, tiết kiệm và mục tiêu tài chính.",
      },
      { property: "og:title", content: "Money Flow OS" },
      {
        property: "og:description",
        content: "Premium personal finance OS — visualize your money flow like a CFO.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen w-full bg-background bg-hero">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 px-8 py-6">
          <BudgetBuilder />
          <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            Money Flow OS · Built with care · Premium personal finance
          </footer>
        </main>
      </div>
    </div>
  );
}
