import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { formatCompact } from "@/lib/format";

interface KpiProps {
  label: string;
  value: number;
  isPercent?: boolean;
  delta: number; // percent change
  spark: number[];
  icon: LucideIcon;
  accent: "income" | "needs" | "savings" | "investments";
  index: number;
}

const accentMap: Record<KpiProps["accent"], { bg: string; ring: string }> = {
  income: { bg: "var(--income)", ring: "var(--income-soft)" },
  needs: { bg: "var(--needs)", ring: "var(--needs-soft)" },
  savings: { bg: "var(--savings)", ring: "var(--savings-soft)" },
  investments: { bg: "var(--investments)", ring: "var(--investments-soft)" },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 120;
  const h = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const r = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / r) * h}`)
    .join(" ");
  const area = `M0,${h} L${pts.split(" ").join(" L")} L${w},${h} Z`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ label, value, isPercent, delta, spark, icon: Icon, accent, index }: KpiProps) {
  const positive = delta >= 0;
  const color = accentMap[accent].bg;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14]"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: accentMap[accent].ring, color }}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </div>
        <div
          className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            positive ? "bg-income/10 text-income" : "bg-needs/10 text-needs"
          }`}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}%
        </div>
      </div>
      <div className="mt-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-[26px] font-bold tracking-tight text-foreground num">
          {isPercent ? `${value.toFixed(1)}%` : formatCompact(value)}
        </div>
      </div>
      <div className="mt-2">
        <Sparkline data={spark} color={color} />
      </div>
    </motion.div>
  );
}
