import { createFileRoute } from "@tanstack/react-router";
import { BudgetBuilder } from "@/components/budget/BudgetBuilder";

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
  component: BudgetBuilder,
});
