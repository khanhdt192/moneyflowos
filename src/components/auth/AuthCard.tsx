import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "signup" | "reset";

export function AuthCard() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Đăng nhập thành công");
      } else if (mode === "signup") {
        const redirectTo = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo, data: { full_name: name || undefined } },
        });
        if (error) throw error;
        toast.success("Đã tạo tài khoản — kiểm tra email để xác nhận!");
      } else {
        const redirectTo = `${window.location.origin}/`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });
        if (error) throw error;
        toast.success("Đã gửi liên kết đặt lại mật khẩu");
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      toast.error(translateError(msg));
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  const isReset = mode === "reset";

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-foreground text-background shadow-elevated">
          <span className="text-2xl">💸</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Money Flow OS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tài chính cá nhân, đẹp như một CFO
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
        {/* Tabs */}
        {!isReset && (
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === "signin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Đăng ký
            </button>
          </div>
        )}

        {isReset && (
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Quên mật khẩu</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nhập email để nhận liên kết đặt lại.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <AnimatePresence initial={false}>
            {isSignup && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Field
                  icon={<UserIcon className="h-4 w-4" />}
                  label="Họ tên"
                  type="text"
                  value={name}
                  onChange={setName}
                  placeholder="Tên của bạn"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Field
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ban@email.com"
            required
            autoComplete="email"
          />

          {!isReset && (
            <Field
              icon={<Lock className="h-4 w-4" />}
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow transition hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!loading && (
              <>
                {mode === "signin" && "Đăng nhập"}
                {mode === "signup" && "Tạo tài khoản"}
                {mode === "reset" && "Gửi liên kết"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => setMode("reset")}
              className="text-muted-foreground hover:text-foreground"
            >
              Quên mật khẩu?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Quay lại đăng nhập
            </button>
          )}
          <span className="text-muted-foreground">
            Đồng bộ trên mọi thiết bị · An toàn · Không quảng cáo
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Bằng việc tiếp tục, bạn đồng ý lưu trữ dữ liệu cá nhân an toàn trên Supabase.
      </p>
    </div>
  );
}

function Field(props: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {props.label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 transition focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-foreground/10">
        <span className="text-muted-foreground">{props.icon}</span>
        <input
          type={props.type}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          required={props.required}
          autoComplete={props.autoComplete}
          minLength={props.minLength}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </label>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email hoặc mật khẩu không đúng";
  if (m.includes("user already registered") || m.includes("already exists"))
    return "Email này đã được đăng ký";
  if (m.includes("password") && m.includes("characters"))
    return "Mật khẩu phải có ít nhất 6 ký tự";
  if (m.includes("rate limit")) return "Quá nhiều yêu cầu — thử lại sau";
  if (m.includes("email") && m.includes("invalid")) return "Email không hợp lệ";
  return msg;
}
