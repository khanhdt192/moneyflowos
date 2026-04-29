import { useCallback, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Toaster } from "sonner";
import { AppSidebar } from "./AppSidebar";
import { TopHeader } from "./TopHeader";
import { QuickAddDialog } from "@/components/transactions/QuickAddDialog";
import { ShellContext } from "./shell-context";

export { useShell } from "./shell-context";

export function AppShell({ children }: { children: ReactNode }) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const openQuickAdd = useCallback(() => setQuickAddOpen(true), []);
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <ShellContext.Provider
      value={{ openQuickAdd, openMobileSidebar, closeMobileSidebar, mobileSidebarOpen }}
    >
      <div className="flex min-h-screen w-full bg-background bg-hero">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            {children}
            <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
              Money Flow OS · Built with care · Premium personal finance
            </footer>
          </main>
        </div>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={openQuickAdd}
          aria-label="Giao dịch mới"
          className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-foreground text-background shadow-elevated transition-all hover:scale-105 active:scale-95 lg:hidden"
        >
          <Plus className="h-6 w-6" strokeWidth={2.6} />
        </button>

        <QuickAddDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
        <Toaster position="top-right" richColors closeButton theme="system" />
      </div>
    </ShellContext.Provider>
  );
}
