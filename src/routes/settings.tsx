import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Save, RotateCcw, Trash2, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import { useAuth, signOut } from "@/lib/auth-context";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Cài đặt · Money Flow OS" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const state = useFinance();
  const actions = useFinanceActions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(state.settings.name);

  const save = () => {
    actions.updateSettings({ name: name.trim() || "Bạn" });
    toast.success("Đã lưu cài đặt");
  };

  const reset = () => {
    if (
      confirm(
        "Khôi phục dữ liệu mẫu sẽ thay thế dữ liệu hiện tại bằng ngân sách & mục tiêu mẫu. Bạn chắc chứ?",
      )
    ) {
      void actions.resetAll();
    }
  };

  const wipe = () => {
    if (
      confirm(
        "XOÁ HẾT? Toàn bộ tháng, mục tiêu, phòng cho thuê và giao dịch sẽ bị xoá vĩnh viễn.",
      )
    ) {
      void actions.wipeAll();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Đã đăng xuất");
    navigate({ to: "/auth" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Cài đặt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tuỳ chỉnh tên, đơn vị tiền tệ và quản lý dữ liệu trên đám mây.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">Tài khoản</h2>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Mail className="h-3 w-3" />
              {user?.email ?? "Chưa đăng nhập"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-foreground/[0.04]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Đăng xuất
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tên hiển thị
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên của bạn"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Đơn vị tiền tệ
            </span>
            <input
              value="VND (₫)"
              disabled
              className="mt-1.5 h-11 w-full cursor-not-allowed rounded-xl border border-border bg-background/40 px-3 text-sm text-muted-foreground"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={save}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="h-4 w-4" />
            Lưu thay đổi
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold tracking-tight text-foreground">Quản lý dữ liệu</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Dữ liệu của bạn được lưu an toàn trên Supabase và đồng bộ giữa các thiết bị.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="flex items-start gap-3 rounded-2xl border border-border bg-background/40 p-4 text-left transition-colors hover:bg-foreground/[0.04]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-investments/15 text-investments">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Khôi phục dữ liệu mẫu</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Reset về ngân sách & mục tiêu mẫu ban đầu
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={wipe}
            className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-4 text-left transition-colors hover:bg-destructive/10"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-destructive">Xoá toàn bộ dữ liệu</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Không thể hoàn tác. Hãy chắc trước khi nhấn.
              </div>
            </div>
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-base font-bold tracking-tight text-foreground">Giới thiệu</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">Money Flow OS</strong> là hệ điều hành tài chính cá nhân
          giúp bạn nhìn thấy dòng tiền của mình như một CFO chuyên nghiệp. Trực quan hoá, lập ngân sách, theo dõi
          mục tiêu và đưa ra quyết định tài chính tốt hơn — mỗi ngày.
        </p>
      </section>
    </div>
  );
}
