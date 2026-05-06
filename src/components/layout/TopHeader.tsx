import { Menu } from "lucide-react";
import { MonthSelector } from "./MonthSelector";
import { useShell } from "./shell-context";

const rentalTabs = ["Tổng quan", "Phòng", "Chốt tháng", "Chi phí khác", "Mẫu hóa đơn", "Báo cáo"];

export function TopHeader() {
  const { openMobileSidebar } = useShell();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Mở menu"
            onClick={openMobileSidebar}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">Quản lý Cho thuê</h1>
            <p className="text-xs text-muted-foreground">Theo dõi phòng, kỳ chốt và báo cáo cho thuê.</p>
          </div>
        </div>

        <MonthSelector />
      </div>

      <nav className="mt-3 flex flex-wrap gap-1.5">
        {rentalTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className="rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {tab}
          </button>
        ))}
      </nav>
    </header>
  );
}
