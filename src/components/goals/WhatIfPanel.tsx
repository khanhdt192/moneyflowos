import { useMemo, useState } from "react";
import { Sparkles, RotateCcw, TrendingUp } from "lucide-react";
import { useActiveMonth, useFinance } from "@/lib/finance-store";
import { formatCompact } from "@/lib/format"
import { formatMoney } from "@/utils/format";

export function WhatIfPanel() {
  const data = useActiveMonth();
  const state = useFinance();

  // Adjustments (per month, in VND)
  const [extraSavings, setExtraSavings] = useState(0);
  const [extraRental, setExtraRental] = useState(0);
  const [reduceWants, setReduceWants] = useState(0);

  const baseIncome = data.income.reduce((s, i) => s + i.amount, 0);
  const baseNeeds = data.needs.reduce((s, i) => s + i.amount, 0);
  const baseWants = data.wants.reduce((s, i) => s + i.amount, 0);
  const baseSavings = data.savings.reduce((s, i) => s + i.amount, 0);

  const newIncome = baseIncome + extraRental;
  const newWants = Math.max(0, baseWants - reduceWants);
  const newSavings = baseSavings + extraSavings + reduceWants + extraRental;

  const baseRate = baseIncome > 0 ? (baseSavings / baseIncome) * 100 : 0;
  const newRate = newIncome > 0 ? (newSavings / newIncome) * 100 : 0;

  // Project goals with new contribution rates
  const goalProjections = useMemo(() => {
    const totalNewMonthly = newSavings;
    const totalBaseMonthly = baseSavings;
    return state.goals.map((g) => {
      const share = totalBaseMonthly > 0 ? g.monthlyContribution / totalBaseMonthly : 0;
      const baseContrib = g.monthlyContribution;
      const newContrib = totalBaseMonthly > 0 ? totalNewMonthly * share : baseContrib;
      const remain = Math.max(0, g.target - g.saved);
      const baseMonths = baseContrib > 0 ? Math.ceil(remain / baseContrib) : Infinity;
      const newMonths = newContrib > 0 ? Math.ceil(remain / newContrib) : Infinity;
      return {
        id: g.id,
        name: g.name,
        emoji: g.emoji,
        color: g.color,
        baseMonths,
        newMonths,
        delta: isFinite(baseMonths) && isFinite(newMonths) ? baseMonths - newMonths : 0,
      };
    });
  }, [state.goals, baseSavings, newSavings]);

  const reset = () => {
    setExtraSavings(0);
    setExtraRental(0);
    setReduceWants(0);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-investments/15 text-investments">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              What-If Simulator
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Thử các kịch bản và xem mục tiêu thay đổi thế nào
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Đặt lại
        </button>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[1.2fr_1fr]">
        {/* Sliders */}
        <div className="space-y-5">
          <Slider
            label="Tiết kiệm thêm mỗi tháng"
            color="var(--savings)"
            value={extraSavings}
            onChange={setExtraSavings}
            max={20_000_000}
            step={500_000}
          />
          <Slider
            label="Tăng thu nhập cho thuê"
            color="var(--income)"
            value={extraRental}
            onChange={setExtraRental}
            max={15_000_000}
            step={500_000}
          />
          <Slider
            label="Giảm chi tiêu cá nhân"
            color="var(--wants)"
            value={reduceWants}
            onChange={setReduceWants}
            max={Math.max(1_000_000, baseWants)}
            step={500_000}
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Stat
              label="Tỷ lệ tiết kiệm"
              base={`${baseRate.toFixed(1)}%`}
              next={`${newRate.toFixed(1)}%`}
              up={newRate > baseRate}
            />
            <Stat
              label="Tiết kiệm / tháng"
              base={formatCompact(baseSavings)}
              next={formatCompact(newSavings)}
              up={newSavings > baseSavings}
            />
          </div>
        </div>

        {/* Goal projections */}
        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Tác động lên mục tiêu
          </div>
          {goalProjections.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              Tạo mục tiêu trước để xem dự đoán.
            </p>
          )}
          <div className="space-y-3">
            {goalProjections.map((g) => (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{g.emoji}</span>
                    <span className="text-sm font-semibold text-foreground">{g.name}</span>
                  </div>
                  {g.delta > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: `color-mix(in oklab, ${g.color} 14%, transparent)`,
                        color: g.color,
                      }}
                    >
                      Sớm hơn {g.delta} tháng
                    </span>
                  )}
                </div>
                <div className="num flex items-center justify-between text-[12px] tabular-nums text-muted-foreground">
                  <span>
                    Hiện tại: {isFinite(g.baseMonths) ? `${g.baseMonths} tháng` : "—"}
                  </span>
                  <span className="font-semibold" style={{ color: g.color }}>
                    Mới: {isFinite(g.newMonths) ? `${g.newMonths} tháng` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  max,
  step,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  step: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-foreground">{label}</span>
        <span className="num text-[12px] font-bold tabular-nums" style={{ color }}>
          {formatMoney(value)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-foreground"
        style={{ accentColor: color }}
      />
    </div>
  );
}

function Stat({
  label,
  base,
  next,
  up,
}: {
  label: string;
  base: string;
  next: string;
  up: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="num mt-1 flex items-baseline gap-1.5 text-[15px] font-bold tabular-nums">
        <span className={up ? "text-income" : "text-needs"}>{next}</span>
        <span className="text-[11px] font-medium text-muted-foreground line-through">
          {base}
        </span>
      </div>
    </div>
  );
}
