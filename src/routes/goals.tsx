import { createFileRoute } from "@tanstack/react-router";
import { GoalsBoard } from "@/components/goals/GoalsBoard";
import { WhatIfPanel } from "@/components/goals/WhatIfPanel";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [{ title: "Mục tiêu · Money Flow OS" }],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mục tiêu tài chính</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi tiến độ, xem ngày hoàn thành dự kiến, và mô phỏng kịch bản tăng tốc.
        </p>
      </header>
      <GoalsBoard />
      <WhatIfPanel />
    </div>
  );
}
