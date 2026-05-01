import { useRef, useState } from "react";
import { Save, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import { formatMoney } from "@/utils/format";

export function GhiSo() {
  const state = useFinance();
  const actions = useFinanceActions();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const cycleId = `${year}-${String(month).padStart(2, "0")}`;

  const occupied = state.rental.rooms.filter((r) => r.occupied);

  type RowData = { start: string; end: string; water: string };
  const [rows, setRows] = useState<Record<string, RowData>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getRow = (roomId: string): RowData => {
    if (rows[roomId]) return rows[roomId];
    const existing = state.rental.electricityReadings.find(
      (r) => r.roomId === roomId && r.cycleId === cycleId,
    );
    return {
      start: existing ? String(existing.startIndex) : "",
      end: existing ? String(existing.endIndex) : "",
      water: existing?.waterM3 ? String(existing.waterM3) : "",
    };
  };

  const setField = (roomId: string, field: keyof RowData, value: string) => {
    setRows((prev) => ({
      ...prev,
      [roomId]: { ...getRow(roomId), [field]: value },
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, roomId: string, field: keyof RowData) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const fields: (keyof RowData)[] = ["start", "end", "water"];
    const fi = fields.indexOf(field);
    if (fi < fields.length - 1) {
      inputRefs.current[`${roomId}-${fields[fi + 1]}`]?.focus();
    } else {
      const ri = occupied.findIndex((r) => r.id === roomId);
      const next = occupied[ri + 1];
      if (next) inputRefs.current[`${next.id}-start`]?.focus();
    }
  };

  const saveRoom = (roomId: string) => {
    const row = getRow(roomId);
    const s = Number(row.start) || 0;
    const e = Number(row.end) || 0;
    if (e < s && e !== 0) {
      toast.error("Số cuối không được nhỏ hơn số đầu");
      return;
    }
    const w = Number(row.water) || 0;
    actions.upsertElectricityReading(roomId, cycleId, s, e, w);
    toast.success("Đã lưu");
  };

  const saveAll = () => {
    let saved = 0;
    for (const room of occupied) {
      const row = getRow(room.id);
      const s = Number(row.start) || 0;
      const e = Number(row.end) || 0;
      const w = Number(row.water) || 0;
      if (e >= s || e === 0) {
        actions.upsertElectricityReading(room.id, cycleId, s, e, w);
        saved++;
      }
    }
    toast.success(`Đã lưu ${saved} phòng`);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setRows({});
  };

  const monthLabel = `Tháng ${month}/${year}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-32 text-center text-sm font-semibold text-foreground">{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted/40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={saveAll}
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
        >
          <Save className="h-3.5 w-3.5" />
          Lưu tất cả
        </button>
      </div>

      {occupied.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Chưa có phòng nào đang thuê
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phòng</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Điện cũ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Điện mới</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiêu thụ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nước (m³) → tiền</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {occupied.map((room) => {
                const row = getRow(room.id);
                const s = Number(row.start) || 0;
                const e = Number(row.end) || 0;
                const usage = e > s ? e - s : e === 0 ? 0 : 0;
                const warning = e !== 0 && e < s;
                const hasData = row.end !== "";
                const waterM3 = Number(row.water) || 0;
                const waterCost = waterM3 * state.rental.settings.waterRatePerM3;

                return (
                  <tr key={room.id} className={`bg-card transition-colors ${warning ? "bg-amber-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{room.name}</div>
                      {room.tenant && <div className="text-xs text-muted-foreground">{room.tenant}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        ref={(el) => { inputRefs.current[`${room.id}-start`] = el; }}
                        type="number"
                        value={row.start}
                        onChange={(e) => setField(room.id, "start", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, room.id, "start")}
                        placeholder="0"
                        className="num h-8 w-24 rounded-lg border border-border bg-background px-2 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        ref={(el) => { inputRefs.current[`${room.id}-end`] = el; }}
                        type="number"
                        value={row.end}
                        onChange={(e) => setField(room.id, "end", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, room.id, "end")}
                        placeholder="0"
                        className={`num h-8 w-24 rounded-lg border bg-background px-2 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40 ${
                          warning ? "border-amber-400 bg-amber-50" : "border-border"
                        }`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums font-medium ${hasData ? "text-foreground" : "text-muted-foreground/40"}`}>
                        {hasData ? `${usage} kWh` : "—"}
                      </span>
                      {warning && (
                        <div className="flex items-center justify-end gap-1 text-amber-600 text-xs mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          Sai
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        ref={(el) => { inputRefs.current[`${room.id}-water`] = el; }}
                        type="number"
                        value={row.water}
                        onChange={(e) => setField(room.id, "water", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, room.id, "water")}
                        placeholder="0"
                        className="num h-8 w-20 rounded-lg border border-border bg-background px-2 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
                      />
                      {waterM3 > 0 && (
                        <div className="mt-0.5 text-xs text-blue-600 tabular-nums">
                          = {formatMoney(waterCost)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => saveRoom(room.id)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/40"
                      >
                        Lưu
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Nhấn <kbd className="rounded border border-border px-1 font-mono">Enter</kbd> để chuyển ô tiếp theo
      </p>
    </div>
  );
}
