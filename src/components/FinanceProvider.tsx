import { useEffect, useState, type ReactNode } from "react";
import { financeStore } from "@/lib/finance-store";

/**
 * Hydrates the finance store from localStorage on the client and gates rendering
 * of children until the store has been hydrated. This avoids SSR/CSR mismatches
 * caused by server-rendering seed data and then loading user data on the client.
 */
export function FinanceProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    financeStore.hydrate();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Đang tải Money Flow…</div>
      </div>
    );
  }

  return <>{children}</>;
}
