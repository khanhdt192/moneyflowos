import { createFileRoute } from "@tanstack/react-router";
import { ReportsPanel } from "@/components/reports/ReportsPanel";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [{ title: "Báo cáo · Money Flow OS" }],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Báo cáo & Xuất dữ liệu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Xuất CSV, in báo cáo, hoặc xem tổng hợp dòng tiền theo từng tháng.
        </p>
      </header>
      <ReportsPanel />
    </div>
  );
}
