import { useState } from "react";
import { Plus, X, Check, Trash2, ChevronRight, Home, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { RentalRoom } from "@/lib/finance-types";
import { formatVND } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

type Status = "occupied" | "empty" | "debt";

function getRoomStatus(room: RentalRoom, hasDebt: boolean): Status {
  if (!room.occupied) return "empty";
  if (hasDebt) return "debt";
  return "occupied";
}

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  occupied: { label: "Đang thuê", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  empty: { label: "Trống", className: "bg-slate-100 text-slate-500 border-slate-200" },
  debt: { label: "Nợ tiền", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function Phong() {
  const state = useFinance();
  const actions = useFinanceActions();
  const [selectedRoom, setSelectedRoom] = useState<RentalRoom | null>(null);
  const [adding, setAdding] = useState(false);

  const now = new Date();
  const cycleId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const debtMap = Object.fromEntries(
    state.rental.roomBills
      .filter((b) => b.cycleId === cycleId && b.paidAmount < b.totalAmount)
      .map((b) => [b.roomId, b.totalAmount - b.paidAmount]),
  );

  const electricityMap = Object.fromEntries(
    state.rental.electricityReadings
      .filter((r) => r.cycleId === cycleId)
      .map((r) => [r.roomId, r]),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {state.rental.rooms.length} phòng · {state.rental.rooms.filter((r) => r.occupied).length} đang thuê
        </p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm phòng
        </button>
      </div>

      {adding && (
        <AddRoomForm
          onCancel={() => setAdding(false)}
          onCreate={(name, rent) => {
            actions.addRoom(name, rent);
            setAdding(false);
            toast.success(`Đã thêm phòng ${name}`);
          }}
        />
      )}

      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phòng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Khách thuê</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Giá thuê</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Điện T.này</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nợ</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.rental.rooms.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Chưa có phòng nào — thêm phòng đầu tiên
                </td>
              </tr>
            )}
            {state.rental.rooms.map((room) => {
              const debt = debtMap[room.id] ?? 0;
              const status = getRoomStatus(room, debt > 0);
              const cfg = STATUS_CONFIG[status];
              const elec = electricityMap[room.id];
              return (
                <tr
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className="cursor-pointer bg-card hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Home className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-foreground">{room.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {room.tenant || <span className="italic text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                    {formatVND(room.rent)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                    {elec ? `${elec.consumptionKwh} kWh` : <span className="italic text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {debt > 0 ? (
                      <span className="font-semibold text-rose-600">{formatVND(debt)}</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <RoomDrawer
        room={selectedRoom}
        cycleId={cycleId}
        onClose={() => setSelectedRoom(null)}
        debt={selectedRoom ? (debtMap[selectedRoom.id] ?? 0) : 0}
      />
    </div>
  );
}

function RoomDrawer({
  room,
  cycleId,
  onClose,
  debt,
}: {
  room: RentalRoom | null;
  cycleId: string;
  onClose: () => void;
  debt: number;
}) {
  const state = useFinance();
  const actions = useFinanceActions();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [rent, setRent] = useState("");
  const [tenant, setTenant] = useState("");

  const bill = room ? state.rental.roomBills.find((b) => b.roomId === room.id && b.cycleId === cycleId) : null;

  const handleOpen = (r: RentalRoom | null) => {
    if (r) {
      setName(r.name);
      setRent(String(r.rent));
      setTenant(r.tenant ?? "");
      setEditing(false);
    }
  };

  return (
    <Sheet
      open={!!room}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        className="w-full max-w-md overflow-y-auto"
        onOpenAutoFocus={() => {
          if (room) handleOpen(room);
        }}
      >
        {room && (
          <>
            <SheetHeader className="mb-6">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-bold">{room.name}</SheetTitle>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" /> Sửa
                  </button>
                )}
              </div>
            </SheetHeader>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tên phòng</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Giá thuê / tháng</label>
                  <input
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    className="num mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tên khách thuê</label>
                  <input
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                    placeholder="Tuỳ chọn"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      actions.updateRoom(room.id, {
                        name,
                        rent: parseFloat(rent) || room.rent,
                        tenant: tenant.trim() || undefined,
                      });
                      setEditing(false);
                      toast.success("Đã cập nhật phòng");
                    }}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground text-sm font-semibold text-background"
                  >
                    <Check className="h-4 w-4" /> Lưu
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Xoá ${room.name}?`)) {
                      actions.removeRoom(room.id);
                      onClose();
                      toast.success(`Đã xoá ${room.name}`);
                    }
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-4 w-4" /> Xoá phòng
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <InfoGrid
                  rows={[
                    { label: "Khách thuê", value: room.tenant || "—" },
                    { label: "Giá thuê", value: formatVND(room.rent) },
                    {
                      label: "Trạng thái",
                      value: room.occupied ? "Đang thuê" : "Trống",
                    },
                  ]}
                />

                {bill && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Hóa đơn tháng này
                    </h4>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                      <Row label="Tiền thuê" value={formatVND(bill.rentAmount)} />
                      <Row label="Tiền điện" value={formatVND(bill.electricityAmount)} />
                      <Row label="Nước" value={formatVND(bill.waterAmount)} />
                      <Row label="Wifi" value={formatVND(bill.wifiAmount)} />
                      <Row label="Vệ sinh" value={formatVND(bill.cleaningAmount)} />
                      <div className="border-t border-border pt-2 font-bold">
                        <Row label="Tổng" value={formatVND(bill.totalAmount)} />
                      </div>
                      <Row label="Đã thu" value={formatVND(bill.paidAmount)} />
                      {debt > 0 && (
                        <Row label="Còn thiếu" value={formatVND(debt)} className="text-rose-600 font-semibold" />
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác</h4>
                  <button
                    type="button"
                    onClick={() => {
                      actions.setRoomOccupied(room.id, !room.occupied);
                      toast.success(room.occupied ? `${room.name}: Phòng trống` : `${room.name}: Đã có khách`);
                      onClose();
                    }}
                    className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30"
                  >
                    {room.occupied ? "Đánh dấu phòng trống" : "Đánh dấu đã thuê"}
                  </button>
                  {bill && debt > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        actions.markRoomBillPaid(bill.id, bill.totalAmount);
                        toast.success(`${room.name}: Đã thu đủ tiền`);
                        onClose();
                      }}
                      className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Đánh dấu đã thu đủ
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-medium text-foreground">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}

function AddRoomForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (name: string, rent: number) => void;
}) {
  const [name, setName] = useState("");
  const [rent, setRent] = useState("");
  const [tenant, setTenant] = useState("");
  const valid = name.trim() && parseFloat(rent) > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Thêm phòng mới</h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tên phòng *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Phòng 302"
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Giá thuê *</label>
          <input
            type="number"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            placeholder="VD: 4000000"
            className="num mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Khách thuê</label>
          <input
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="Tuỳ chọn"
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium"
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onCreate(name.trim(), parseFloat(rent))}
          className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          Thêm phòng
        </button>
      </div>
    </div>
  );
}
