import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Zap,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  FileText,
  Download,
  Loader2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { RentalRoom, RentalRoomBill } from "@/lib/finance-types";
import { formatVND } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { exportSingleInvoice, exportAllInvoices } from "@/lib/rental-pdf";

/* ─── types ───────────────────────────────────────────────── */

type BillStatus = "empty" | "no_reading" | "draft" | "confirmed" | "partial_paid" | "paid" | "overdue" | "cancelled";

function getDisplayStatus(room: RentalRoom, bill: RentalRoomBill | undefined, hasReading: boolean, cycleId: string): BillStatus {
  if (!room.occupied) return "empty";
  if (!bill) return hasReading ? "draft" : "no_reading";
  if (bill.status === "paid")          return "paid";
  if (bill.status === "partial_paid")  return "partial_paid";
  if (bill.status === "confirmed") {
    const [y, m] = cycleId.split("-").map(Number);
    const now = new Date();
    if (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) return "overdue";
    return "confirmed";
  }
  if (bill.status === "cancelled") return "cancelled";
  // draft
  return "draft";
}

const STATUS_CFG: Record<BillStatus, { label: string; cls: string }> = {
  empty:       { label: "Trống",          cls: "bg-slate-100 text-slate-500 border-slate-200" },
  no_reading:  { label: "Chưa nhập số",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  draft:       { label: "Nháp",           cls: "bg-blue-50 text-blue-700 border-blue-200" },
  confirmed:   { label: "Đã chốt",        cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  partial_paid:{ label: "Thu một phần",   cls: "bg-violet-50 text-violet-700 border-violet-200" },
  paid:        { label: "Đã thu",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  overdue:     { label: "Quá hạn",        cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled:   { label: "Đã huỷ",        cls: "bg-slate-100 text-slate-400 border-slate-200" },
};

function isT1(room: RentalRoom) {
  return room.floor === 1 || /t[aâ]ng\s*1/i.test(room.name);
}

type RowData = { start: string; end: string; water: string };

/* ─── component ───────────────────────────────────────────── */

export function ChotThang() {
  const state  = useFinance();
  const actions = useFinanceActions();
  const now    = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const cycleId = `${year}-${String(month).padStart(2, "0")}`;
  const settings = state.rental.settings;

  const [rows, setRows] = useState<Record<string, RowData>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"detail" | "pay">("detail");
  const [payInput, setPayInput] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");

  const [saving, setSaving]       = useState(false);
  const [drafting, setDrafting]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* ─── derived ───────────────────────────────────────────── */
  const roomMap = Object.fromEntries(state.rental.rooms.map((r) => [r.id, r]));
  const billMap = Object.fromEntries(
    state.rental.roomBills.filter((b) => b.cycleId === cycleId).map((b) => [b.roomId, b]),
  );
  const readingMap = Object.fromEntries(
    state.rental.electricityReadings.filter((r) => r.cycleId === cycleId).map((r) => [r.roomId, r]),
  );

  const allRooms = state.rental.rooms;
  const occupiedRooms = allRooms.filter((r) => r.occupied);
  const selectedRoom = selectedId ? roomMap[selectedId] : null;
  const selectedBill = selectedId ? billMap[selectedId] : undefined;

  // Summary counts
  const draftCount     = Object.values(billMap).filter((b) => b.status === "draft").length;
  const confirmedCount = Object.values(billMap).filter((b) => ["confirmed", "partial_paid", "paid"].includes(b.status)).length;
  const paidCount      = Object.values(billMap).filter((b) => b.status === "paid").length;
  const totalBilled    = Object.values(billMap).reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid      = Object.values(billMap).reduce((s, b) => s + b.paidAmount, 0);

  /* ─── handlers ──────────────────────────────────────────── */

  function getRow(roomId: string): RowData {
    if (rows[roomId]) return rows[roomId];
    const r = readingMap[roomId];
    return { start: String(r?.startIndex ?? ""), end: String(r?.endIndex ?? ""), water: String(r?.waterM3 ?? "") };
  }

  async function handleSaveReadings() {
    const dirty = occupiedRooms.filter((r) => rows[r.id] && !isT1(r));
    if (dirty.length === 0) { toast.info("Chưa có số đo nào để lưu"); return; }
    setSaving(true);
    try {
      for (const r of dirty) {
        const row = rows[r.id];
        if (!row) continue;
        const start  = parseFloat(row.start) || 0;
        const end    = parseFloat(row.end)   || 0;
        const water  = parseFloat(row.water) || 0;
        if (end < start) { toast.error(`${r.name}: số cuối < số đầu`); continue; }
        await actions.upsertElectricityReading(r.id, cycleId, start, end, water);
      }
      setRows({});
      toast.success("Đã lưu số đo điện nước");
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateDrafts() {
    setDrafting(true);
    try {
      const { created, skipped } = await actions.createDraftBills(month, year);
      if (created === 0 && skipped === 0) {
        toast.info("Không có phòng đang thuê");
      } else if (created === 0) {
        toast.info(`Tất cả ${skipped} phòng đã có hóa đơn (không ghi đè)`);
      } else {
        toast.success(`Đã tạo ${created} hóa đơn nháp${skipped > 0 ? `, bỏ qua ${skipped} đã chốt` : ""}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không tạo được hóa đơn");
    } finally {
      setDrafting(false);
    }
  }

  async function handleConfirmAll() {
    setConfirming(true);
    try {
      const { confirmed, alreadyDone } = await actions.confirmBills(month, year);
      if (confirmed === 0 && alreadyDone === 0) {
        toast.info("Chưa có hóa đơn nháp nào để chốt");
      } else if (confirmed === 0) {
        toast.info("Hóa đơn tháng này đã được chốt.");
      } else {
        toast.success(`Đã chốt ${confirmed} hóa đơn. Hóa đơn tháng này đã được chốt.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không chốt được hóa đơn");
    } finally {
      setConfirming(false);
    }
  }

  async function handleConfirmSingle(roomId: string) {
    const bill = billMap[roomId];
    if (!bill || bill.status !== "draft") return;
    try {
      await actions.confirmSingleBill(bill.id);
      toast.success(`Đã chốt hóa đơn ${roomMap[roomId]?.name}`);
    } catch {
      toast.error("Không chốt được hóa đơn");
    }
  }

  async function handlePay() {
    if (!selectedBill) return;
    const amount = parseFloat(payInput.replace(/[^\d.]/g, ""));
    if (!amount || amount <= 0) { toast.error("Nhập số tiền hợp lệ"); return; }
    const remaining = selectedBill.totalAmount - selectedBill.paidAmount;
    if (amount > remaining + 0.5) { toast.error(`Vượt quá số tiền cần thu (${formatVND(remaining)})`); return; }
    try {
      await actions.recordPayment(selectedBill.id, amount, payMethod, payNote || undefined);
      setPayInput("");
      setPayNote("");
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
    toast.success(`Đã xuất hóa đơn ${room.name}`);
  }

  function handleExportAll() {
    const inputs = occupiedRooms
      .filter((r) => billMap[r.id])
      .map((r) => ({ room: r, bill: billMap[r.id]!, month, year, settings, invoiceSettings: state.rental.invoiceSettings }));
    if (inputs.length === 0) { toast.error("Chưa có hóa đơn nào để xuất"); return; }
    exportAllInvoices(inputs);
    toast.success(`Đã xuất ${inputs.length} hóa đơn PDF`);
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

  /* ─── render ────────────────────────────────────────────── */

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <div className="space-y-5">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevMonth} className="rounded-lg border border-border p-1.5 hover:bg-muted/40 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-32 text-center text-base font-semibold">
            Tháng {String(month).padStart(2, "0")}/{year}
            {isCurrentMonth && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-normal text-blue-700">Hiện tại</span>}
          </span>
          <button type="button" onClick={nextMonth} disabled={isCurrentMonth} className="rounded-lg border border-border p-1.5 hover:bg-muted/40 transition-colors disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveReadings}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lưu chỉ số
          </button>
          <button
            type="button"
            onClick={handleCreateDrafts}
            disabled={drafting}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Tạo hóa đơn nháp
          </button>
          <button
            type="button"
            onClick={handleConfirmAll}
            disabled={confirming || draftCount === 0}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Chốt tất cả {draftCount > 0 && `(${draftCount})`}
          </button>
          <button
            type="button"
            onClick={handleExportAll}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất tất cả PDF
          </button>
        </div>
      </div>

      {/* ── KPI summary ── */}
      {Object.keys(billMap).length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Tổng hóa đơn" value={formatVND(totalBilled)} />
          <SummaryCard label="Đã thu" value={formatVND(totalPaid)} accent="emerald" />
          <SummaryCard label="Còn lại" value={formatVND(Math.max(0, totalBilled - totalPaid))} accent="rose" />
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
              const reading = readingMap[room.id];
              const row     = getRow(room.id);
              const displayStatus = getDisplayStatus(room, bill, !!reading, cycleId);
              const cfg     = STATUS_CFG[displayStatus];
              const ground  = isT1(room);
              const isDirty = !!rows[room.id];

              return (
                <tr key={room.id} className={`bg-card transition-colors ${room.occupied ? "hover:bg-muted/10" : "opacity-50"}`}>
                  <td className="px-4 py-3 font-medium">{room.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{room.tenant || <span className="italic opacity-50">Trống</span>}</td>

                  {/* Meter inputs */}
                  <td className="px-4 py-2 text-center">
                    {ground ? (
                      <span className="text-xs text-muted-foreground italic">T1 — tổng</span>
                    ) : (
                      <input
                        ref={(el) => { inputRefs.current[`${room.id}-start`] = el; }}
                        type="number"
                        value={row.start}
                        onChange={(e) => setRows((p) => ({ ...p, [room.id]: { ...getRow(room.id), start: e.target.value } }))}
                        disabled={!room.occupied}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                        placeholder="0"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {ground ? (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    ) : (
                      <input
                        ref={(el) => { inputRefs.current[`${room.id}-end`] = el; }}
                        type="number"
                        value={row.end}
                        onChange={(e) => setRows((p) => ({ ...p, [room.id]: { ...getRow(room.id), end: e.target.value } }))}
                        disabled={!room.occupied}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                        placeholder="0"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      value={row.water}
                      onChange={(e) => setRows((p) => ({ ...p, [room.id]: { ...getRow(room.id), water: e.target.value } }))}
                      disabled={!room.occupied}
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40"
                      placeholder="0"
                    />
                  </td>

                  {/* Bill total */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {bill ? (
                      <span className="font-semibold">{formatVND(bill.totalAmount)}</span>
                    ) : isDirty ? (
                      <span className="text-xs text-muted-foreground italic">Lưu để tính</span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                  </td>

                  {/* Row actions */}
                  <td className="px-4 py-3">
                    {room.occupied && bill ? (
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          label="Chốt"
                          onClick={() => handleConfirmSingle(room.id)}
                          cls="text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:pointer-events-none"
                          disabled={bill.status !== "draft"}
                        />
                        <ActionBtn
                          icon={<DollarSign className="h-3.5 w-3.5" />}
                          label="Thu tiền"
                          onClick={() => { setDrawerMode("pay"); setSelectedId(room.id); setPayInput(""); setPayNote(""); }}
                          cls="text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:pointer-events-none"
                          disabled={bill.status === "paid"}
                        />
                        <ActionBtn
                          icon={<FileText className="h-3.5 w-3.5" />}
                          label="Chi tiết"
                          onClick={() => { setDrawerMode("detail"); setSelectedId(room.id); }}
                          cls="text-slate-600 hover:bg-slate-100"
                        />
                        <ActionBtn
                          icon={<Download className="h-3.5 w-3.5" />}
                          label="PDF"
                          onClick={() => handleExportSingle(room.id)}
                          cls="text-slate-600 hover:bg-slate-100"
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
        <WorkflowStep n={1} title="Nhập chỉ số" desc="Điền số đầu/cuối vào bảng, bấm Lưu chỉ số" />
        <WorkflowStep n={2} title="Tạo hóa đơn nháp" desc="Bấm Tạo hóa đơn nháp để tính toán chi phí" />
        <WorkflowStep n={3} title="Chốt hóa đơn" desc='Kiểm tra xong bấm "Chốt tất cả"' />
        <WorkflowStep n={4} title="Thu tiền" desc='Bấm "Thu tiền" ở từng hàng khi khách thanh toán' />
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

              {/* Bill breakdown */}
              {selectedBill ? (
                <div className="space-y-5">
                  <BillBreakdown bill={selectedBill} settings={state.rental.settings} />

                  {/* Payment history */}
                  {state.rental.payments.filter((p) => p.billId === selectedBill.id).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lịch sử thanh toán</p>
                      <div className="space-y-1">
                        {state.rental.payments
                          .filter((p) => p.billId === selectedBill.id)
                          .map((p) => (
                            <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{new Date(p.paidAt).toLocaleDateString("vi-VN")}</span>
                                {p.note && <span className="text-muted-foreground">· {p.note}</span>}
                              </div>
                              <span className="font-medium text-emerald-600">+{formatVND(p.amount)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Pay form */}
                  {["confirmed", "partial_paid"].includes(selectedBill.status) && (
                    <div
                      id="pay-form-section"
                      className={`rounded-xl border p-4 space-y-3 ${drawerMode === "pay" ? "border-emerald-300 bg-emerald-50/40" : "border-border"}`}
                    >
                      <p className="text-sm font-semibold">Thu tiền</p>
                      <div className="text-sm text-muted-foreground flex justify-between">
                        <span>Còn thiếu</span>
                        <span className="font-semibold text-rose-600">
                          {formatVND(Math.max(0, selectedBill.totalAmount - selectedBill.paidAmount))}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={payInput}
                        onChange={(e) => setPayInput(e.target.value)}
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
                        <button
                          type="button"
                          onClick={handlePay}
                          className="flex-1 rounded-lg bg-foreground py-2 text-sm font-medium text-background hover:opacity-90"
                        >
                          Thu tiền
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedId(null)}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted/40"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bank info + export */}
                  {settings.bankAccount && (
                    <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                      <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Thông tin chuyển khoản</p>
                      {settings.bankName    && <p>🏦 {settings.bankName}</p>}
                      {settings.bankAccount && <p>STK: <span className="font-mono font-semibold">{settings.bankAccount}</span></p>}
                      {settings.bankHolder  && <p>Chủ TK: {settings.bankHolder}</p>}
                      {settings.bankNoteTemplate && (
                        <p className="text-muted-foreground">
                          Nội dung CK: {settings.bankNoteTemplate
                            .replace("{room}", selectedRoom.name)
                            .replace("{month}", String(month).padStart(2, "0"))
                            .replace("{year}", String(year))}
                        </p>
                      )}
                      {settings.bankQrUrl && (
                        <img src={settings.bankQrUrl} alt="QR thanh toán" className="h-32 w-32 rounded-lg object-cover" />
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => { handleExportSingle(selectedRoom.id); }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted/40"
                  >
                    <Download className="h-4 w-4" />
                    Xuất hóa đơn PDF
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                  <p className="text-sm text-muted-foreground">
                    Chưa có hóa đơn cho phòng này tháng {month}/{year}.
                    <br />Lưu số đo rồi bấm <strong>Tạo hóa đơn nháp</strong>.
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

function ActionBtn({ icon, label, onClick, cls, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; cls: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      disabled={disabled}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${cls}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "rose" }) {
  const color = accent === "emerald" ? "text-emerald-600" : accent === "rose" ? "text-rose-600" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function BillBreakdown({ bill, settings }: { bill: RentalRoomBill; settings: ReturnType<typeof useFinance>["rental"]["settings"] }) {
  const rows = [
    { label: "Tiền thuê",    amount: bill.rentAmount },
    { label: "Điện",         amount: bill.electricityAmount },
    { label: "Nước",         amount: bill.waterAmount },
    { label: "Wifi",         amount: bill.wifiAmount },
    { label: "Vệ sinh",      amount: bill.cleaningAmount },
    { label: settings.otherName || "Phụ phí", amount: bill.otherAmount },
  ].filter((r) => r.amount > 0);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-0">
              <td className="px-4 py-2 text-muted-foreground">{r.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatVND(r.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/30">
            <td className="px-4 py-2.5 font-semibold">Tổng cộng</td>
            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatVND(bill.totalAmount)}</td>
          </tr>
          <tr className="border-t border-border">
            <td className="px-4 py-2 text-emerald-600">Đã thanh toán</td>
            <td className="px-4 py-2 text-right text-emerald-600 tabular-nums">{formatVND(bill.paidAmount)}</td>
          </tr>
          <tr className="border-t border-border">
            <td className="px-4 py-2 font-semibold text-rose-600">Còn lại</td>
            <td className="px-4 py-2 text-right font-semibold text-rose-600 tabular-nums">
              {formatVND(Math.max(0, bill.totalAmount - bill.paidAmount))}
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">{n}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

