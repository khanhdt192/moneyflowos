import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, Home } from "lucide-react";
import type { BudgetState } from "../budget/types";
import { formatCompact } from "@/lib/format";

export function InsightsGrid({ data }: { data: BudgetState }) {
  const income = data.income.reduce((s, i) => s + i.amount, 0);
  const needs = data.needs.reduce((s, i) => s + i.amount, 0);
  const wants = data.wants.reduce((s, i) => s + i.amount, 0);
  const savings = data.savings.reduce((s, i) => s + i.amount, 0);
  const rate = income > 0 ? (savings / income) * 100 : 0;
  const wantsPct = income > 0 ? (wants / income) * 100 : 0;

  const houseGoal = 2_500_000_000;
  const saved = savings * 18;
  const progress = Math.min(100, (saved / houseGoal) * 100);

  const cards = [
    {
      icon: Sparkles,
      tag: "AI Insight",
      tagColor: "var(--investments)",
      title:
        rate >= 20
          ? `Bạn đang tiết kiệm ${rate.toFixed(0)}% — vượt chuẩn 50/30/20`
          : `Hãy nâng tỷ lệ tiết kiệm lên 20% để tăng tốc tự do tài chính`,
      sub:
        rate >= 20
          ? "Tiếp tục đà này, bạn sẽ đạt mục tiêu sớm hơn 6 tháng."
          : `Hiện tại bạn chỉ tiết kiệm ${rate.toFixed(0)}% thu nhập.`,
    },
    {
      icon: AlertTriangle,
      tag: "Cảnh báo chi tiêu",
      tagColor: "var(--warning)",
      title:
        wantsPct > 30
          ? `Chi tiêu cá nhân chiếm ${wantsPct.toFixed(0)}% — cao hơn khuyến nghị`
          : `Chi tiêu cá nhân ở mức an toàn (${wantsPct.toFixed(0)}%)`,
      sub: `Nhu cầu thiết yếu: ${formatCompact(needs)} / tháng`,
    },
    {
      icon: Home,
      tag: "Mục Tiêu Mua Nhà",
      tagColor: "var(--income)",
      title: `${formatCompact(saved)} / ${formatCompact(houseGoal)}`,
      sub: `Còn ${(100 - progress).toFixed(0)}% để hoàn thành mục tiêu 18 tháng`,
      progress,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.tag}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="flex items-center gap-2">
            <div
              className="grid h-7 w-7 place-items-center rounded-lg"
              style={{ background: `color-mix(in oklab, ${c.tagColor} 14%, transparent)`, color: c.tagColor }}
            >
              <c.icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: c.tagColor }}>
              {c.tag}
            </span>
          </div>
          <h4 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
            {c.title}
          </h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{c.sub}</p>

          {c.progress !== undefined && (
            <div className="mt-4">
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.progress}%` }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, var(--income), var(--savings))` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-muted-foreground">
                <span>0%</span>
                <span className="num text-foreground">{c.progress.toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
