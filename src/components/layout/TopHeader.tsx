import { Bell, Plus, Search } from "lucide-react";
import { greet } from "@/lib/format";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/70 px-8 py-4 backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-bold tracking-tight text-foreground">
          {greet("Khánh")} <span className="inline-block">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Tiền của bạn đang tăng trưởng tốt hôm nay.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Tìm giao dịch, mục tiêu…"
            className="h-10 w-64 rounded-xl border border-border bg-card/70 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:w-80 focus:ring-2 focus:ring-ring/40"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <button className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-all hover:scale-[1.03] hover:text-foreground">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-needs ring-2 ring-background" />
        </button>

        <button className="flex h-10 items-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-background shadow-elevated transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Plus className="h-4 w-4" strokeWidth={2.6} />
          Giao dịch mới
        </button>
      </div>
    </header>
  );
}
