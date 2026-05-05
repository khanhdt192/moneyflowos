import { Fragment, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { RentalRoom, RentalRoomBill, RentalSettings } from "@/lib/finance-types";
import { formatMoney } from "@/utils/format";
import { formatMoneyInput, parseMoneyInput, sanitizeDigitsInput } from "@/utils/number-input";
import { exportSingleInvoice } from "@/lib/rental-pdf";
import { useRentalRooms, type RentalRoomUiModel } from "@/hooks/use-rental-rooms";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ─── types ───────────────────────────────────────────────── */

type BillStatus =
  | "empty"
  | "no_reading"
  | "has_reading"
  | "draft"
  | "confirmed"
  | "partial_paid"
  | "paid"
  | "overdue"
  | "cancelled";

type SaveState = "idle" | "saving" | "saved" | "error";

const STATUS_CFG: Record<BillStatus, { label: string; cls: string }> = {
  empty:        { label: "Trống",        cls: "bg-slate-100 text-slate-500 border-slate-200" },
  no_reading:   { label: "Chưa nhập số", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  has_reading:  { label: "Đã nhập số",   cls: "bg-sky-50 text-sky-700 border-sky-200" },
  draft:        { label: "Nháp",         cls: "bg-blue-50 text-blue-700 border-blue-200" },
  confirmed:    { label: "Đã chốt",      cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  partial_paid: { label: "Thu một phần", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  paid:         { label: "Đã thu",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:      { label: "Quá hạn",      cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled:    { label: "Đã huỷ",       cls: "bg-slate-100 text-slate-400 border-slate-200" },
};

function isT1(room: RentalRoom) {
  return room.floor === 1 || /t[aâ]ng\s*1/i.test(room.name);
}

type RowData = { start: string; end: string; water: string };

function isRoomOccupied(room: RentalRoom): boolean {
  return !!(room.tenantInfo?.id || room.tenant_id || room.occupied);
}

function canEditBillingInputs(occupied: boolean, billStatus: string | null | undefined): boolean {
  if (!occupied) return false;
  return !billStatus || billStatus === "draft";
}

function getDisplayStatus(
  room: RentalRoom,
  apiBillStatus: string | null,
  hasReading: boolean,
  cycleId: string,
): BillStatus {
  if (!isRoomOccupied(room)) return "empty";
  if (!apiBillStatus) return hasReading ? "has_reading" : "no_reading";
  if (apiBillStatus === "paid") return "paid";
  if (apiBillStatus === "partial_paid") return "partial_paid";
  if (apiBillStatus === "confirmed") {
    const [y, m] = cycleId.split("-").map(Number);
    const now = new Date();
    if (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1))
      return "overdue";
    return "confirmed";
  }
  if (apiBillStatus === "cancelled") return "cancelled";
  return "draft";
}



function isDigitsOnly(value: string): boolean {
  return /^\d*$/.test(value);
}

function parseNonNegativeInteger(value: string): number | null {
  if (!isDigitsOnly(value)) return null;
  if (value === "") return 0;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

const INVALID_NUMERIC_KEYS = new Set(["+", "-", "e", "E"]);

function preventInvalidNumberKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
  if (INVALID_NUMERIC_KEYS.has(event.key)) {
    event.preventDefault();
  }
}

function preventInvalidNumberPaste(event: React.ClipboardEvent<HTMLInputElement>) {
  const pasted = event.clipboardData.getData("text");
  if (!isDigitsOnly(pasted)) {
    event.preventDefault();
  }
}


function calcLiveTotal(room: RentalRoom, settings: RentalSettings, row: RowData): number {
  const ground = isT1(room);
  const kwh = Math.max((parseFloat(row.end) || 0) - (parseFloat(row.start) || 0), 0);
  const water = parseFloat(row.water) || 0;
  const elec = ground ? settings.t1ElectricityBill : kwh * settings.defaultElectricityRate;
  const waterAmt = water * settings.waterRatePerM3;
  const wifi = ground ? (settings.t1HasWifi ? settings.t1WifiPerRoom : 0) : settings.wifiPerRoom;
  const cleaning = ground ? settings.t1Cleaning : settings.cleaningPerRoom;
  const other = ground ? settings.t1OtherPerRoom : settings.otherPerRoom;
  return room.rent + elec + waterAmt + wifi + cleaning + other;
}

/* ─── component ───────────────────────────────────────────── */

export function ChotThang({
  focusRequest,
  onFocusRequestConsumed,
}: {
  focusRequest?: { roomId: string; cycleId: string; nonce: number } | null;
  onFocusRequestConsumed?: () => void;
}) {
  const state   = useFinance();
  const actions = useFinanceActions();
  const now     = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const cycleId  = `${year}-${String(month).padStart(2, "0")}`;
  const settings = state.rental.settings;

  /* ── Supabase view: single source of truth for bill status ── */
  const {
    rooms: apiRooms,
    loading: apiLoading,
    refetch: apiRefetch,
  } = useRentalRooms(cycleId);

  const apiBillMap = Object.fromEntries(
    apiRooms.map((r) => [r.room_id, r]),
  ) as Record<string, RentalRoomUiModel>;

  /* local editing rows (controlled inputs) */
  const [rows, setRows]             = useState<Record<string, RowData>>({});
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const debounceTimers              = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [highlightedRoomId, setHighlightedRoomId] = useState<string | null>(null);

  /* payment form — single shared state; cleared when a new row expands */
  const [payInput, setPayInput]   = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [meterEditingRoomId, setMeterEditingRoomId] = useState<string | null>(null);

  /* clear local rows and collapse expansion when month changes */
  useEffect(() => {
    setRows({});
    setSaveStates({});
    setSelectedRoomId(null);
    setHighlightedRoomId(null);
  }, [month, year]);

  useEffect(() => {
    if (!focusRequest) return;
    const [yStr, mStr] = focusRequest.cycleId.split("-");
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      setYear(y);
      setMonth(m);
    }
    setHighlightedRoomId(focusRequest.roomId);
    setSelectedRoomId(focusRequest.roomId);
    onFocusRequestConsumed?.();
  }, [focusRequest?.nonce, onFocusRequestConsumed]);

  /* ─── local store maps ──────────────────────────────────── */
  const roomMap = Object.fromEntries(state.rental.rooms.map((r) => [r.id, r]));

  const storeBillMap = Object.fromEntries(
    state.rental.roomBills.filter((b) => b.cycleId === cycleId).map((b) => [b.roomId, b]),
  );

  const readingMap = Object.fromEntries(
    state.rental.electricityReadings
      .filter((r) => r.cycleId === cycleId)
      .map((r) => [r.roomId, r]),
  );

  const allRooms      = state.rental.rooms;
  const occupiedRooms = allRooms.filter((r) => isRoomOccupied(r));

  /* KPI from API data */
  const allApiBills    = Object.values(apiBillMap).filter((r) => r.bill_id);
  const confirmedCount = allApiBills.filter((r) =>
    r.bill_status && ["confirmed", "partial_paid", "paid"].includes(r.bill_status)).length;
  const paidCount      = allApiBills.filter((r) => r.bill_status === "paid").length;
  const totalBilled    = allApiBills.reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const totalPaid      = allApiBills.reduce((s, r) => s + (storeBillMap[r.room_id]?.paidAmount ?? 0), 0);

  /* ─── row helpers ───────────────────────────────────────── */

  function getRow(roomId: string): RowData {
    if (rows[roomId]) return rows[roomId];
    const r = readingMap[roomId];
    return {
      start: r?.startIndex != null ? String(r.startIndex) : "",
      end:   r?.endIndex   != null ? String(r.endIndex)   : "",
      water: r?.waterM3    != null ? String(r.waterM3)    : "",
    };
  }

  function setSaveState(roomId: string, s: SaveState) {
    setSaveStates((prev) => ({ ...prev, [roomId]: s }));
  }

  function onReadingChange(roomId: string, field: keyof RowData, value: string) {
    if (!isDigitsOnly(value)) {
      toast.error("Chỉ được nhập số hợp lệ");
      return;
    }

    const room = roomMap[roomId];
    const occupied = room ? isRoomOccupied(room) : false;
    const apiBillStatus = apiBillMap[roomId]?.bill_status ?? storeBillMap[roomId]?.status ?? null;
    if (!canEditBillingInputs(occupied, apiBillStatus)) {
      toast.error("Hóa đơn đã chốt/đã thu, không thể chỉnh sửa");
      return;
    }

    const newRow = { ...getRow(roomId), [field]: sanitizeDigitsInput(value) };
    setRows((p) => ({ ...p, [roomId]: newRow }));

    clearTimeout(debounceTimers.current[roomId]);
    debounceTimers.current[roomId] = setTimeout(async () => {
      const start = parseNonNegativeInteger(newRow.start);
      const end   = parseNonNegativeInteger(newRow.end);
      const water = parseNonNegativeInteger(newRow.water);
      if (start == null || end == null || water == null) {
        toast.error("Chỉ được nhập số hợp lệ");
        return;
      }
      if (end < start) {
        toast.error("Số cuối phải lớn hơn hoặc bằng số đầu");
        return;
      }
      setSaveState(roomId, "saving");
      try {
        await actions.upsertElectricityReading(roomId, cycleId, start, end, water);
        setSaveState(roomId, "saved");
        setTimeout(() => setSaveState(roomId, "idle"), 2500);
        // store.refetch() already ran inside upsertElectricityReading.
        // Wait 200ms for the Supabase view (rental_room_overview) to propagate,
        // then sync apiRooms so action buttons reflect the new bill.
        await new Promise<void>((r) => setTimeout(r, 200));
        await apiRefetch();
      } catch {
        setSaveState(roomId, "error");
      }
    }, 600);
  }

  async function saveInlineReading(roomId: string, rowData: RowData) {
    const room = roomMap[roomId];
    const occupied = room ? isRoomOccupied(room) : false;
    const apiBillStatus = apiBillMap[roomId]?.bill_status ?? storeBillMap[roomId]?.status ?? null;
    if (!canEditBillingInputs(occupied, apiBillStatus)) {
      toast.error("Hóa đơn đã chốt/đã thu, không thể chỉnh sửa");
      return;
    }

    if (!isDigitsOnly(rowData.start) || !isDigitsOnly(rowData.end) || !isDigitsOnly(rowData.water)) {
      toast.error("Chỉ được nhập số hợp lệ");
      return;
    }

    const start = parseNonNegativeInteger(rowData.start);
    const end   = parseNonNegativeInteger(rowData.end);
    const water = parseNonNegativeInteger(rowData.water);
    if (start == null || end == null || water == null) {
      toast.error("Không được nhập số âm");
      return;
    }
    if (end < start) {
      toast.error("Số cuối phải lớn hơn hoặc bằng số đầu");
      return;
    }

    setRows((p) => ({ ...p, [roomId]: rowData }));
    setSaveState(roomId, "saving");
    try {
      await actions.upsertElectricityReading(roomId, cycleId, start, end, water);
      setSaveState(roomId, "saved");
      setTimeout(() => setSaveState(roomId, "idle"), 2500);
      await new Promise<void>((r) => setTimeout(r, 200));
      await apiRefetch();
    } catch {
      setSaveState(roomId, "error");
    }
  }

  /* ─── handlers ──────────────────────────────────────────── */

  async function handleConfirmSingle(roomId: string) {
    const storeBill = storeBillMap[roomId];
    if (!storeBill || storeBill.status !== "draft") return;
    try {
      await actions.confirmSingleBill(storeBill.id);
      toast.success(`Đã chốt ${roomMap[roomId]?.name}`);
    } catch {
      toast.error("Không chốt được hóa đơn");
    } finally {
      await apiRefetch();
    }
  }

  async function handlePay(roomId: string) {
    const bill = storeBillMap[roomId];
    if (!bill) return;
    const amount = parseMoneyInput(payInput);
    if (amount == null) { toast.error("Chỉ được nhập số hợp lệ"); return; }
    if (!amount || amount <= 0) { toast.error("Nhập số tiền hợp lệ"); return; }
    const remaining = bill.totalAmount - bill.paidAmount;
    if (amount > remaining + 0.5) {
      toast.error(`Vượt quá số tiền cần thu (${formatMoney(remaining)})`);
      return;
    }
    try {
      await actions.recordPayment(bill.id, amount, payMethod, undefined);
      setPayInput("");
      toast.success("Đã ghi nhận thanh toán");
      setSelectedRoomId(null);
    } catch {
      toast.error("Không ghi nhận được thanh toán");
    } finally {
      await apiRefetch();
    }
  }

  async function handlePayRemaining(roomId: string) {
    const bill = storeBillMap[roomId];
    if (!bill) return;
    const remaining = bill.totalAmount - bill.paidAmount;
    if (remaining <= 0) return;
    try {
      await actions.recordPayment(bill.id, remaining, payMethod, undefined);
      setPayInput("");
      toast.success("Đã ghi nhận thanh toán đủ");
      setSelectedRoomId(null);
    } catch {
      toast.error("Không ghi nhận được thanh toán");
    } finally {
      await apiRefetch();
    }
  }

  function handleExportSingle(roomId: string) {
    const room = roomMap[roomId];
    const bill = storeBillMap[roomId];
    if (!room || !bill) { toast.error("Chưa có hóa đơn cho phòng này"); return; }
    exportSingleInvoice({ room, bill, month, year, settings, invoiceSettings: state.rental.invoiceSettings });
    toast.success(`Đang xuất hóa đơn ${room.name}…`);
  }

  /* ─── month nav ─────────────────────────────────────────── */

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    const cur = new Date();
    if (ny > cur.getFullYear() || (ny === cur.getFullYear() && nm > cur.getMonth() + 1)) return;
    setMonth(nm); setYear(ny);
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  /* ─── render ────────────────────────────────────────────── */

  return (
    <div className="space-y-5">
      {/* ── Month navigator ── */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={prevMonth}
          className="rounded-lg border border-border p-1.5 hover:bg-muted/40 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-32 text-center text-base font-semibold">
          Tháng {String(month).padStart(2, "0")}/{year}
          {isCurrentMonth && (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-normal text-blue-700">
              Hiện tại
            </span>
          )}
        </span>
        <button type="button" onClick={nextMonth} disabled={isCurrentMonth}
          className="rounded-lg border border-border p-1.5 hover:bg-muted/40 transition-colors disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
        {apiLoading && (
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* ── KPI summary ── */}
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Tổng hóa đơn"    value={formatMoney(totalBilled)} />
          <SummaryCard label="Đã thu"           value={formatMoney(totalPaid)} accent="emerald" />
          <SummaryCard label="Còn lại"          value={formatMoney(Math.max(0, totalBilled - totalPaid))} accent="rose" />
          <SummaryCard label="Đã chốt / Đã thu" value={`${confirmedCount} / ${paidCount} phòng`} />
        </div>
        {allApiBills.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Chưa có hóa đơn tháng này</p>
        )}
      </div>

      {/* ── Main table ── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left   text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phòng</th>
              <th className="px-4 py-3 text-left   text-xs font-semibold uppercase tracking-wider text-muted-foreground">Khách thuê</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số đầu</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số cuối</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nước (m³)</th>
              <th className="px-4 py-3 text-right  text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng bill</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hóa đơn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allRooms.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Chưa có phòng nào — thêm phòng trong tab Phòng
                </td>
              </tr>
            )}
            {allRooms.map((room) => {
              const occupied     = isRoomOccupied(room);
              const apiRow       = apiBillMap[room.id];
              const reading      = readingMap[room.id];
              const row          = getRow(room.id);
              const ground       = isT1(room);
              const ss           = saveStates[room.id] ?? "idle";
              const hasLocalEdit = !!rows[room.id];

              // storeBill is always up-to-date: store.refetch() runs inside
              // upsertElectricityReading, so it reflects DB state immediately.
              // apiRow catches up 200ms later after apiRefetch().
              const storeBill = storeBillMap[room.id];

              /* Bill status: prefer API view; fall back to local store */
              const apiBillStatus = apiRow?.bill_status ?? storeBill?.status ?? null;
              const canEditBillInputs = canEditBillingInputs(occupied, apiBillStatus);
              const displayStatus = getDisplayStatus(room, apiBillStatus, !!reading, cycleId);
              const cfg           = STATUS_CFG[displayStatus];

              /* Action availability: prefer API view flags; fall back to store */
              const hasBill    = !!apiRow?.bill_id || !!storeBill;
              /* live total: DB value when available, else estimate */
              const liveTotal = apiRow?.total_amount != null
                ? apiRow.total_amount
                : occupied && (reading || hasLocalEdit)
                  ? calcLiveTotal(room, settings, row)
                  : null;

              function openModal() {
                if (!occupied || !hasBill) {
                  setHighlightedRoomId(room.id);
                  return;
                }
                setPayInput("");
                setMeterEditingRoomId(null);
                setHighlightedRoomId(room.id);
                setSelectedRoomId(room.id);
              }

              return (
                <Fragment key={room.id}>
                  {/* ── Main data row ── */}
                  <tr
                    onClick={openModal}
                    className={[
                      "bg-card transition-all",
                      occupied && hasBill
                        ? "cursor-pointer hover:bg-muted/40 hover:shadow-[inset_0_-1px_0_0_rgba(99,102,241,0.45)]"
                        : "bg-card",
                      !occupied ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    {/* Phòng */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <Home className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight text-foreground">{room.name}</p>
                          {occupied && hasBill && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                              Nhấn để xem chi tiết
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Khách thuê */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {room.tenant || <span className="italic opacity-50">Trống</span>}
                    </td>

                    {/* Số đầu */}
                    <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {ground ? (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={row.start}
                          onKeyDown={preventInvalidNumberKeyDown}
                          onPaste={preventInvalidNumberPaste}
                          onChange={(e) => onReadingChange(room.id, "start", sanitizeDigitsInput(e.target.value))}
                          disabled={!canEditBillInputs}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                          placeholder="0"
                        />
                      )}
                    </td>

                    {/* Số cuối */}
                    <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      {ground ? (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={row.end}
                          onKeyDown={preventInvalidNumberKeyDown}
                          onPaste={preventInvalidNumberPaste}
                          onChange={(e) => onReadingChange(room.id, "end", sanitizeDigitsInput(e.target.value))}
                          disabled={!canEditBillInputs}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                          placeholder="0"
                        />
                      )}
                    </td>

                    {/* Nước */}
                    <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={row.water}
                        onKeyDown={preventInvalidNumberKeyDown}
                        onPaste={preventInvalidNumberPaste}
                        onChange={(e) => onReadingChange(room.id, "water", sanitizeDigitsInput(e.target.value))}
                        disabled={!canEditBillInputs}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                        placeholder="0"
                      />
                    </td>

                    {/* Tổng bill */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {liveTotal != null ? (
                        <div className="inline-flex flex-col items-end gap-0.5">
                          <span className={`font-semibold ${!hasBill ? "text-muted-foreground" : ""}`}>
                            {formatMoney(liveTotal)}
                          </span>
                          {!hasBill && (
                            <span className="text-[10px] text-muted-foreground/60">ước tính</span>
                          )}
                        </div>
                      ) : (
                        <span className="opacity-40">—</span>
                      )}
                      {ss !== "idle" && (
                        <div className="mt-0.5 flex items-center justify-end gap-0.5">
                          {ss === "saving" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                          {ss === "saved"  && <Check className="h-3 w-3 text-emerald-500" />}
                          {ss === "error"  && <X className="h-3 w-3 text-rose-500" />}
                          <span className={`text-[10px] ${
                            ss === "saved" ? "text-emerald-600" :
                            ss === "error" ? "text-rose-600" :
                            "text-muted-foreground"
                          }`}>
                            {ss === "saving" ? "Đang lưu…" : ss === "saved" ? "Đã lưu" : "Lỗi lưu"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>

                    {/* Row actions */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={openModal}
                          disabled={!occupied || !hasBill}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>

                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRoomId && (() => {
        const room = roomMap[selectedRoomId];
        const apiRow = apiBillMap[selectedRoomId];
        const storeBill = storeBillMap[selectedRoomId];
        const occupied = room ? isRoomOccupied(room) : false;
        const hasBill = !!apiRow?.bill_id || !!storeBill;
        const canRenderDetailModal = !!room && occupied && hasBill;
        if (!canRenderDetailModal) return null;
        return (
          <Dialog open onOpenChange={(open) => !open && setSelectedRoomId(null)}>
            <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto [&>button]:hidden">
              {(() => {
                const reading = getRow(selectedRoomId);
              const effectiveBillStatus = apiRow?.bill_status ?? storeBill?.status ?? null;
              const canEditBillInputs = canEditBillingInputs(occupied, effectiveBillStatus);
              const status = room ? getDisplayStatus(room, effectiveBillStatus, !!readingMap[selectedRoomId], cycleId) : "empty";
              const canConfirm = apiRow?.ui?.can_confirm ?? (storeBill?.status === "draft");
              const canPay = apiRow?.ui?.can_pay ?? (storeBill?.status === "confirmed" || storeBill?.status === "partial_paid");
              const kwh = Math.max((parseFloat(reading.end) || 0) - (parseFloat(reading.start) || 0), 0);
              const remaining = storeBill ? Math.max(0, storeBill.totalAmount - storeBill.paidAmount) : 0;
              return (
                <div className="space-y-4">
                  <DialogHeader className="-mx-6 -mt-6 mb-2 sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-1 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2 text-sm">
                        <DialogTitle className="shrink-0 text-base font-semibold text-foreground">{room.name}</DialogTitle>
                        <span className="shrink-0 text-muted-foreground">•</span>
                        <span className="truncate text-muted-foreground">{room.tenant || "Trống"}</span>
                        <span className="shrink-0 text-muted-foreground">•</span>
                        <span className="truncate text-muted-foreground">Hóa đơn tháng {String(month).padStart(2, "0")}/{year}</span>
                        <span className={`shrink-0 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CFG[status].cls}`}>{STATUS_CFG[status].label}</span>
                      </div>
                      <button type="button" onClick={() => { setMeterEditingRoomId(null); setSelectedRoomId(null); }} className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </DialogHeader>
                  <div className="grid items-stretch gap-5 pt-3 lg:grid-cols-[1fr_320px]">
                    <div className="h-full">
                      {storeBill ? (
                        <SectionCard title="Tổng hợp hóa đơn">
                          <Row label="Tiền thuê" value={formatMoney(storeBill.rentAmount)} />
                          <Row label="Tiền điện" value={formatMoney(storeBill.electricityAmount)} />
                          <Row label="Tiền nước" value={formatMoney(storeBill.waterAmount)} />
                          <Row label="Wifi" value={formatMoney(storeBill.wifiAmount)} />
                          <Row label="Vệ sinh" value={formatMoney(storeBill.cleaningAmount)} />
                          <Row label="Phụ phí khác" value={formatMoney(storeBill.otherAmount)} />
                          <div className="border-t border-border pt-2">
                            <Row label="Tổng" value={formatMoney(storeBill.totalAmount)} className="font-semibold" />
                          </div>
                          <Row label="Đã thu" value={formatMoney(storeBill.paidAmount)} />
                          <Row label="Còn thiếu" value={formatMoney(remaining)} className="font-semibold text-rose-600" />
                        </SectionCard>
                      ) : null}
                    </div>
                    <div className="h-full overflow-y-auto rounded-xl border border-border bg-card p-3">
                      <div className="space-y-3">
                        {storeBill && effectiveBillStatus === "draft" && (
                          <SectionCard title="Nhập điện nước">
                            {meterEditingRoomId !== room.id ? (
                              <>
                                <Row label="Số đầu" value={reading.start || "0"} />
                                <Row label="Số cuối" value={reading.end || "0"} />
                                <Row label="Tiêu thụ" value={String(kwh)} />
                                <Row label="Số m3 nước" value={reading.water || "0"} />
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <button type="button" onClick={() => { setRows((p) => ({ ...p, [room.id]: { ...reading } })); setMeterEditingRoomId(room.id); }} className="rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted/30">Sửa</button>
                                  {canConfirm ? <button type="button" onClick={() => handleConfirmSingle(room.id)} className="rounded-lg bg-foreground py-2 text-sm font-semibold text-background">Chốt hóa đơn</button> : null}
                                </div>
                              </>
                            ) : (
                              <>
                                {!isT1(room) && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={reading.start} onKeyDown={preventInvalidNumberKeyDown} onPaste={preventInvalidNumberPaste} onChange={(e) => setRows((p) => ({ ...p, [room.id]: { ...reading, start: sanitizeDigitsInput(e.target.value) } }))} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" placeholder="Số đầu" />
                                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={reading.end} onKeyDown={preventInvalidNumberKeyDown} onPaste={preventInvalidNumberPaste} onChange={(e) => setRows((p) => ({ ...p, [room.id]: { ...reading, end: sanitizeDigitsInput(e.target.value) } }))} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" placeholder="Số cuối" />
                                  </div>
                                )}
                                <input type="text" inputMode="numeric" pattern="[0-9]*" value={reading.water} onKeyDown={preventInvalidNumberKeyDown} onPaste={preventInvalidNumberPaste} onChange={(e) => setRows((p) => ({ ...p, [room.id]: { ...reading, water: sanitizeDigitsInput(e.target.value) } }))} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" placeholder="Số m3 nước" />
                                <div className="grid grid-cols-2 gap-2">
                                  <button type="button" onClick={async () => { await saveInlineReading(room.id, reading); setMeterEditingRoomId(null); }} disabled={!canEditBillInputs} className="rounded-lg bg-foreground py-2 text-sm font-semibold text-background disabled:opacity-40">Lưu</button>
                                  <button type="button" onClick={() => { const origin = readingMap[room.id]; setRows((p) => ({ ...p, [room.id]: { start: origin?.startIndex != null ? String(origin.startIndex) : "", end: origin?.endIndex != null ? String(origin.endIndex) : "", water: origin?.waterM3 != null ? String(origin.waterM3) : "" } })); setMeterEditingRoomId(null); }} className="rounded-lg border border-border py-2 text-sm font-medium">Huỷ</button>
                                </div>
                              </>
                            )}
                          </SectionCard>
                        )}
                        {storeBill && canPay && ["confirmed", "partial_paid"].includes(effectiveBillStatus ?? "") && (
                          <PaymentSection bill={storeBill} payInput={payInput} setPayInput={setPayInput} payMethod={payMethod} setPayMethod={setPayMethod} onPay={() => handlePay(room.id)} />
                        )}
                        <SectionCard title="Hành động khác">
                          {storeBill && canPay && ["confirmed", "partial_paid"].includes(effectiveBillStatus ?? "") && (
                            <button type="button" onClick={() => handlePayRemaining(room.id)} className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background">Đánh dấu đã thu đủ</button>
                          )}
                          {storeBill && ["confirmed", "partial_paid", "paid"].includes(storeBill.status) && (
                            <button type="button" onClick={() => handleExportSingle(room.id)} className="mt-2 w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30">Xuất PDF</button>
                          )}
                        </SectionCard>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })()}
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Workflow guide ── */}
      <div className="flex flex-wrap gap-3">
        <WorkflowStep n={1} title="Nhập chỉ số" desc="Điền số đầu, số cuối và nước ngay trên bảng" />
        <WorkflowStep n={2} title="Xem chi tiết hóa đơn" desc="Mở chi tiết để kiểm tra tiền thuê, điện, nước và phụ phí" />
        <WorkflowStep n={3} title="Chốt bill và thu tiền" desc="Thực hiện xác nhận bill, ghi nhận thanh toán và xuất PDF trong màn chi tiết" />
      </div>
    </div>
  );
}

/* ─── sub-components ──────────────────────────────────────── */

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "rose" }) {
  const color =
    accent === "emerald" ? "text-emerald-600" : accent === "rose" ? "text-rose-600" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function PaymentSection({
  bill, payInput, setPayInput, payMethod, setPayMethod, onPay,
}: {
  bill: RentalRoomBill;
  payInput: string;   setPayInput: (v: string) => void;
  payMethod: string;  setPayMethod: (v: string) => void;
  onPay: () => void;
}) {
  const remaining = Math.max(0, bill.totalAmount - bill.paidAmount);
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      <p className="text-sm font-semibold">Thu tiền một phần</p>

      {/* Payment summary */}
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Đã trả</span>
          <p className="font-semibold text-emerald-600 tabular-nums">{formatMoney(bill.paidAmount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Còn thiếu</span>
          <p className="font-semibold text-rose-600 tabular-nums">{formatMoney(remaining)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={payInput}
          onKeyDown={preventInvalidNumberKeyDown}
          onPaste={preventInvalidNumberPaste}
          onChange={(e) => setPayInput(formatMoneyInput(e.target.value))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Số tiền thu"
          autoFocus
        />
        <select
          value={payMethod}
          onChange={(e) => setPayMethod(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="cash">Tiền mặt</option>
          <option value="transfer">Chuyển khoản</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onPay}
        className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background"
      >
        Ghi nhận
      </button>
    </div>
  );
}

function WorkflowStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 flex-1 min-w-52">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
        {n}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
