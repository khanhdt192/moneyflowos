import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useFinance } from "@/lib/finance-store";
import { formatVND, formatCompact } from "@/lib/format";

export function BaoCao() {
  const state = useFinance();
  const now = new Date();

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bills = state.rental.roomBills.filter((b) => b.cycleId === key);
      const revenue = bills.reduce((s, b) => s + b.totalAmount, 0);
      const collected = bills.reduce((s, b) => s + b.paidAmount, 0);
      const debt = Math.max(revenue - collected, 0);
      months.push({
        month: `T${d.getMonth() + 1}`,
        revenue,
        collected,
        debt,
      });
    }
    return months;
  }, [state.rental.roomBills]);

  const occupancyData = useMemo(() => {
    const total = state.rental.rooms.length;
    const occupied = state.rental.rooms.filter((r) => r.occupied).length;
    const empty = total - occupied;
    return [
      { name: "Đang thuê", value: occupied, color: "#10b981" },
      { name: "Trống", value: empty, color: "#e5e7eb" },
    ];
  }, [state.rental.rooms]);

  const debtRooms = useMemo(() => {
    const cycleId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const roomMap = Object.fromEntries(state.rental.rooms.map((r) => [r.id, r]));
    return state.rental.roomBills
      .filter((b) => b.cycleId === cycleId && b.paidAmount < b.totalAmount)
      .map((b) => ({
        name: roomMap[b.roomId]?.name ?? b.roomId,
        debt: b.totalAmount - b.paidAmount,
      }))
      .sort((a, b) => b.debt - a.debt);
  }, [state.rental.roomBills, state.rental.rooms]);

  const hasData = monthlyData.some((d) => d.revenue > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Thu nhập hàng tháng" subtitle="Tổng hóa đơn phát sinh 6 tháng gần nhất">
          {!hasData ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}tr` : String(v))}
                />
                <Tooltip
                  formatter={(v: number) => formatVND(v)}
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Bar dataKey="revenue" name="Tổng thu" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Đã thu" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tỷ lệ lấp đầy" subtitle={`${state.rental.rooms.filter((r) => r.occupied).length}/${state.rental.rooms.length} phòng đang thuê`}>
          {state.rental.rooms.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={occupancyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {occupancyData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v} phòng`, ""]}
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Xu hướng nợ" subtitle="Tổng tiền còn nợ theo tháng">
          {!hasData ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}tr` : String(v))}
                />
                <Tooltip
                  formatter={(v: number) => formatVND(v)}
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="debt"
                  name="Còn nợ"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#f43f5e" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Phòng còn nợ tháng này" subtitle="Số tiền chưa thu được">
          {debtRooms.length === 0 ? (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              Tất cả đã thu đủ tiền rồi ✓
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {debtRooms.map((r) => (
                <div key={r.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{r.name}</span>
                  <span className="text-sm font-bold tabular-nums text-rose-600">{formatCompact(r.debt)}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
      Chưa có dữ liệu — hãy chốt kỳ hóa đơn trước
    </div>
  );
}
