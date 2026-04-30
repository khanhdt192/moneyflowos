import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Zap,
  CheckCircle,
  AlertTriangle,
  X,
  DollarSign,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { RentalRoom, RentalRoomBill } from "@/lib/finance-types";
import { formatVND } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/* ────────────────── types & helpers ────────────────── */

type BillStatus = "empty" | "no_reading" | "ready" | "unpaid" | "partial" | "paid" | "overdue";

function getStatus(
  room: RentalRoom,
  hasReading: boolean,
  bill: RentalRoomBill | undefined,
  cycleId: string,
): BillStatus {
  if (!room.occupied) return "empty";
  if (!bill) return hasReading ? "ready" : "no_reading";
  if (bill.paidAmount >= bill.totalAmount) return "paid";
  if (bill.paidAmount > 0) return "partial";
  const [y, m] = cycleId.split("-").map(Number);
  const now = new Date();
  if (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1))
    return "overdue";
  return "unpaid";
}

const STATUS_CFG: Record<BillStatus, { label: string; cls: string }> = {
  empty:      { label: "Trống",          cls: "bg-slate-100 text-slate-500 border-slate-200" },
  no_reading: { label: "Chưa nhập số",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ready:      { label: "Sẵn sàng chốt",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  unpaid:     { label: "Chưa thu",        cls: "bg-slate-100 text-slate-500 border-slate-200" },
  partial:    { label: "Thu một phần",    cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  paid:       { label: "Đã thu",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:    { label: "Quá hạn",         cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

function isT1(room: RentalRoom) {
  return room.floor === 1 || /t[aâ]ng\s*1/i.test(room.name);
}

/* ────────────────── component ────────────────── */

type RowData = { start: string; end: string; water: string };

export function ChotThang() {
  const state = useFinance();
  const actions = useFinanceActions();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const cycleId = `${year}-${String(month).padStart(2, "0")}`;
  const settings = state.rental.settings;

  /* inline row editing */
  const [rows, setRows] = useState<Record<string, RowData>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /* detail panel */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payInput, setPayInput] = useState("");

  /* derived */
  const roomMap = Object.fromEntries(state.rental.rooms.map((r) => [r.id, r]));
  const billMap = Object.fromEntries(
    state.rental.roomBills.filter((b) => b.cycleId === cycleId).map((b) => [b.roomId, b]),
  );
  const readingMap = Object.fromEntries(
    state.rental.electricityReadings
      .filter((r) => r.cycleId === cycleId)
      .map((r) => [r.roomId, r]),
  );
  const occupied = state.rental.rooms.filter((r) => r.occupied);
  const bills = Object.values(billMap);
  const totalRevenue = bills.reduce((s, b) => s + b.totalAmount, 0);
  const totalCollected = bills.reduce((s, b) => s + b.paidAmount, 0);
  const totalDebt = Math.max(totalRevenue - totalCollected, 0);

  /* steps */
  const hasAnyReading = occupied.some((r) => readingMap[r.id]);
  const hasBills = bills.length > 0;
  const allPaid = hasBills && bills.every((b) => b.paidAmount >= b.totalAmount);
  const currentStep = allPaid ? 4 : hasBills ? 3 : hasAnyReading ? 2 : 1;

  const getRow = (roomId: string): RowData => {
    if (rows[roomId]) return rows[roomId];
    const r = readingMap[roomId];
    return {
      start: r ? String(r.startIndex) : "",
      end: r ? String(r.endIndex) : "",
      water: r?.waterM3 ? String(r.waterM3) : "",
    };
  };

  const setField = (roomId: string, field: keyof RowData, value: string) =>
    setRows((prev) => ({ ...prev, [roomId]: { ...getRow(roomId), [field]: value } }));

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    roomId: string,
    field: keyof RowData,
  ) => {
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

  const saveAllReadings = () => {
    let saved = 0;
    for (const room of occupied) {
      const row = getRow(room.id);
      const s = Number(row.start) || 0;
      const e = Number(row.end) || 0;
      const w = Number(row.water) || 0;
      if (!isT1(room) && e < s && e !== 0) continue;
      actions.upsertElectricityReading(room.id, cycleId, s, e, w);
      saved++;
    }
    toast.success(`Đã lưu số liệu ${saved} phòng`);
  };

  const handleChot = () => {
    actions.generateBillingCycle(month, year);
    toast.success(`Đã chốt hóa đơn tháng ${month}/${year}`);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setRows({});
    setSelectedId(null);
  };

  /* preview bill amount for a room (before chốt) */
  const previewAmount = (room: RentalRoom): number => {
    const row = getRow(room.id);
    const reading = readingMap[room.id];
    const t1 = isT1(room);
    const kwh = reading
      ? reading.consumptionKwh
      : Math.max((Number(row.end) || 0) - (Number(row.start) || 0), 0);
    const elec = t1
      ? settings.t1ElectricityBill
      : kwh * (room.electricityRateOverride ?? settings.defaultElectricityRate);
    const waterM3 = reading?.waterM3 ?? Number(row.water) ?? 0;
    const water = waterM3 * settings.waterRatePerM3;
    const wifi = t1 ? (settings.t1HasWifi ? settings.t1WifiPerRoom : 0) : settings.wifiPerRoom;
    const cleaning = t1 ? settings.t1Cleaning : settings.cleaningPerRoom;
    const other = t1 ? settings.t1OtherPerRoom : settings.otherPerRoom;
    return room.rent + elec + water + wifi + cleaning + other;
  };

  /* detail panel */
  const selectedRoom = selectedId ? roomMap[selectedId] : null;
  const selectedBill = selectedId ? billMap[selectedId] : undefined;

  const handlePayFull = () => {
    if (!selectedBill) return;
    actions.markRoomBillPaid(selectedBill.id, selectedBill.totalAmount);
    toast.success(`${selectedRoom?.name}: đã thu đủ`);
    setSelectedId(null);
  };

  const handlePayPartial = () => {
    if (!selectedBill) return;
    const amt = Number(payInput) || 0;
    if (amt <= 0) { toast.error("Nhập số tiền hợp lệ"); return; }
    actions.markRoomBillPaid(selectedBill.id, Math.min(amt, selectedBill.totalAmount));
    toast.success(`Đã ghi nhận ${formatVND(amt)}`);
    setPayInput("");
    setSelectedId(null);
  };

  const bankNote = (roomName: string) =>
    settings.bankNoteTemplate
      .replace("{room}", roomName)
      .replace("{month}", String(month).padStart(2, "0"))
      .replace("{year}", String(year));

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted/40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-bold text-foreground">
            Tháng {month}/{year}
          </span>
          <button type="button" onClick={() => shiftMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted/40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={saveAllReadings}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/40">
            <Save className="h-3.5 w-3.5" />
            Lưu số liệu
          </button>
          <button type="button" onClick={handleChot}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background">
            <Zap className="h-3.5 w-3.5" />
            Chốt hóa đơn
          </button>
        </div>
      </div>

      {/* ── Step progress ── */}
      <StepBar currentStep={currentStep} />

      {/* ── KPI Summary ── */}
      {hasBills && (
        <div className="grid grid-cols-3 gap-3">
          <MiniKpi label="Tổng phải thu" value={formatVND(totalRevenue)} />
          <MiniKpi label="Đã thu" value={formatVND(totalCollected)} color="emerald" />
          <MiniKpi label="Còn nợ" value={formatVND(totalDebt)} color="rose" />
        </div>
      )}

      {/* ── Main table ── */}
      {state.rental.rooms.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Chưa có phòng nào — thêm phòng trong tab Phòng
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <Th left>Phòng</Th>
                  <Th>Điện cũ</Th>
                  <Th>Điện mới</Th>
                  <Th>kWh</Th>
                  <Th>Nước m³</Th>
                  <Th>Tổng bill</Th>
                  <Th center>Trạng thái</Th>
                  <Th center>Thao tác</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.rental.rooms.map((room) => {
                  const row = getRow(room.id);
                  const reading = readingMap[room.id];
                  const bill = billMap[room.id];
                  const status = getStatus(room, !!reading, bill, cycleId);
                  const cfg = STATUS_CFG[status];
                  const t1 = isT1(room);
                  const s = Number(row.start) || 0;
                  const e = Number(row.end) || 0;
                  const usage = reading ? reading.consumptionKwh : Math.max(e - s, 0);
                  const warnElec = !t1 && e !== 0 && e < s;
                  const displayTotal = bill
                    ? bill.totalAmount
                    : room.occupied ? previewAmount(room) : 0;

                  return (
                    <tr key={room.id}
                      onClick={() => { if (room.occupied) { setSelectedId(room.id); setPayInput(""); } }}
                      className={`bg-card transition-colors ${room.occupied ? "cursor-pointer hover:bg-muted/20" : "opacity-60"}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{room.name}</div>
                        {room.tenant && <div className="text-xs text-muted-foreground">{room.tenant}</div>}
                        {t1 && <div className="text-[10px] text-blue-500 font-medium">Tầng 1</div>}
                      </td>

                      {/* Electricity start */}
                      <td className="px-3 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                        {t1 ? (
                          <span className="text-xs text-muted-foreground/50 italic">HDơn CĐ</span>
                        ) : (
                          <input ref={(el) => { inputRefs.current[`${room.id}-start`] = el; }}
                            type="number" value={row.start}
                            onChange={(ev) => setField(room.id, "start", ev.target.value)}
                            onKeyDown={(ev) => handleKeyDown(ev, room.id, "start")}
                            disabled={!room.occupied}
                            placeholder="0"
                            className="num h-8 w-20 rounded-lg border border-border bg-background px-2 text-right text-xs outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-40" />
                        )}
                      </td>

                      {/* Electricity end */}
                      <td className="px-3 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                        {t1 ? (
                          <span className="text-xs text-muted-foreground/50 italic">—</span>
                        ) : (
                          <input ref={(el) => { inputRefs.current[`${room.id}-end`] = el; }}
                            type="number" value={row.end}
                            onChange={(ev) => setField(room.id, "end", ev.target.value)}
                            onKeyDown={(ev) => handleKeyDown(ev, room.id, "end")}
                            disabled={!room.occupied}
                            placeholder="0"
                            className={`num h-8 w-20 rounded-lg border bg-background px-2 text-right text-xs outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-40 ${warnElec ? "border-amber-400 bg-amber-50" : "border-border"}`} />
                        )}
                      </td>

                      {/* kWh */}
                      <td className="px-3 py-3 text-right tabular-nums text-xs">
                        {t1 ? (
                          <span className="text-muted-foreground/50">—</span>
                        ) : warnElec ? (
                          <span className="text-amber-600 flex items-center gap-0.5 justify-end">
                            <AlertTriangle className="h-3 w-3" />Sai
                          </span>
                        ) : usage > 0 ? (
                          <span className="font-medium">{usage} kWh</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>

                      {/* Water m³ */}
                      <td className="px-3 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                        <input ref={(el) => { inputRefs.current[`${room.id}-water`] = el; }}
                          type="number" value={row.water}
                          onChange={(ev) => setField(room.id, "water", ev.target.value)}
                          onKeyDown={(ev) => handleKeyDown(ev, room.id, "water")}
                          disabled={!room.occupied}
                          placeholder="0"
                          className="num h-8 w-16 rounded-lg border border-border bg-background px-2 text-right text-xs outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-40" />
                      </td>

                      {/* Total bill */}
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {room.occupied && displayTotal > 0
                          ? <span className={bill ? "" : "text-muted-foreground"}>{formatVND(displayTotal)}</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                        {room.occupied && bill && bill.paidAmount < bill.totalAmount && (
                          <button type="button"
                            onClick={() => { actions.markRoomBillPaid(bill.id, bill.totalAmount); toast.success(`${room.name}: đã thu đủ`); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle className="h-3 w-3" />
                            Thu đủ
                          </button>
                        )}
                        {room.occupied && !bill && (
                          <button type="button"
                            onClick={(ev) => { ev.stopPropagation(); setSelectedId(room.id); setPayInput(""); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40">
                            <FileText className="h-3 w-3" />
                            Chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Bấm vào hàng để xem chi tiết hóa đơn và thu tiền. Nhấn{" "}
        <kbd className="rounded border border-border px-1 font-mono">Enter</kbd> để chuyển ô tiếp theo.
      </p>

      {/* ── Detail panel ── */}
      <Sheet open={!!selectedRoom} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full max-w-sm overflow-y-auto">
          {selectedRoom && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{selectedRoom.name}</SheetTitle>
                {selectedRoom.tenant && (
                  <p className="text-xs text-muted-foreground">{selectedRoom.tenant}</p>
                )}
              </SheetHeader>

              {selectedBill ? (
                <BillDetail
                  bill={selectedBill}
                  room={selectedRoom}
                  cycleId={cycleId}
                  payInput={payInput}
                  setPayInput={setPayInput}
                  onPayFull={handlePayFull}
                  onPayPartial={handlePayPartial}
                  bankName={settings.bankName}
                  bankAccount={settings.bankAccount}
                  bankHolder={settings.bankHolder}
                  bankQrUrl={settings.bankQrUrl}
                  bankNote={bankNote(selectedRoom.name)}
                />
              ) : (
                <div className="space-y-4">
                  <PreviewDetail room={selectedRoom} settings={settings} row={getRow(selectedRoom.id)} reading={readingMap[selectedRoom.id]} />
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                    Hóa đơn sẽ được tạo khi bấm <strong>Chốt hóa đơn</strong> ở trên.
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ────────────────── sub-components ────────────────── */

function StepBar({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: "Nhập số" },
    { n: 2, label: "Preview" },
    { n: 3, label: "Chốt bill" },
    { n: 4, label: "Thu tiền" },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = currentStep > s.n;
        const active = currentStep === s.n;
        return (
          <div key={s.n} className="flex items-center">
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${done ? "text-emerald-700" : active ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-emerald-500 text-white" : active ? "bg-background text-foreground" : "bg-muted text-muted-foreground"}`}>
                {done ? "✓" : s.n}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && <span className="mx-1 text-muted-foreground/30">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: string; color?: "emerald" | "rose" }) {
  const cls = color === "emerald"
    ? "border-emerald-200 bg-emerald-50"
    : color === "rose"
    ? "border-rose-200 bg-rose-50"
    : "border-border bg-card";
  const vCls = color === "emerald" ? "text-emerald-700" : color === "rose" ? "text-rose-700" : "text-foreground";
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${cls}`}>
      <div className={`text-xs ${color ? (color === "emerald" ? "text-emerald-600" : "text-rose-600") : "text-muted-foreground"}`}>{label}</div>
      <div className={`mt-1 text-base font-bold tabular-nums ${vCls}`}>{value}</div>
    </div>
  );
}

function Th({ children, left, center }: { children?: React.ReactNode; left?: boolean; center?: boolean }) {
  return (
    <th className={`px-3 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${left ? "text-left" : center ? "text-center" : "text-right"}`}>
      {children}
    </th>
  );
}

function BillRow({ label, value, bold, red }: { label: string; value: string; bold?: boolean; red?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? "font-semibold" : ""} ${red ? "text-rose-600" : ""}`}>
      <span className={bold ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function BillDetail({
  bill, room, cycleId, payInput, setPayInput, onPayFull, onPayPartial,
  bankName, bankAccount, bankHolder, bankQrUrl, bankNote,
}: {
  bill: RentalRoomBill;
  room: RentalRoom;
  cycleId: string;
  payInput: string;
  setPayInput: (v: string) => void;
  onPayFull: () => void;
  onPayPartial: () => void;
  bankName: string; bankAccount: string; bankHolder: string; bankQrUrl: string; bankNote: string;
}) {
  const remaining = Math.max(bill.totalAmount - bill.paidAmount, 0);
  const [m, y] = cycleId.split("-");

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Hóa đơn tháng {Number(m)}/{y}
        </div>
        <BillRow label="Tiền thuê" value={formatVND(bill.rentAmount)} />
        <BillRow label="Tiền điện" value={formatVND(bill.electricityAmount)} />
        <BillRow label="Tiền nước" value={formatVND(bill.waterAmount)} />
        {bill.wifiAmount > 0 && <BillRow label="Wifi" value={formatVND(bill.wifiAmount)} />}
        {bill.cleaningAmount > 0 && <BillRow label="Vệ sinh / Rác" value={formatVND(bill.cleaningAmount)} />}
        {bill.otherAmount > 0 && <BillRow label="Phụ phí khác" value={formatVND(bill.otherAmount)} />}
        <div className="border-t border-border pt-2 mt-1">
          <BillRow label="Tổng cộng" value={formatVND(bill.totalAmount)} bold />
        </div>
        <BillRow label="Đã thu" value={formatVND(bill.paidAmount)} />
        {remaining > 0 && <BillRow label="Còn thiếu" value={formatVND(remaining)} bold red />}
      </div>

      {remaining > 0 && (
        <div className="space-y-2">
          <button type="button" onClick={onPayFull}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <CheckCircle className="inline h-4 w-4 mr-1.5" />
            Thu đủ {formatVND(remaining)}
          </button>
          <div className="flex gap-2">
            <input type="number" value={payInput} onChange={(e) => setPayInput(e.target.value)}
              placeholder="Nhập số tiền một phần..."
              className="num h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            <button type="button" onClick={onPayPartial}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/40">
              <DollarSign className="h-3.5 w-3.5" />
              Ghi
            </button>
          </div>
        </div>
      )}

      {(bankAccount || bankQrUrl) && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Thông tin chuyển khoản
          </div>
          {bankName && <InfoRow label="Ngân hàng" value={bankName} />}
          {bankAccount && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Số TK</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{bankAccount}</span>
                <button type="button"
                  onClick={() => { navigator.clipboard.writeText(bankAccount); toast.success("Đã copy STK"); }}
                  className="rounded px-1.5 py-0.5 text-[10px] border border-border hover:bg-muted/40">Copy</button>
              </div>
            </div>
          )}
          {bankHolder && <InfoRow label="Chủ TK" value={bankHolder} />}
          {bankNote && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nội dung CK</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-right text-xs">{bankNote}</span>
                <button type="button"
                  onClick={() => { navigator.clipboard.writeText(bankNote); toast.success("Đã copy"); }}
                  className="rounded px-1.5 py-0.5 text-[10px] border border-border hover:bg-muted/40">Copy</button>
              </div>
            </div>
          )}
          {bankQrUrl && (
            <img src={bankQrUrl} alt="QR" className="mx-auto mt-2 h-36 w-36 rounded-lg object-contain border border-border" />
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function PreviewDetail({
  room, settings, row, reading,
}: {
  room: RentalRoom;
  settings: ReturnType<typeof useFinance>["rental"]["settings"];
  row: { start: string; end: string; water: string };
  reading: ReturnType<typeof useFinance>["rental"]["electricityReadings"][0] | undefined;
}) {
  const t1 = isT1(room);
  const kwh = reading
    ? reading.consumptionKwh
    : Math.max((Number(row.end) || 0) - (Number(row.start) || 0), 0);
  const elec = t1
    ? settings.t1ElectricityBill
    : kwh * (room.electricityRateOverride ?? settings.defaultElectricityRate);
  const waterM3 = reading?.waterM3 ?? Number(row.water) ?? 0;
  const water = waterM3 * settings.waterRatePerM3;
  const wifi = t1 ? (settings.t1HasWifi ? settings.t1WifiPerRoom : 0) : settings.wifiPerRoom;
  const cleaning = t1 ? settings.t1Cleaning : settings.cleaningPerRoom;
  const other = t1 ? settings.t1OtherPerRoom : settings.otherPerRoom;
  const total = room.rent + elec + water + wifi + cleaning + other;
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Dự tính (chưa chốt)
      </div>
      <BillRow label="Tiền thuê" value={formatVND(room.rent)} />
      <BillRow label="Tiền điện" value={formatVND(elec)} />
      <BillRow label="Tiền nước" value={formatVND(water)} />
      {wifi > 0 && <BillRow label="Wifi" value={formatVND(wifi)} />}
      {cleaning > 0 && <BillRow label="Vệ sinh" value={formatVND(cleaning)} />}
      {other > 0 && <BillRow label="Phụ phí" value={formatVND(other)} />}
      <div className="border-t border-border pt-2">
        <BillRow label="Dự tính tổng" value={formatVND(total)} bold />
      </div>
    </div>
  );
}
