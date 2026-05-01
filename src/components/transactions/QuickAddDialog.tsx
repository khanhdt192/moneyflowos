import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { TxType } from "@/lib/finance-types";
import { CATEGORY_META } from "@/lib/finance-types";
import { formatCompact } from "@/lib/format";
import { formatNumber, parseNumber } from "@/utils/format";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TYPES: { value: TxType; label: string; color: string; emoji: string }[] = [
  { value: "income", label: "Thu nhập", color: "var(--income)", emoji: "💰" },
  { value: "expense", label: "Chi tiêu", color: "var(--needs)", emoji: "🛒" },
  { value: "savings", label: "Tiết kiệm", color: "var(--savings)", emoji: "🏦" },
  { value: "investment", label: "Đầu tư", color: "var(--wants)", emoji: "📈" },
];

const SUGGESTIONS: Record<TxType, string[]> = {
  income: ["Lương chính", "Freelance", "Cho thuê căn hộ", "Cổ tức"],
  expense: ["Ăn uống", "Đi lại", "Cà phê & nhà hàng", "Mua sắm", "Hoá đơn"],
  savings: ["Quỹ khẩn cấp", "Quỹ mua nhà"],
  investment: ["Đầu tư cổ phiếu", "Quỹ ETF", "Crypto"],
};

export function QuickAddDialog({ open, onClose }: Props) {
  const state = useFinance();
  const actions = useFinanceActions();

  const [type, setType] = useState<TxType>("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setType("expense");
      setCategory("");
      setAmount(0);
      setDate(new Date().toISOString().slice(0, 10));
      setNote("");
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = () => {
    const amt = amount;
    if (!category.trim() || isNaN(amt) || amt <= 0) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    actions.addTransaction({
      type,
      category: category.trim(),
      amount: amt,
      date,
      note: note.trim() || undefined,
    });

    // Sync with budget items: if a matching named item exists in the right
    // bucket, bump its amount; otherwise create one (for new categories).
    const bucket =
      type === "income" ? "income" : type === "savings" || type === "investment" ? "savings" : "needs";
    const month = state.months[state.activeMonth];
    const existing = month?.[bucket]?.find(
      (i) => i.name.trim().toLowerCase() === category.trim().toLowerCase(),
    );
    if (existing) {
      actions.updateBudgetItem(bucket, existing.id, { amount: existing.amount + amt });
    }

    toast.success(`Đã thêm ${TYPES.find((t) => t.value === type)?.label.toLowerCase()}: ${formatCompact(amt)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-border bg-card shadow-elevated sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Giao dịch mới
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  Cập nhật ngay sơ đồ dòng tiền của bạn
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="space-y-4 px-5 py-5"
            >
              {/* Type pills */}
              <div className="grid grid-cols-4 gap-1.5">
                {TYPES.map((t) => {
                  const active = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition-all ${
                        active
                          ? "border-transparent text-background shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:bg-foreground/[0.03]"
                      }`}
                      style={active ? { background: t.color } : undefined}
                    >
                      <span className="text-lg leading-none">{t.emoji}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Amount */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Số tiền
                </label>
                <div className="relative mt-1.5">
                  <input
                    autoFocus
                    inputMode="numeric"
                    placeholder="0"
                    value={amount ? formatNumber(amount) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d,]/g, "");
                      setAmount(parseNumber(raw));
                    }}
                    className="num h-14 w-full rounded-xl border border-border bg-background px-4 pr-12 text-2xl font-bold tracking-tight outline-none focus:ring-2 focus:ring-ring/40"
                  />
                  <span className="num pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                    ₫
                  </span>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Hạng mục
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="VD: Ăn uống"
                  className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS[type].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCategory(s)}
                      className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Note */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ngày
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ghi chú
                  </label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tuỳ chọn"
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-foreground px-5 text-sm font-semibold text-background shadow-card transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Lưu giao dịch
                </button>
              </div>
            </form>

            {/* Hint */}
            <div className="border-t border-border bg-background/40 px-5 py-3 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Mẹo:</span> Hạng mục mới sẽ tự động cộng dồn vào ngân sách{" "}
              {CATEGORY_META[type === "income" ? "income" : type === "expense" ? "needs" : "savings"].short.toLowerCase()}.
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
