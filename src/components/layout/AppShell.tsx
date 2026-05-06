import { useCallback, useState, type ReactNode } from "react";
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
          <main className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-5">{children}</main>
        </div>

        <QuickAddDialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
        <Toaster position="top-right" richColors closeButton theme="system" />
      </div>
    </ShellContext.Provider>
  );
}
