import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { AuthCard } from "@/components/auth/AuthCard";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Đăng nhập · Money Flow OS" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  return (
    <div className="relative grid min-h-screen w-full place-items-center bg-background bg-hero px-4 py-10">
      <AuthCard />
      <Toaster position="top-right" richColors closeButton theme="system" />
    </div>
  );
}
