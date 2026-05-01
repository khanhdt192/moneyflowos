import { useMemo } from "react";
import { Home, TrendingUp, CheckCircle2, AlertCircle, DoorOpen, Zap, FileText, ArrowRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useFinance } from "@/lib/finance-store";
import { formatCompact } from "@/lib/format"
import { formatMoney } from "@/utils/format";

type Tab = "tongquan" | "phong" | "chotthang" | "baocao" | "caidat";

export function TongQuan({ onNavigate }: { onNavigate?: (tab: Tab) => void }) {
  const state = useFinance();
  const now = new Date();
  const currentCycleId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const rooms = state.rental.rooms;
  const occupied = rooms.filter((r) => r.occupied);
  const empty = rooms.filter((r) => !r.occupied);

  const currentBills = state.rental.roomBills.filter((b) => b.cycleId === currentCycleId);
  const totalRevenue = currentBills.reduce((s, b) => s + b.totalAmount, 0);
  const totalCollected = currentBills.reduce((s, b) => s + b.paidAmount, 0);
  const totalDebt = Math.max(totalRevenue - totalCollected, 0);

  const roomsWithReadings = new Set(
    state.rental.electricityReadings
      .filter((r) => r.cycleId === currentCycleId)
      .map((r) => r.roomId),
  );
  const missingElectricity = occupied.filter((r) => !roomsWithReadings.has(r.id));
  const unpaidBills = currentBills.filter((b) => b.paidAmount < b.totalAmount);

  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));

  const trendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bills = state.rental.roomBills.filter((b) => b.cycleId === key);
      const revenue = bills.reduce((s, b) => s + b.totalAmount, 0);
      const collected = bills.reduce((s, b) => s + b.paidAmount, 0);
      months.push({ month: `T${d.getMonth() + 1}`, revenue, collected });
    }
    return months;
  }, [state.rental.roomBills]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<Home className="h-4 w-4" />}
          label="Tỷ lệ lấp đầy"
          value={`${occupied.length}/${rooms.length}`}
          sub={`${rooms.length > 0 ? Math.round((occupied.length / rooms.length) * 100) : 0}% công suất`}
          color="blue"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Thu tháng này"
          value={formatCompact(totalRevenue)}
          sub="tổng hóa đơn phát sinh"
          color="indigo"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Đã thu"
          value={formatCompact(totalCollected)}
          sub={`${currentBills.length - unpaidBills.length}/${currentBills.length} phòng`}
          color="emerald"
        />
        <KpiCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Còn nợ"
          value={formatCompact(totalDebt)}
          sub={`${unpaidBills.length} hóa đơn chưa thu`}
          color="amber"
        />
        <KpiCard
          icon={<DoorOpen className="h-4 w-4" />}
          label="Phòng trống"
          value={String(empty.length)}
          sub="đang không có khách"
          color="slate"
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <QuickAction label="Nhập số tháng này" icon={<Zap className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("chotthang")} accent />
        <QuickAction label="Thu tiền nhanh" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("chotthang")} />
        <QuickAction label="Chốt hóa đơn" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("chotthang")} />
        <QuickAction label="Xem báo cáo" icon={<TrendingUp className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("baocao")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          <ActionWidget
            icon={<Zap className="h-4 w-4 text-amber-500" />}
            title="Chưa nhập điện nước"
            count={missingElectricity.length}
            items={missingElectricity.map((r) => r.name)}
            emptyText="Tất cả phòng đã nhập số điện"
            colorScheme="amber"
          />
          <ActionWidget
            icon={<FileText className="h-4 w-4 text-rose-500" />}
            title="Hóa đơn chưa thu"
            count={unpaidBills.length}
            items={unpaidBills.map((b) => roomMap[b.roomId]?.name ?? b.roomId)}
            emptyText="Tất cả đã thu tiền rồi"
            colorScheme="rose"
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Thu nhập 6 tháng gần nhất</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Tổng hóa đơn vs. Đã thu thực tế</p>
          </div>
          {trendData.every((d) => d.revenue === 0) ? (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              Chưa có dữ liệu hóa đơn — hãy nhập số và chốt kỳ trong tab Chốt tháng
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gr-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gr-col" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}tr` : String(v))}
                  width={40}
                />
                <Tooltip
                  formatter={(v: number) => formatMoney(v)}
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Tổng thu"
                  stroke="#6366f1"
                  fill="url(#gr-rev)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Đã thu"
                  stroke="#10b981"
                  fill="url(#gr-col)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: "blue" | "indigo" | "emerald" | "amber" | "slate";
}) {
  const styles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-500",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${styles[color]}`}>
        {icon}
      </div>
      <div className="mt-3 text-xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function QuickAction({
  label,
  icon,
  onClick,
  accent,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        accent
          ? "bg-foreground text-background hover:opacity-90"
          : "border border-border bg-card text-foreground hover:bg-muted/40"
      }`}
    >
      {icon}
      {label}
      <ArrowRight className="h-3.5 w-3.5 opacity-60" />
    </button>
  );
}

function ActionWidget({
  icon,
  title,
  count,
  items,
  emptyText,
  colorScheme,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  items: string[];
  emptyText: string;
  colorScheme: "amber" | "rose";
}) {
  if (count === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{emptyText} ✓</p>
      </div>
    );
  }

  const border = colorScheme === "amber" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50";
  const badge =
    colorScheme === "amber"
      ? "bg-white border-amber-100 text-amber-800"
      : "bg-white border-rose-100 text-rose-800";

  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">{count}</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {items.slice(0, 6).map((name) => (
          <span key={name} className={`rounded-md border px-2 py-0.5 text-xs font-medium ${badge}`}>
            {name}
          </span>
        ))}
        {items.length > 6 && (
          <span className="text-xs text-muted-foreground self-center">+{items.length - 6} nữa</span>
        )}
      </div>
    </div>
  );
}
