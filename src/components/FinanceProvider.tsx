import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { financeStore } from "@/lib/finance-store";
import { useAuth } from "@/lib/auth-context";

/**
 * Hydrates the cloud-backed finance store from Supabase whenever the user
 * is authenticated. Redirects unauthed users to /auth.
 */
export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    // Auth route handles its own UI — don't gate it.
    if (location.pathname.startsWith("/auth")) {
      setReady(true);
      return;
    }

    if (!user) {
      lastUid.current = null;
      financeStore.signOut();
      setReady(false);
      navigate({ to: "/auth" });
      return;
    }

    if (lastUid.current === user.id) {
      setReady(true);
      return;
    }

    lastUid.current = user.id;
    setReady(false);
    financeStore.hydrateForUser(user.id).finally(() => setReady(true));
  }, [user, loading, location.pathname, navigate]);

  // /auth renders without the shell.
  if (location.pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  if (loading || !ready) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-background bg-hero">
        <div className="text-sm text-muted-foreground">Đang tải Money Flow…</div>
      </div>
    );
  }

  return <>{children}</>;
}
