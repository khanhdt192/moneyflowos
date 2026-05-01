import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Download,
  Loader2,
  Clock,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { RentalRoom, RentalRoomBill } from "@/lib/finance-types";
import { formatMoney, formatNumber, parseNumber } from "@/utils/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { exportSingleInvoice } from "@/lib/rental-pdf";
import { useRentalRooms } from "@/hooks/use-rental-rooms";

/* ─── types ───────────────────────────────────────────────── */

type BillStatus = "missing" | "ready" | "confirmed" | "partial" | "paid";

function mapStatus(bill: { status: string } | null | undefined): BillStatus {
  if (!bill) return "missing";

  switch (bill.status) {
    case "draft":
      return "ready";
    case "confirmed":
      return "confirmed";
    case "partial_paid":
      return "partial";
    case "paid":
      return "paid";
    default:
      return "missing";
  }
}

type SaveState = "idle" | "saving" | "saved" | "error";

const STATUS_CFG: Record<BillStatus, { label: string; cls: string }> = {
  missing:   { label: "Chưa nhập số", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ready:     { label: "Chờ chốt", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  confirmed: { label: "Đã chốt", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  partial:   { label: "Thanh toán một phần", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  paid:      { label: "Đã thanh toán", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function isT1(room: RentalRoom) {
  return room.floor === 1;
}

type RowData = { start: string; end: string; water: string };

/* ─── component ───────────────────────────────────────────── */

export function ChotThang() {
  const state   = useFinance();
  const actions = useFinanceActions();
  const now     = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const cycleId   = `${year}-${String(month).padStart(2, "0")}`;
  const settings  = state.rental.settings;
  const { rooms: apiRooms } = useRentalRooms(cycleId);

  /* local editing rows (controlled inputs) */
  const [rows, setRows]           = useState<Record<string, RowData>>({});
  /* per-room save status */
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  /* debounce timers per room */
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /* detail drawer */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"detail" | "pay">("detail");
  const [payInput, setPayInput]   = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote]     = useState("");

  /* toolbar async state */

  /* clear local rows when month changes */
  useEffect(() => {
    setRows({});
    setSaveStates({});
  }, [month, year]);

  /* ─── derived maps ──────────────────────────────────────── */
  const roomMap = Object.fromEntries(state.rental.rooms.map((r) => [r.id, r]));
  const billMap = Object.fromEntries(
    state.rental.roomBills.filter((b) => b.cycleId === cycleId).map((b) => [b.roomId, b]),
  );
  const apiBillMap = useMemo(() => Object.fromEntries(apiRooms.map((r) => [r.room_id, r.bill])), [apiRooms]);
  const readingMap = Object.fromEntries(
    state.rental.electricityReadings
      .filter((r) => r.cycleId === cycleId)
      .map((r) => [r.roomId, r]),
  );

  const allRooms      = state.rental.rooms;
  const occupiedRooms = allRooms.filter((r) => r.occupied);
  const selectedRoom  = selectedId ? roomMap[selectedId] : null;
  const selectedBill  = selectedId ? billMap[selectedId] : undefined;

  const confirmedCount = Object.values(billMap).filter((b) =>
    ["confirmed", "partial_paid", "paid"].includes(b.status)).length;
  const paidCount      = Object.values(billMap).filter((b) => b.status === "paid").length;
  const totalBilled    = Object.values(billMap).reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid      = Object.values(billMap).reduce((s, b) => s + b.paidAmount, 0);

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

  function setSaveState(roomId: string, state: SaveState) {
    setSaveStates((s) => ({ ...s, [roomId]: state }));
  }

  function onReadingChange(roomId: string, field: keyof RowData, value: string) {
    const newRow = { ...getRow(roomId), [field]: value };
    setRows((p) => ({ ...p, [roomId]: newRow }));

    /* debounce auto-save */
    clearTimeout(debounceTimers.current[roomId]);
    debounceTimers.current[roomId] = setTimeout(async () => {
      const start = parseFloat(newRow.start) || 0;
      const end   = parseFloat(newRow.end)   || 0;
      const water = parseFloat(newRow.water) || 0;
      if (end < start) return; // silently skip invalid range
      setSaveState(roomId, "saving");
      try {
        await actions.upsertElectricityReading(roomId, cycleId, start, end, water);
        setSaveState(roomId, "saved");
        setTimeout(() => setSaveState(roomId, "idle"), 2500);
      } catch {
        setSaveState(roomId, "error");
      }
    }, 600);
  }

  /* ─── toolbar handlers ──────────────────────────────────── */


  async function handleConfirmSingle(roomId: string) {
    const bill = billMap[roomId];
    if (!bill || bill.status !== "ready") return;
    try {
      await actions.confirmSingleBill(bill.id);
      toast.success(`Đã chốt ${roomMap[roomId]?.name}`);
    } catch {
      toast.error("Không chốt được hóa đơn");
    }
  }

  async function handlePay() {
    if (!selectedBill) return;
    const amount = parseNumber(payInput);
    if (!amount || amount <= 0) { toast.error("Nhập số tiền hợp lệ"); return; }
    const remaining = selectedBill.totalAmount - selectedBill.paidAmount;
    if (amount > remaining + 0.5) {
      toast.error(`Vượt quá số tiền cần thu (${formatMoney(remaining)})`);
      return;
    }
    try {
      await actions.recordPayment(selectedBill.id, amount, payMethod, payNote || undefined);
      setPayInput(""); setPayNote("");
      toast.success("Đã ghi nhận thanh toán");
      setSelectedId(null);
    } catch {
      toast.error("Không ghi nhận được thanh toán");
    }
  }

  function handleExportSingle(roomId: string) {
    const room = roomMap[roomId];
    const bill = billMap[roomId];
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
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Month navigator */}
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
        </div>

        {/* Toolbar — 3 actions (save button removed) */}
        <div />
      </div>


      {/* ── KPI summary ── */}
      {Object.keys(billMap).length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Tổng hóa đơn" value={formatMoney(totalBilled)} />
          <SummaryCard label="Đã thu" value={formatMoney(totalPaid)} accent="emerald" />
          <SummaryCard label="Còn lại" value={formatMoney(Math.max(0, totalBilled - totalPaid))} accent="rose" />
          <SummaryCard label="Đã chốt / Đã thu" value={`${confirmedCount} / ${paidCount} phòng`} />
        </div>
      )}

      {/* ── Main table ── */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phòng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Khách thuê</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số đầu</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số cuối</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nước (m³)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng bill</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác</th>
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
              const bill    = billMap[room.id];
              const row     = getRow(room.id);
              const ground  = isT1(room);
              const ss      = saveStates[room.id] ?? "idle";

              const apiBill = apiBillMap[room.id] ?? null;
              const displayStatus = mapStatus(apiBill);
              const cfg = STATUS_CFG[displayStatus];

              const liveTotal = bill?.totalAmount ?? null;

              return (
                <tr key={room.id}
                  className={`bg-card transition-colors ${displayStatus === "ready" ? "bg-amber-50/30" : ""} ${room.occupied ? "hover:bg-muted/10" : "opacity-50"}`}>
                  <td className="px-4 py-3 font-medium">{room.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {room.tenant || <span className="italic opacity-50">Trống</span>}
                  </td>

                  {/* Số đầu */}
                  <td className="px-4 py-2 text-center">
                    <input
                        type="number"
                        value={row.start}
                        onChange={(e) => onReadingChange(room.id, "start", e.target.value)}
                        disabled={!room.occupied || ground}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                        placeholder={ground ? "Tính theo hoá đơn điện" : "0"}
                      />
                  </td>

                  {/* Số cuối */}
                  <td className="px-4 py-2 text-center">
                    <input
                        type="number"
                        value={row.end}
                        onChange={(e) => onReadingChange(room.id, "end", e.target.value)}
                        disabled={!room.occupied || ground}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                        placeholder={ground ? "Tính theo hoá đơn điện" : "0"}
                      />
                  </td>

                  {/* Nước */}
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      value={row.water}
                      onChange={(e) => onReadingChange(room.id, "water", e.target.value)}
                      disabled={!room.occupied}
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                      placeholder="0"
                    />
                  </td>

                  {/* Tổng bill — auto-calc live */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {liveTotal != null ? (
                      <div className="inline-flex flex-col items-end gap-0.5">
                        <span className={`font-semibold ${!bill ? "text-muted-foreground" : ""}`}>
                          {formatMoney(liveTotal)}
                        </span>
                        {!bill && (
                          <span className="text-[10px] text-muted-foreground/60">ước tính</span>
                        )}
                      </div>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                    {/* per-row save indicator */}
                    {ss !== "idle" && (
                      <div className="mt-0.5 flex items-center justify-end gap-0.5">
                        {ss === "saving" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        {ss === "saved"  && <Check className="h-3 w-3 text-emerald-500" />}
                        {ss === "error"  && <X className="h-3 w-3 text-rose-500" />}
                        <span className={`text-[10px] ${ss === "saved" ? "text-emerald-600" : ss === "error" ? "text-rose-600" : "text-muted-foreground"}`}>
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
                  <td className="px-4 py-3">
                    {room.occupied && bill ? (
                      <div className="flex items-center justify-center gap-1">
                        <RowBtn
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          label="Chốt"
                          onClick={() => handleConfirmSingle(room.id)}
                          color="indigo"
                          disabled={bill.status !== "ready"}
                        />
                        <RowBtn
                          icon={<DollarSign className="h-3.5 w-3.5" />}
                          label="Thanh toán"
                          onClick={() => {
                            setDrawerMode("pay");
                            setSelectedId(room.id);
                            setPayInput("");
                            setPayNote("");
                          }}
                          color="emerald"
                          disabled={bill.status === "draft" || bill.status === "paid"}
                        />
                        <RowBtn
                          icon={<Download className="h-3.5 w-3.5" />}
                          label="PDF"
                          onClick={() => handleExportSingle(room.id)}
                          color="rose"
                        />
                        <RowBtn
                          icon={<X className="h-3.5 w-3.5" />}
                          label="Hoàn tác"
                          onClick={() => void actions.rollbackBill(bill.id)}
                          color="slate"
                          disabled={bill.status !== "confirmed"}
                        />
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Workflow guide ── */}
      <div className="flex flex-wrap gap-3">
        <WorkflowStep n={1} title="Nhập chỉ số" desc="Điền số đầu/cuối — tự động lưu sau 0.6s" />
        <WorkflowStep n={2} title="Tự tạo hóa đơn" desc="Hệ thống tự tạo/cập nhật hóa đơn nháp" />
        <WorkflowStep n={3} title="Chốt theo phòng" desc="Chỉ chốt khi trạng thái Sẵn sàng chốt" />
        <WorkflowStep n={4} title="Thu tiền" desc='Bấm "Thu tiền" khi khách thanh toán' />
      </div>

      {/* ── Detail sheet ── */}
      <Sheet open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedRoom && (
            <>
              <SheetHeader className="mb-5">
                <SheetTitle>{selectedRoom.name}</SheetTitle>
                <div className="mt-1 space-y-0.5 text-sm">
                  <p className="text-muted-foreground">
                    Khách thuê:{" "}
                    <span className="font-medium text-foreground">
                      {selectedRoom.tenant || <em className="opacity-50">Chưa có</em>}
                    </span>
                  </p>
                  {selectedBill && (
                    <p className="text-muted-foreground flex items-center gap-2">
                      Trạng thái:{" "}
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CFG[selectedBill.status as BillStatus]?.cls ?? ""}`}>
                        {STATUS_CFG[selectedBill.status as BillStatus]?.label ?? selectedBill.status}
                      </span>
                    </p>
                  )}
                </div>
              </SheetHeader>

              {selectedBill ? (
                <div className="space-y-5">
                  <BillBreakdown bill={selectedBill} settings={state.rental.settings} />

                  {/* Payment history */}
                  {state.rental.payments.filter((p) => p.billId === selectedBill.id).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Lịch sử thanh toán
                      </p>
                      <div className="space-y-1">
                        {state.rental.payments
                          .filter((p) => p.billId === selectedBill.id)
                          .map((p) => (
                            <div key={p.id}
                              className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {new Date(p.paidAt).toLocaleDateString("vi-VN")}
                                </span>
                                {p.note && <span className="text-muted-foreground">· {p.note}</span>}
                              </div>
                              <span className="font-medium text-emerald-600">+{formatMoney(p.amount)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Pay form */}
                  {["confirmed", "partial_paid"].includes(selectedBill.status) && (
                    <div className={`rounded-xl border p-4 space-y-3 ${drawerMode === "pay" ? "border-emerald-300 bg-emerald-50/40" : "border-border"}`}>
                      <p className="text-sm font-semibold">Thu tiền</p>
                      <div className="text-sm text-muted-foreground flex justify-between">
                        <span>Còn thiếu</span>
                        <span className="font-semibold text-rose-600">
                          {formatMoney(Math.max(0, selectedBill.totalAmount - selectedBill.paidAmount))}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={payInput}
                        onChange={(e) => setPayInput(formatNumber(parseNumber(e.target.value.replace(/[^\d,]/g, ""))))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Số tiền thu"
                        autoFocus={drawerMode === "pay"}
                      />
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                      >
                        <option value="cash">Tiền mặt</option>
                        <option value="transfer">Chuyển khoản</option>
                      </select>
                      <input
                        type="text"
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        placeholder="Ghi chú (tùy chọn)"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={handlePay}
                          className="flex-1 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-90">
                          Thu tiền
                        </button>
                        <button type="button" onClick={() => setSelectedId(null)}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/40">
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bank info */}
                  {settings.bankAccount && (
                    <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                      <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Thông tin chuyển khoản
                      </p>
                      {settings.bankName    && <p>🏦 {settings.bankName}</p>}
                      {settings.bankAccount && <p>STK: <span className="font-mono font-semibold">{settings.bankAccount}</span></p>}
                      {settings.bankHolder  && <p>Chủ TK: {settings.bankHolder}</p>}
                      {settings.bankNoteTemplate && (
                        <p className="text-muted-foreground">
                          Nội dung CK:{" "}
                          {settings.bankNoteTemplate
                            .replace("{room}", selectedRoom.name)
                            .replace("{month}", String(month).padStart(2, "0"))
                            .replace("{year}", String(year))}
                        </p>
                      )}
                      {settings.bankQrUrl && (
                        <img src={settings.bankQrUrl} alt="QR" className="h-32 w-32 rounded-lg object-cover" />
                      )}
                    </div>
                  )}

                  <button type="button" onClick={() => handleExportSingle(selectedRoom.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted/40">
                    <Download className="h-4 w-4" />
                    Xuất hóa đơn PDF
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                  <p className="text-sm text-muted-foreground">
                    Chưa có hóa đơn cho phòng này tháng {month}/{year}.
                    <br />Nhập chỉ số điện và nước để hệ thống tự tạo hóa đơn.
                  </p>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── sub-components ──────────────────────────────────────── */

const ROW_BTN_COLORS: Record<string, string> = {
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm",
  slate: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-sm",
  rose: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 shadow-sm",
};

function RowBtn({
  icon,
  label,
  onClick,
  color,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
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

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "rose";
}) {
  const color =
    accent === "emerald" ? "text-emerald-600" : accent === "rose" ? "text-rose-600" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function BillBreakdown({
  bill,
  settings,
}: {
  bill: RentalRoomBill;
  settings: ReturnType<typeof useFinance>["rental"]["settings"];
}) {
  const rows = [
    { label: "Tiền thuê", amount: bill.rentAmount },
    { label: "Điện", amount: bill.electricityAmount },
    { label: "Nước", amount: bill.waterAmount },
    { label: "Wifi", amount: bill.wifiAmount },
    { label: "Vệ sinh", amount: bill.cleaningAmount },
    { label: settings.otherName || "Phụ phí", amount: bill.otherAmount },
  ].filter((r) => r.amount > 0);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-0">
              <td className="px-4 py-2 text-muted-foreground">{r.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/30">
            <td className="px-4 py-2.5 font-semibold">Tổng cộng</td>
            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatMoney(bill.totalAmount)}</td>
          </tr>
          <tr className="border-t border-border">
            <td className="px-4 py-2 text-emerald-600">Đã thanh toán</td>
            <td className="px-4 py-2 text-right text-emerald-600 tabular-nums">{formatMoney(bill.paidAmount)}</td>
          </tr>
          <tr className="border-t border-border">
            <td className="px-4 py-2 font-semibold text-rose-600">Còn lại</td>
            <td className="px-4 py-2 text-right font-semibold text-rose-600 tabular-nums">
              {formatMoney(Math.max(0, bill.totalAmount - bill.paidAmount))}
            </td>
          </tr>
        </tfoot>
      </table>
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
