import { Fragment, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Download,
  Loader2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { RentalRoom, RentalRoomBill, RentalSettings } from "@/lib/finance-types";
import { formatMoney } from "@/utils/format";
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
  const [payNote, setPayNote]     = useState("");
  const [inlineEdit, setInlineEdit] = useState<{
    roomId: string;
    mode: "electricity" | "water";
    value: { start?: string; end?: string; water?: string };
  } | null>(null);

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
    const newRow = { ...getRow(roomId), [field]: value };
    setRows((p) => ({ ...p, [roomId]: newRow }));

    clearTimeout(debounceTimers.current[roomId]);
    debounceTimers.current[roomId] = setTimeout(async () => {
      const start = parseFloat(newRow.start) || 0;
      const end   = parseFloat(newRow.end)   || 0;
      const water = parseFloat(newRow.water) || 0;
      if (end < start) return;
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
    const start = parseFloat(rowData.start) || 0;
    const end   = parseFloat(rowData.end)   || 0;
    const water = parseFloat(rowData.water) || 0;
    if (end < start) return;

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
    const amount = parseFloat(payInput.replace(/[^\d.]/g, ""));
    if (!amount || amount <= 0) { toast.error("Nhập số tiền hợp lệ"); return; }
    const remaining = bill.totalAmount - bill.paidAmount;
    if (amount > remaining + 0.5) {
      toast.error(`Vượt quá số tiền cần thu (${formatMoney(remaining)})`);
      return;
    }
    try {
      await actions.recordPayment(bill.id, amount, payMethod, payNote || undefined);
      setPayInput(""); setPayNote("");
      toast.success("Đã ghi nhận thanh toán");
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
      {allApiBills.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Tổng hóa đơn"    value={formatMoney(totalBilled)} />
          <SummaryCard label="Đã thu"           value={formatMoney(totalPaid)} accent="emerald" />
          <SummaryCard label="Còn lại"          value={formatMoney(Math.max(0, totalBilled - totalPaid))} accent="rose" />
          <SummaryCard label="Đã chốt / Đã thu" value={`${confirmedCount} / ${paidCount} phòng`} />
        </div>
      )}

      {/* ── Main table ── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 text-left   text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phòng</th>
              <th className="px-4 py-3 text-left   text-xs font-semibold uppercase tracking-wider text-muted-foreground">Khách thuê</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số đầu</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số cuối</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nước (m³)</th>
              <th className="px-4 py-3 text-right  text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng bill</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allRooms.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
              const displayStatus = getDisplayStatus(room, apiBillStatus, !!reading, cycleId);
              const cfg           = STATUS_CFG[displayStatus];

              /* Action availability: prefer API view flags; fall back to store */
              const hasBill    = !!apiRow?.bill_id || !!storeBill;
              const canConfirm = apiRow?.ui?.can_confirm
                ?? (storeBill?.status === "draft");
              const canPay     = apiRow?.ui?.can_pay
                ?? (storeBill?.status === "confirmed" || storeBill?.status === "partial_paid");

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
                setPayNote("");
                setInlineEdit(null);
                setHighlightedRoomId(room.id);
                setSelectedRoomId(room.id);
              }

              return (
                <Fragment key={room.id}>
                  {/* ── Main data row ── */}
                  <tr
                    onClick={openModal}
                    className={[
                      "transition-colors",
                      occupied && hasBill
                        ? "cursor-pointer hover:bg-muted/40"
                        : "bg-card",
                      !occupied ? "opacity-50" : "",
                      selectedRoomId === room.id || highlightedRoomId === room.id ? "bg-muted/30 border-l-4 border-indigo-400" : "border-l-4 border-transparent",
                    ].join(" ")}
                  >
                    {/* Detail chevron */}
                    <td className="w-8 px-2 py-3 text-center text-muted-foreground">
                      {occupied && hasBill && (
                        <ChevronDown
                          className="h-3.5 w-3.5 mx-auto -rotate-90"
                        />
                      )}
                    </td>

                    {/* Phòng */}
                    <td className="px-4 py-3">
                      <p className="font-medium leading-tight">{room.name}</p>
                      {occupied && hasBill && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Nhấn để xem chi tiết
                        </p>
                      )}
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
                          type="number"
                          value={row.start}
                          onChange={(e) => onReadingChange(room.id, "start", e.target.value)}
                          disabled={!occupied}
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
                          type="number"
                          value={row.end}
                          onChange={(e) => onReadingChange(room.id, "end", e.target.value)}
                          disabled={!occupied}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                          placeholder="0"
                        />
                      )}
                    </td>

                    {/* Nước */}
                    <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        value={row.water}
                        onChange={(e) => onReadingChange(room.id, "water", e.target.value)}
                        disabled={!occupied}
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
                      {occupied && hasBill ? (
                        <div className="flex items-center justify-center gap-1">
                          <RowBtn
                            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                            label="Chốt"
                            onClick={() => handleConfirmSingle(room.id)}
                            color="indigo"
                            disabled={!canConfirm}
                          />
                          <RowBtn
                            icon={<Download className="h-3.5 w-3.5" />}
                            label="PDF"
                            onClick={() => handleExportSingle(room.id)}
                            color="rose"
                          />
                        </div>
                      ) : null}
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
              const status = room ? getDisplayStatus(room, apiRow?.bill_status ?? storeBill?.status ?? null, !!readingMap[selectedRoomId], cycleId) : "empty";
              const canConfirm = apiRow?.ui?.can_confirm ?? (storeBill?.status === "draft");
              const canPay = apiRow?.ui?.can_pay ?? (storeBill?.status === "confirmed" || storeBill?.status === "partial_paid");
              const kwh = Math.max((parseFloat(reading.end) || 0) - (parseFloat(reading.start) || 0), 0);
              const electricityAmount = isT1(room)
                ? settings.t1ElectricityBill
                : kwh * settings.defaultElectricityRate;
              const waterAmount = (parseFloat(reading.water) || 0) * settings.waterRatePerM3;
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
                      </div>
                      <span className={`shrink-0 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CFG[status].cls}`}>{STATUS_CFG[status].label}</span>
                      <button type="button" onClick={() => { setInlineEdit(null); setSelectedRoomId(null); }} className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </DialogHeader>
                  <div className="grid gap-5 pt-3 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                      {storeBill ? (
                        <SectionCard title="Tổng hợp hóa đơn">
                          <Row label="Tiền thuê" value={formatMoney(storeBill.rentAmount)} />
                          <div className="border-t border-border pt-2 space-y-2">
                            <Row label="Tiền điện" value={formatMoney(storeBill.electricityAmount)} />
                          {!isT1(room) && (
                            <InlineEditRow
                              label="Số đầu / Số cuối"
                              value={`${reading.start || 0} / ${reading.end || 0}`}
                              editing={inlineEdit?.roomId === room.id && inlineEdit?.mode === "electricity"}
                              onEdit={() => setInlineEdit({ roomId: room.id, mode: "electricity", value: { start: reading.start, end: reading.end } })}
                              onCancel={() => setInlineEdit(null)}
                              onSave={async () => {
                                if (!inlineEdit || inlineEdit.mode !== "electricity") return;
                                await saveInlineReading(room.id, {
                                  start: inlineEdit.value.start ?? reading.start,
                                  end: inlineEdit.value.end ?? reading.end,
                                  water: reading.water,
                                });
                                setInlineEdit(null);
                              }}
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={inlineEdit?.mode === "electricity" ? (inlineEdit.value.start ?? "") : ""} onChange={(e) => setInlineEdit((prev) => prev ? { ...prev, value: { ...prev.value, start: e.target.value } } : prev)} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                                <input type="number" value={inlineEdit?.mode === "electricity" ? (inlineEdit.value.end ?? "") : ""} onChange={(e) => setInlineEdit((prev) => prev ? { ...prev, value: { ...prev.value, end: e.target.value } } : prev)} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                              </div>
                            </InlineEditRow>
                          )}
                          </div>
                          <div className="border-t border-border pt-2 space-y-2">
                          <Row label="Tiền nước" value={formatMoney(storeBill.waterAmount)} />
                          <InlineEditRow
                            label="Số m3 nước"
                            value={reading.water || "0"}
                            editing={inlineEdit?.roomId === room.id && inlineEdit?.mode === "water"}
                            onEdit={() => setInlineEdit({ roomId: room.id, mode: "water", value: { water: reading.water } })}
                            onCancel={() => setInlineEdit(null)}
                            onSave={async () => {
                              if (!inlineEdit || inlineEdit.mode !== "water") return;
                              await saveInlineReading(room.id, {
                                start: reading.start,
                                end: reading.end,
                                water: inlineEdit.value.water ?? reading.water,
                              });
                              setInlineEdit(null);
                            }}
                          >
                            <input type="number" value={inlineEdit?.mode === "water" ? (inlineEdit.value.water ?? "") : ""} onChange={(e) => setInlineEdit((prev) => prev ? { ...prev, value: { ...prev.value, water: e.target.value } } : prev)} className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                          </InlineEditRow>
                          </div>
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
                    <div className="space-y-2 lg:sticky lg:top-2 lg:self-start rounded-xl border border-border bg-card p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác nhanh</h4>
                      {storeBill && canPay ? (
                        <button type="button" onClick={() => handlePay(room.id)} className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background">Thu tiền</button>
                      ) : canConfirm ? (
                        <button type="button" onClick={() => handleConfirmSingle(room.id)} className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background">Chốt bill</button>
                      ) : null}
                      <button type="button" onClick={() => handleExportSingle(room.id)} className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30">Xuất PDF</button>
                      {storeBill && canPay ? (
                        <PaymentSection bill={storeBill} payInput={payInput} setPayInput={setPayInput} payMethod={payMethod} setPayMethod={setPayMethod} payNote={payNote} setPayNote={setPayNote} onPay={() => handlePay(room.id)} />
                      ) : null}
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
        <WorkflowStep n={1} title="Nhập chỉ số"   desc="Điền số đầu/cuối — tự động lưu sau 0.6s" />
        <WorkflowStep n={2} title="Chốt hóa đơn"  desc='Bấm "Chốt" để xác nhận chi phí tháng' />
        <WorkflowStep n={3} title="Thu tiền"       desc="Click vào hàng để mở chi tiết và thu tiền" />
      </div>
    </div>
  );
}

/* ─── sub-components ──────────────────────────────────────── */

const ROW_BTN_COLORS: Record<string, string> = {
  indigo:  "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm",
  slate:   "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-sm",
  rose:    "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 shadow-sm",
};

function RowBtn({
  icon, label, onClick, color, disabled,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; color: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors
        ${ROW_BTN_COLORS[color] ?? ""}
        disabled:opacity-35 disabled:pointer-events-none`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

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

function InlineEditRow({
  label, value, editing, onEdit, onSave, onCancel, children,
}: {
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 border-t border-border pt-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        {!editing ? (
          <div className="flex items-center gap-3">
            <span className="font-medium tabular-nums">{value}</span>
            <button type="button" onClick={onEdit} className="text-xs font-medium text-indigo-600 hover:underline">Sửa</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={onSave} className="rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background">Lưu</button>
            <button type="button" onClick={onCancel} className="rounded-md border border-border px-2 py-1 text-xs font-medium">Huỷ</button>
          </div>
        )}
      </div>
      {editing ? children : null}
    </div>
  );
}

function PaymentSection({
  bill, payInput, setPayInput, payMethod, setPayMethod, payNote, setPayNote, onPay,
}: {
  bill: RentalRoomBill;
  payInput: string;   setPayInput: (v: string) => void;
  payMethod: string;  setPayMethod: (v: string) => void;
  payNote: string;    setPayNote: (v: string) => void;
  onPay: () => void;
}) {
  const remaining = Math.max(0, bill.totalAmount - bill.paidAmount);
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
      <p className="text-sm font-semibold">Thu tiền</p>

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

      {/* Primary action row: amount + button side-by-side */}
      <div className="flex gap-2">
        <input
          type="number"
          value={payInput}
          onChange={(e) => setPayInput(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Số tiền thu"
          autoFocus
        />
        <button
          type="button"
          onClick={onPay}
          className="shrink-0 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/30 transition-colors"
        >
          Ghi nhận
        </button>
      </div>

      {/* Secondary options */}
      <div className="flex gap-2">
        <select
          value={payMethod}
          onChange={(e) => setPayMethod(e.target.value)}
          className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
        >
          <option value="cash">Tiền mặt</option>
          <option value="transfer">Chuyển khoản</option>
        </select>
        <input
          type="text"
          value={payNote}
          onChange={(e) => setPayNote(e.target.value)}
          placeholder="Ghi chú (tùy chọn)"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
        />
      </div>
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
