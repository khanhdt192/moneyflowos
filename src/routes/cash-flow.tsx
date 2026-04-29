import { createFileRoute } from "@tanstack/react-router";
import { TransactionList } from "@/components/transactions/TransactionList";

export const Route = createFileRoute("/cash-flow")({
  head: () => ({
    meta: [{ title: "Giao dịch · Money Flow OS" }],
  }),
  component: CashFlowPage,
});

function CashFlowPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Giao dịch</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lịch sử mọi giao dịch — tìm kiếm, lọc và xem nhanh dòng tiền.
        </p>
      </header>
      <TransactionList />
    </div>
  );
}
