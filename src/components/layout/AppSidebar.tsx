import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Home,
  FileBarChart,
  Settings,
  Moon,
  Sun,
  Sparkles,
  X,
} from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { useShell } from "./shell-context";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Giao dịch", url: "/cash-flow", icon: ArrowLeftRight },
  { title: "Mục tiêu", url: "/goals", icon: Target },
  { title: "Cho thuê", url: "/rental", icon: Home },
  { title: "Báo cáo", url: "/reports", icon: FileBarChart },
  { title: "Cài đặt", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [dark, setDark] = useState(false);
  const state = useFinance();
  const { mobileSidebarOpen, closeMobileSidebar } = useShell();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const initials = state.settings.name?.[0]?.toUpperCase() ?? "K";

  const Inner = (
    <>
      {/* Brand */}
      <div className="mb-6 flex items-center justify-between px-2 lg:mb-8">
        <Link
          to="/"
          onClick={closeMobileSidebar}
          className="flex items-center gap-2.5"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-investments text-primary-foreground shadow-glow">
            <Sparkles className="h-4.5 w-4.5" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">Money Flow</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Operating System
            </div>
          </div>
        </Link>
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={closeMobileSidebar}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        {items.map((item) => {
          const active = item.url === "/" ? path === "/" : path.startsWith(item.url);
          return (
            <Link
              key={item.url}
              to={item.url as "/"}
              onClick={closeMobileSidebar}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-foreground/[0.04] text-foreground shadow-card ring-1 ring-border"
                  : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: profile + theme */}
      <div className="space-y-3 border-t border-border pt-4">
        <button
          onClick={toggle}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <span className="flex items-center gap-2.5">
            {dark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
            {dark ? "Dark mode" : "Light mode"}
          </span>
          <span className="relative h-5 w-9 rounded-full bg-foreground/10">
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground shadow transition-all ${dark ? "left-4" : "left-0.5"}`}
            />
          </span>
        </button>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-income to-savings text-sm font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold text-foreground">{state.settings.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">Premium · $29/mo</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 z-30 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border bg-card/60 px-4 py-6 backdrop-blur-xl lg:flex">
        {Inner}
      </aside>

      {/* Mobile drawer */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
            onClick={closeMobileSidebar}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-card px-4 py-6 lg:hidden">
            {Inner}
          </aside>
        </>
      )}
    </>
  );
}
