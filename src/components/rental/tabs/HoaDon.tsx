import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, CheckCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { RentalRoomBill } from "@/lib/finance-types";
import { formatVND } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type BillStatus = "unpaid" | "partial" | "paid" | "overdue";

function getStatus(bill: RentalRoomBill, cycleId: string): BillStatus {
  const [y, m] = cycleId.split("-").map(Number);
  const now = new Date();
  const isPast = y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1);
  if (bill.paidAmount >= bill.totalAmount) return "paid";
  if (bill.paidAmount > 0) return "partial";
  if (isPast) return "overdue";
  return "unpaid";
}

const STATUS_CONFIG: Record<BillStatus, { label: string; className: string }> = {
  paid: { label: "Đã thu", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial: { label: "Thu một phần", className: "bg-blue-50 text-blue-700 border-blue-200" },
  unpaid: { label: "Chưa thu", className: "bg-slate-100 text-slate-500 border-slate-200" },
  overdue: { label: "Quá hạn", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function HoaDon() {
  const state = useFinance();
  const actions = useFinanceActions();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState<BillStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState<RentalRoomBill | null>(null);

  const cycleId = `${year}-${String(month).padStart(2, "0")}`;
  const roomMap = Object.fromEntries(state.rental.rooms.map((r) => [r.id, r]));

  const bills = state.rental.roomBills.filter((b) => b.cycleId === cycleId);

  const filtered = bills.filter((b) => {
    const room = roomMap[b.roomId];
    const name = room?.name ?? "";
    const status = getStatus(b, cycleId);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const handleGenerate = () => {
    actions.generateBillingCycle(month, year);
    toast.success(`Đã chốt kỳ ${month}/${year}`);
  };

  const totalRevenue = bills.reduce((s, b) => s + b.totalAmount, 0);
  const totalCollected = bills.reduce((s, b) => s + b.paidAmount, 0);
  const totalDebt = Math.max(totalRevenue - totalCollected, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted/40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-32 text-center text-sm font-semibold">
            Tháng {month}/{year}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted/40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm phòng..."
              className="h-8 w-40 rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BillStatus | "all")}
            className="h-8 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="all">Tất cả</option>
            <option value="unpaid">Chưa thu</option>
            <option value="partial">Thu một phần</option>
            <option value="paid">Đã thu</option>
            <option value="overdue">Quá hạn</option>
          </select>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-semibold text-background"
          >
            Chốt kỳ
          </button>
        </div>
      </div>

      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="text-xs text-muted-foreground">Tổng phải thu</div>
            <div className="mt-1 text-base font-bold tabular-nums">{formatVND(totalRevenue)}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700">Đã thu</div>
            <div className="mt-1 text-base font-bold tabular-nums text-emerald-700">{formatVND(totalCollected)}</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <div className="text-xs text-rose-700">Còn nợ</div>
            <div className="mt-1 text-base font-bold tabular-nums text-rose-700">{formatVND(totalDebt)}</div>
          </div>
        </div>
      )}

      {bills.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <div className="text-sm font-medium text-foreground mb-1">Chưa có hóa đơn tháng này</div>
          <div className="text-xs text-muted-foreground mb-4">Nhập số điện nước trong tab Ghi số, sau đó bấm "Chốt kỳ" để tạo hóa đơn</div>
          <button
            type="button"
            onClick={handleGenerate}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            Chốt kỳ tháng {month}/{year}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phòng</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng tiền</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đã thu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Còn thiếu</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Không có hóa đơn phù hợp
                  </td>
                </tr>
              )}
              {filtered.map((bill) => {
                const room = roomMap[bill.roomId];
                const remaining = Math.max(bill.totalAmount - bill.paidAmount, 0);
                const status = getStatus(bill, cycleId);
                const cfg = STATUS_CONFIG[status];
                return (
                  <tr key={bill.id} className="bg-card hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {room?.name ?? bill.roomId}
                      {room?.tenant && <div className="text-xs font-normal text-muted-foreground">{room.tenant}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatVND(bill.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 tabular-nums">{formatVND(bill.paidAmount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {remaining > 0 ? (
                        <span className="font-semibold text-rose-600">{formatVND(remaining)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedBill(bill)}
                          className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-muted/40"
                          title="Xem hóa đơn"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {status !== "paid" && (
                          <button
                            type="button"
                            onClick={() => {
                              actions.markRoomBillPaid(bill.id, bill.totalAmount);
                              toast.success(`${room?.name ?? ""}: Đã thu đủ`);
                            }}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                            title="Đánh dấu đã thu"
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InvoiceModal
        bill={selectedBill}
        roomName={selectedBill ? (roomMap[selectedBill.roomId]?.name ?? "") : ""}
        cycleId={cycleId}
        onClose={() => setSelectedBill(null)}
        onMarkPaid={(id) => {
          if (selectedBill) {
            actions.markRoomBillPaid(id, selectedBill.totalAmount);
            toast.success("Đã thu đủ tiền");
            setSelectedBill(null);
          }
        }}
      />
    </div>
  );
}

function InvoiceModal({
  bill,
  roomName,
  cycleId,
  onClose,
  onMarkPaid,
}: {
  bill: RentalRoomBill | null;
  roomName: string;
  cycleId: string;
  onClose: () => void;
  onMarkPaid: (id: string) => void;
}) {
  if (!bill) return null;
  const remaining = Math.max(bill.totalAmount - bill.paidAmount, 0);
  const [m, y] = cycleId.split("-");

  return (
    <Dialog open={!!bill} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hóa đơn — {roomName}</DialogTitle>
          <p className="text-xs text-muted-foreground">Tháng {Number(m)}/{y}</p>
        </DialogHeader>
        <div className="space-y-2 text-sm mt-2">
          <Row label="Tiền thuê" value={formatVND(bill.rentAmount)} />
          <Row label="Tiền điện" value={formatVND(bill.electricityAmount)} />
          <Row label="Tiền nước" value={formatVND(bill.waterAmount)} />
          <Row label="Wifi" value={formatVND(bill.wifiAmount)} />
          <Row label="Vệ sinh" value={formatVND(bill.cleaningAmount)} />
          {bill.otherAmount > 0 && <Row label="Phụ phí khác" value={formatVND(bill.otherAmount)} />}
          <div className="border-t border-border pt-2">
            <Row label="Tổng cộng" value={formatVND(bill.totalAmount)} bold />
          </div>
          <Row label="Đã thu" value={formatVND(bill.paidAmount)} />
          {remaining > 0 && <Row label="Còn thiếu" value={formatVND(remaining)} bold className="text-rose-600" />}
        </div>
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => onMarkPaid(bill.id)}
            className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Đánh dấu đã thu đủ
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  bold,
  className = "",
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""} ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
