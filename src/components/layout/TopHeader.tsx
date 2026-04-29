import { Bell, Plus, Search, Menu, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { greet } from "@/lib/format";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import { MonthSelector } from "./MonthSelector";
import { useShell } from "./shell-context";

export function TopHeader() {
  const state = useFinance();
  const actions = useFinanceActions();
  const { openQuickAdd, openMobileSidebar } = useShell();

  const handleUndo = () => {
    if (actions.undo()) toast.success("Đã hoàn tác thay đổi cuối");
    else toast.info("Không còn thay đổi để hoàn tác");
  };

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 lg:py-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Mở menu"
          onClick={openMobileSidebar}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold tracking-tight text-foreground sm:text-[22px]">
            {greet(state.settings.name)} <span className="inline-block">👋</span>
          </h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Tiền của bạn đang tăng trưởng tốt hôm nay.
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:block">
          <MonthSelector />
        </div>

        <div className="relative hidden xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Tìm giao dịch, mục tiêu…"
            className="h-10 w-56 rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:w-72 focus:ring-2 focus:ring-ring/40"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <button
          type="button"
          aria-label="Hoàn tác"
          onClick={handleUndo}
          disabled={!actions.canUndo()}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-all hover:scale-[1.03] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <Undo2 className="h-[18px] w-[18px]" />
        </button>

        <button
          type="button"
          aria-label="Thông báo"
          className="relative hidden h-10 w-10 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-all hover:scale-[1.03] hover:text-foreground sm:grid"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-needs ring-2 ring-background" />
        </button>

        <button
          type="button"
          onClick={openQuickAdd}
          className="hidden h-10 items-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-background shadow-elevated transition-all hover:scale-[1.02] active:scale-[0.98] sm:flex"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} />
          Giao dịch mới
        </button>
      </div>

      {/* Mobile-only month selector row */}
      <div className="w-full md:hidden">
        <MonthSelector />
      </div>
    </header>
  );
}
