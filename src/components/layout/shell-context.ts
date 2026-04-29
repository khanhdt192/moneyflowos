import { createContext, useContext } from "react";

export interface ShellCtx {
  openQuickAdd(): void;
  openMobileSidebar(): void;
  closeMobileSidebar(): void;
  mobileSidebarOpen: boolean;
}

export const ShellContext = createContext<ShellCtx | null>(null);

export function useShell(): ShellCtx {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <AppShell>");
  return ctx;
}
