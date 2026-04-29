import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { Goal } from "@/lib/finance-types";
import { formatCompact, formatVND } from "@/lib/format";

const COLORS = [
  "var(--income)",
  "var(--savings)",
  "var(--wants)",
  "var(--investments)",
  "var(--needs)",
];
const EMOJIS = ["🏠", "🚗", "✈️", "💍", "🎓", "🎯", "🛡️", "💼", "🌴", "📚"];

export function GoalsBoard() {
  const state = useFinance();
  const actions = useFinanceActions();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {state.goals.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              index={i}
              isEditing={editing === g.id}
              onEdit={() => setEditing(g.id)}
              onCancelEdit={() => setEditing(null)}
              onSave={(patch) => {
                actions.updateGoal(g.id, patch);
                setEditing(null);
                toast.success("Đã cập nhật mục tiêu");
              }}
              onDelete={() => {
                if (confirm(`Xoá mục tiêu "${g.name}"?`)) {
                  actions.removeGoal(g.id);
                  toast.success("Đã xoá mục tiêu", {
                    action: { label: "Hoàn tác", onClick: () => actions.undo() },
                  });
                }
              }}
            />
          ))}
        </AnimatePresence>

        {adding ? (
          <NewGoalCard
            onCancel={() => setAdding(false)}
            onCreate={(g) => {
              actions.addGoal(g);
              setAdding(false);
              toast.success("Đã tạo mục tiêu mới");
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-all hover:border-foreground/30 hover:bg-card/70 hover:text-foreground"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground/[0.04]">
              <Plus className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <span className="text-sm font-semibold">Thêm mục tiêu</span>
          </button>
        )}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  index,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  goal: Goal;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<Goal>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.target));
  const [saved, setSaved] = useState(String(goal.saved));
  const [contrib, setContrib] = useState(String(goal.monthlyContribution));
  const [emoji, setEmoji] = useState(goal.emoji);
  const [color, setColor] = useState(goal.color);

  const progress = Math.min(100, (goal.saved / goal.target) * 100);
  const remaining = Math.max(0, goal.target - goal.saved);
  const monthsToGoal =
    goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : Infinity;

  const eta = (() => {
    if (!isFinite(monthsToGoal)) return "Cần đặt mức đóng góp";
    if (monthsToGoal <= 0) return "Đã hoàn thành 🎉";
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToGoal);
    return `${d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })} · ${monthsToGoal} tháng`;
  })();

  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card"
      >
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Chỉnh sửa mục tiêu
          </span>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onCancelEdit}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="h-11 w-16 rounded-xl border border-border bg-background text-center text-xl outline-none"
            >
              {EMOJIS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên mục tiêu"
              className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <Field label="Đã có">
            <input
              type="number"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              className="num h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </Field>
          <Field label="Mục tiêu">
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="num h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </Field>
          <Field label="Đóng góp / tháng">
            <input
              type="number"
              value={contrib}
              onChange={(e) => setContrib(e.target.value)}
              className="num h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </Field>
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Chọn màu ${c}`}
                className={`h-7 w-7 rounded-lg ring-2 ring-offset-2 ring-offset-card transition-all ${
                  color === c ? "ring-foreground" : "ring-transparent"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onDelete}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                onSave({
                  name,
                  emoji,
                  color,
                  target: parseFloat(target) || 0,
                  saved: parseFloat(saved) || 0,
                  monthlyContribution: parseFloat(contrib) || 0,
                })
              }
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
            >
              <Check className="h-4 w-4" />
              Lưu
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
        style={{ background: goal.color }}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-2xl shadow-card"
            style={{ background: `color-mix(in oklab, ${goal.color} 14%, transparent)` }}
          >
            {goal.emoji}
          </div>
          <div className="leading-tight">
            <h3 className="text-base font-bold tracking-tight text-foreground">{goal.name}</h3>
            <div className="text-[11px] text-muted-foreground">{eta}</div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Chỉnh sửa"
          onClick={onEdit}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-foreground/[0.05] hover:text-foreground group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative mt-5 flex items-baseline gap-2">
        <span className="num text-2xl font-bold tabular-nums" style={{ color: goal.color }}>
          {formatCompact(goal.saved)}
        </span>
        <span className="text-[12px] font-medium text-muted-foreground">
          / {formatCompact(goal.target)}
        </span>
      </div>

      <div className="relative mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${goal.color}, color-mix(in oklab, ${goal.color} 60%, white))` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-muted-foreground">
          <span>{progress.toFixed(1)}%</span>
          <span className="num text-foreground">
            Còn {formatCompact(Math.max(0, goal.target - goal.saved))}
          </span>
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between rounded-2xl border border-border bg-background/50 px-3 py-2">
        <span className="text-[11px] font-medium text-muted-foreground">Đóng góp / tháng</span>
        <span className="num text-sm font-bold tabular-nums text-foreground">
          {formatVND(goal.monthlyContribution)}
        </span>
      </div>
    </motion.div>
  );
}

function NewGoalCard({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (g: Omit<Goal, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [contrib, setContrib] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState(COLORS[0]);

  const valid = name.trim() && parseFloat(target) > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between pb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Mục tiêu mới
        </span>
        <button
          type="button"
          aria-label="Huỷ"
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <select
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="h-11 w-16 rounded-xl border border-border bg-background text-center text-xl outline-none"
          >
            {EMOJIS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Mua xe hơi"
            autoFocus
            className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <Field label="Mục tiêu">
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0"
            className="num h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </Field>
        <Field label="Đóng góp / tháng">
          <input
            type="number"
            value={contrib}
            onChange={(e) => setContrib(e.target.value)}
            placeholder="0"
            className="num h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </Field>
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Chọn màu ${c}`}
              className={`h-7 w-7 rounded-lg ring-2 ring-offset-2 ring-offset-card transition-all ${
                color === c ? "ring-foreground" : "ring-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={() =>
            onCreate({
              name: name.trim(),
              emoji,
              color,
              target: parseFloat(target),
              monthlyContribution: parseFloat(contrib) || 0,
              saved: 0,
            })
          }
          className="h-10 w-full rounded-xl bg-foreground text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tạo mục tiêu
        </button>
      </div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
