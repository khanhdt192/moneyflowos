import { useMemo } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/lib/finance-store";
import { formatMonthLabel } from "@/lib/finance-types";
import { downloadFile, toCsv } from "@/lib/csv";
import { formatVND } from "@/lib/format";

export function ReportsPanel() {
  const state = useFinance();

  const monthBreakdown = useMemo(() => {
    return Object.keys(state.months)
      .sort()
      .reverse()
      .map((k) => {
        const m = state.months[k];
        const income = m.income.reduce((s, i) => s + i.amount, 0);
        const needs = m.needs.reduce((s, i) => s + i.amount, 0);
        const wants = m.wants.reduce((s, i) => s + i.amount, 0);
        const savings = m.savings.reduce((s, i) => s + i.amount, 0);
        const net = income - needs - wants - savings;
        const rate = income > 0 ? (savings / income) * 100 : 0;
        return { key: k, income, needs, wants, savings, net, rate, txCount: m.transactions.length };
      });
  }, [state.months]);

  const exportTransactionsCsv = () => {
    const rows: Array<Record<string, string | number>> = [];
    for (const k of Object.keys(state.months).sort().reverse()) {
      for (const t of state.months[k].transactions) {
        rows.push({
          Tháng: k,
          Ngày: t.date,
          Loại: t.type,
          "Hạng mục": t.category,
          "Số tiền": t.amount,
          "Ghi chú": t.note ?? "",
        });
      }
    }
    if (rows.length === 0) {
      toast.info("Chưa có giao dịch để xuất");
      return;
    }
    downloadFile(`moneyflow-transactions-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    toast.success(`Đã xuất ${rows.length} giao dịch`);
  };

  const exportBudgetCsv = () => {
    const rows: Array<Record<string, string | number>> = [];
    for (const k of Object.keys(state.months).sort()) {
      const m = state.months[k];
      for (const cat of ["income", "needs", "wants", "savings"] as const) {
        for (const i of m[cat]) {
          rows.push({ Tháng: k, "Phân loại": cat, Tên: i.name, "Số tiền": i.amount });
        }
      }
    }
    if (rows.length === 0) {
      toast.info("Chưa có ngân sách để xuất");
      return;
    }
    downloadFile(`moneyflow-budget-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    toast.success("Đã xuất ngân sách CSV");
  };

  const printReport = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          title="Xuất giao dịch"
          desc="CSV cho Excel / Google Sheet"
          icon={Download}
          color="var(--income)"
          onClick={exportTransactionsCsv}
        />
        <ActionCard
          title="Xuất ngân sách"
          desc="Toàn bộ ngân sách theo tháng"
          icon={FileText}
          color="var(--savings)"
          onClick={exportBudgetCsv}
        />
        <ActionCard
          title="In báo cáo"
          desc="Báo cáo PDF qua trình duyệt"
          icon={Printer}
          color="var(--investments)"
          onClick={printReport}
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-base font-bold tracking-tight text-foreground">
            Báo cáo theo tháng
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Tổng hợp dòng tiền và tỷ lệ tiết kiệm trên từng tháng đã ghi nhận
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Tháng</th>
                <th className="px-5 py-3 text-right font-semibold">Thu</th>
                <th className="px-5 py-3 text-right font-semibold">Thiết yếu</th>
                <th className="px-5 py-3 text-right font-semibold">Cá nhân</th>
                <th className="px-5 py-3 text-right font-semibold">Tiết kiệm</th>
                <th className="px-5 py-3 text-right font-semibold">Còn</th>
                <th className="px-5 py-3 text-right font-semibold">Tỷ lệ</th>
                <th className="px-5 py-3 text-right font-semibold">GD</th>
              </tr>
            </thead>
            <tbody>
              {monthBreakdown.map((r) => (
                <tr key={r.key} className="border-b border-border last:border-0 hover:bg-foreground/[0.02]">
                  <td className="px-5 py-3 font-semibold text-foreground">
                    {formatMonthLabel(r.key)}
                  </td>
                  <td className="num px-5 py-3 text-right tabular-nums text-income">
                    {formatVND(r.income)}
                  </td>
                  <td className="num px-5 py-3 text-right tabular-nums text-needs">
                    {formatVND(r.needs)}
                  </td>
                  <td className="num px-5 py-3 text-right tabular-nums text-wants">
                    {formatVND(r.wants)}
                  </td>
                  <td className="num px-5 py-3 text-right tabular-nums text-savings">
                    {formatVND(r.savings)}
                  </td>
                  <td
                    className="num px-5 py-3 text-right tabular-nums"
                    style={{ color: r.net >= 0 ? "var(--income)" : "var(--needs)" }}
                  >
                    {formatVND(r.net)}
                  </td>
                  <td className="num px-5 py-3 text-right font-semibold tabular-nums text-foreground">
                    {r.rate.toFixed(1)}%
                  </td>
                  <td className="num px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {r.txCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  desc,
  icon: Icon,
  color,
  onClick,
}: {
  title: string;
  desc: string;
  icon: typeof Download;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div
        className="grid h-10 w-10 place-items-center rounded-xl"
        style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
      </div>
      <div className="mt-3 text-base font-bold tracking-tight text-foreground">{title}</div>
      <div className="mt-0.5 text-[12px] text-muted-foreground">{desc}</div>
    </button>
  );
}
