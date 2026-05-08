import { useEffect, useMemo, useState } from "react";
import { Plus, X, Check, ChevronRight, Home } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import { useTenant } from "@/hooks/useTenant";
import { roomService } from "@/services/room.service";
import { depositService, type RentalDeposit } from "@/services/deposit.service";
import { occupancyService, type RentalOccupancy } from "@/services/occupancy.service";
import type { Tenant } from "@/services/tenant.service";
import type { RentalRoom, RentalRoomBill } from "@/lib/finance-types";
import { formatMoney } from "@/utils/format";
import { formatMoneyInput, parseMoneyInput, sanitizeDigitsInput } from "@/utils/number-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Status = "occupied" | "empty" | "debt";

function isRoomOccupied(room: RentalRoom): boolean {
  return Boolean(room.tenantInfo?.id || room.tenant_id);
}

function getRoomStatus(room: RentalRoom, hasDebt: boolean): Status {
  if (!isRoomOccupied(room)) return "empty";
  if (hasDebt) return "debt";
  return "occupied";
}

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  occupied: { label: "Đang thuê", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  empty: { label: "Trống", className: "bg-slate-100 text-slate-500 border-slate-200" },
  debt: { label: "Nợ tiền", className: "bg-rose-50 text-rose-700 border-rose-200" },
};


function isDigitsOnly(value: string): boolean {
  return /^\d*$/.test(value);
}

function parseNonNegativeNumber(value: string): number | null {
  if (!isDigitsOnly(value)) return null;
  if (value === "") return null;
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function getDepositStatusLabel(status: RentalDeposit["status"]): string {
  if (status === "active") return "Đang giữ";
  if (status === "pending_settlement") return "Chờ quyết toán";
  return "Đã quyết toán";
}

function detectFloorFromRoomName(name: string): number | null {
  const normalized = name.trim().toLowerCase();
  const tangMatch = normalized.match(/t[ầa]ng\s*(\d+)/i);
  if (tangMatch) {
    const floor = Number.parseInt(tangMatch[1], 10);
    return Number.isNaN(floor) ? null : floor;
  }

  const numberMatch = normalized.match(/\d+/);
  if (!numberMatch || numberMatch[0].length < 3) return null;

  const firstDigit = Number.parseInt(numberMatch[0][0], 10);
  return Number.isNaN(firstDigit) ? null : firstDigit;
}

export function Phong({ onOpenBillDetail }: { onOpenBillDetail?: (roomId: string, cycleId: string) => void }) {
  const state = useFinance();
  const actions = useFinanceActions();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { createAndAssign } = useTenant(async () => {
    await actions.refetch();
  });
  const [activeOccupancyByRoomId, setActiveOccupancyByRoomId] = useState<Record<string, RentalOccupancy>>({});

  useEffect(() => {
    const loadActiveOccupancies = async () => {
      try {
        setActiveOccupancyByRoomId(await occupancyService.getActiveOccupancyByRoomIds(state.rental.rooms.map((r) => r.id)));
      } catch (error) {
        console.error("[rooms] load active occupancies failed", error);
        setActiveOccupancyByRoomId({});
      }
    };
    void loadActiveOccupancies();
  }, [state.rental.rooms]);

  const now = new Date();
  const cycleId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentBillByRoomId: Record<string, RentalRoomBill | null> = Object.fromEntries(
    state.rental.rooms.map((room) => {
      const activeOccupancy = activeOccupancyByRoomId[room.id];
      const bill = activeOccupancy
        ? state.rental.roomBills.find((b) => b.cycleId === cycleId && b.occupancyId === activeOccupancy.id)
        : undefined;
      return [room.id, bill ?? null];
    }),
  );

  const debtMap = Object.fromEntries(
    Object.entries(currentBillByRoomId)
      .filter(([, bill]) => bill && bill.paidAmount < bill.totalAmount)
      .map(([roomId, bill]) => [roomId, bill!.totalAmount - bill!.paidAmount]),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {state.rental.rooms.length} phòng · {state.rental.rooms.filter((r) => isRoomOccupied(r)).length} đang thuê
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
          onCreate={async ({ name, rent, floor, addTenantNow, tenantFullName, tenantPhone, tenantAddress, depositAmount, depositNote }) => {
            let createdRoomId: string | null = null;
            try {
              const room = await actions.addRoom(name, rent, floor);
              createdRoomId = room.id;

              if (addTenantNow) {
                const userId = actions.getUserId();
                if (!userId) throw new Error("Không tìm thấy người dùng đăng nhập");

                await createAndAssign(room.id, {
                  userId,
                  fullName: tenantFullName,
                  phone: tenantPhone,
                  address: tenantAddress,
                }, {
                  amount: depositAmount,
                  note: depositNote,
                });
              }

              await actions.refetch();
              setAdding(false);
              toast.success(`Đã thêm phòng ${name}`);
            } catch (error) {
              console.error("[add-room] failed", error);

              if (addTenantNow && createdRoomId) {
                try {
                  await roomService.deleteRoom(createdRoomId);
                } catch (rollbackError) {
                  console.error("[add-room] rollback failed", rollbackError);
                }
                await actions.refetch();
              }

              toast.error(addTenantNow ? "Không thể thêm phòng và người thuê. Đã hoàn tác phòng vừa tạo." : "Không thể thêm phòng. Vui lòng thử lại.");
            }
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
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Công nợ</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.rental.rooms.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Chưa có phòng nào — thêm phòng đầu tiên
                </td>
              </tr>
            )}
            {state.rental.rooms.map((room) => {
              const debt = debtMap[room.id] ?? 0;
              const status = getRoomStatus(room, debt > 0);
              const cfg = STATUS_CONFIG[status];
              const bill = currentBillByRoomId[room.id];
              const occupied = isRoomOccupied(room);
              return (
                <tr
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className="cursor-pointer bg-card transition-all hover:bg-muted/20 hover:shadow-[inset_0_-1px_0_0_rgba(99,102,241,0.45)]"
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
                    {room.tenantInfo ? (
                      <div className="leading-tight">
                        <div className="font-medium text-foreground">{room.tenantInfo.fullName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{room.tenantInfo.phone || "—"}</div>
                      </div>
                    ) : (
                      <span className="italic text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                    {formatMoney(room.rent)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {!occupied || !bill ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : debt > 0 ? (
                      <span className="font-semibold text-rose-600">{formatMoney(debt)}</span>
                    ) : (
                      <span className="font-semibold text-emerald-600">Không nợ</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
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

      <RoomModal
        roomId={selectedRoomId}
        cycleId={cycleId}
        onClose={() => setSelectedRoomId(null)}
        debtMap={debtMap}
        activeOccupancyByRoomId={activeOccupancyByRoomId}
        onOpenBillDetail={onOpenBillDetail}
      />
    </div>
  );
}

function RoomModal({
  roomId,
  cycleId,
  onClose,
  debtMap,
  activeOccupancyByRoomId,
  onOpenBillDetail,
}: {
  roomId: string | null;
  cycleId: string;
  onClose: () => void;
  debtMap: Record<string, number>;
  activeOccupancyByRoomId: Record<string, RentalOccupancy>;
  onOpenBillDetail?: (roomId: string, cycleId: string) => void;
}) {
  const state = useFinance();
  const actions = useFinanceActions();
  const { createAndAssign, update, removeFromRoom, assignExisting, listTenants } = useTenant(async () => {
    await actions.refetch();
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [rent, setRent] = useState("");
  const [tenantMode, setTenantMode] = useState<"none" | "edit" | "change" | "add">("none");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantAddress, setTenantAddress] = useState("");
  const [addTenantMode, setAddTenantMode] = useState<"new" | "existing">("new");
  const [existingTenants, setExistingTenants] = useState<Tenant[]>([]);
  const [blockedTenantIds, setBlockedTenantIds] = useState<Set<string>>(new Set());
  const [blockedTenantReason, setBlockedTenantReason] = useState<Record<string, string>>({});
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [depositsByRoomId, setDepositsByRoomId] = useState<Record<string, RentalDeposit>>({});
  const [tenantDepositAmount, setTenantDepositAmount] = useState("");
  const [tenantDepositNote, setTenantDepositNote] = useState("");
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);

  useEffect(() => {
    const loadDeposits = async () => {
      try {
        const rooms = state.rental.rooms;
        const activeOccupancies = await occupancyService.listActiveOccupanciesByRoomIds(rooms.map((r) => r.id));
        const deposits = await depositService.listCurrentActiveDepositsByOccupancyIds(
          activeOccupancies.map((occupancy) => occupancy.id),
        );
        const activeOccupancyById = new Map(activeOccupancies.map((occupancy) => [occupancy.id, occupancy]));
        const byRoom = deposits.reduce<Record<string, RentalDeposit>>((acc, item) => {
          if (!item.occupancy_id) return acc;

          const activeOccupancy = activeOccupancyById.get(item.occupancy_id);
          if (activeOccupancy && !acc[activeOccupancy.room_id]) {
            acc[activeOccupancy.room_id] = item;
          }

          return acc;
        }, {});
        setDepositsByRoomId(byRoom);
      } catch (error) {
        console.error("[room-modal] load deposit failed", error);
      }
    };
    void loadDeposits();
  }, [state.rental.rooms]);

  const room = roomId ? state.rental.rooms.find((r) => r.id === roomId) ?? null : null;
  const debt = room ? (debtMap[room.id] ?? 0) : 0;
  const activeOccupancy = room ? activeOccupancyByRoomId[room.id] : undefined;
  const bill = activeOccupancy
    ? state.rental.roomBills.find((b) => b.occupancyId === activeOccupancy.id && b.cycleId === cycleId) ?? null
    : null;
  const canChangeTenant = !bill || bill.paidAmount >= bill.totalAmount;
  const roomDeposit = room ? depositsByRoomId[room.id] : undefined;
  const hasActiveDeposit = roomDeposit?.status === "active";
  const canMutateTenant = canChangeTenant;

  const handleOpen = (r: RentalRoom | null) => {
    if (r) {
      setName(r.name);
      setRent(formatMoneyInput(String(r.rent)));
      setEditing(false);
      setTenantMode("none");
      setTenantName(r.tenantInfo?.fullName || "");
      setTenantPhone(r.tenantInfo?.phone || "");
      setTenantAddress(r.tenantInfo?.address || "");
      setSelectedTenantId("");
    }
  };

  const handleCheckout = async () => {
    if (!room) return;
    if (!canMutateTenant) {
      toast.error("Chỉ trả phòng khi hóa đơn tháng này đã thanh toán đủ");
      return;
    }
    try {
      await removeFromRoom(room.id);
      setTenantName("");
      setTenantPhone("");
      setTenantAddress("");
      setCheckoutConfirmOpen(false);
      toast.success(hasActiveDeposit ? "Đã trả phòng, tiền cọc chuyển sang chờ quyết toán" : "Đã trả phòng");
    } catch {
      toast.error("Không thể trả phòng");
    }
  };

  const loadTenants = async () => {
    const userId = actions.getUserId();
    if (!userId) throw new Error("Không tìm thấy người dùng đăng nhập");
    const tenants = await listTenants(userId);
    setExistingTenants(tenants);
    const activeOccupancyById = new Map(Object.values(activeOccupancyByRoomId).map((occupancy) => [occupancy.id, occupancy]));
    const blocked = new Set<string>();
    const blockedReason: Record<string, string> = {};
    const roomNameByRoomId = new Map(state.rental.rooms.map((r) => [r.id, r.name]));
    state.rental.roomBills.forEach((b) => {
      if (b.status === "cancelled") return;
      if (b.paidAmount >= b.totalAmount) return;
      if (!b.occupancyId) return;

      const activeOccupancy = activeOccupancyById.get(b.occupancyId);
      if (!activeOccupancy) return;

      blocked.add(activeOccupancy.tenant_id);
      blockedReason[activeOccupancy.tenant_id] = roomNameByRoomId.get(activeOccupancy.room_id)
        ? `Đang nợ bill phòng ${roomNameByRoomId.get(activeOccupancy.room_id)}`
        : "Đang nợ bill";
    });
    setBlockedTenantIds(blocked);
    setBlockedTenantReason(blockedReason);
    return tenants;
  };

  useEffect(() => {
    if (!room) return;
    setTenantName(room.tenantInfo?.fullName || "");
    setTenantPhone(room.tenantInfo?.phone || "");
    setTenantAddress(room.tenantInfo?.address || "");
    setAddTenantMode("new");
    setSelectedTenantId("");
    setTenantDepositAmount(room?.rent ? formatMoneyInput(String(room.rent)) : "");
    setTenantDepositNote("");
  }, [roomId, room?.tenantInfo?.id, room?.tenantInfo?.fullName, room?.tenantInfo?.phone, room?.tenantInfo?.address, room]);

  return (
    <Dialog
      open={!!roomId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto [&>button]:hidden"
        onOpenAutoFocus={() => {
          if (room) handleOpen(room);
        }}
      >
        {room && (
          <>
            <DialogHeader className="-mx-6 -mt-6 mb-2 sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-1 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2 text-sm">
                  <DialogTitle className="shrink-0 text-base font-semibold text-foreground">{room.name}</DialogTitle>
                  <span className="shrink-0 text-muted-foreground">•</span>
                  <span className="truncate text-muted-foreground">{room.tenantInfo?.fullName || "Trống"}</span>
                  <span className="shrink-0 text-muted-foreground">•</span>
                  <span className="truncate text-muted-foreground">{room.tenantInfo?.phone || "Chưa có SĐT"}</span>
                </div>
                <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </DialogHeader>

              <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div className="space-y-5">
                  <div className="text-sm space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin phòng</h4>
                    {editing ? (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground">Tên phòng</label>
                          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Giá thuê / tháng</label>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={rent} onChange={(e) => setRent(formatMoneyInput(e.target.value))} className="num mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditing(false); setName(room.name); setRent(formatMoneyInput(String(room.rent))); }} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium">Huỷ</button>
                          <button type="button" onClick={() => {
                            const trimmedName = name.trim();
                            if (!trimmedName) { toast.error("Tên phòng không được để trống"); return; }
                            const parsedRent = parseMoneyInput(rent);
                            if (parsedRent == null) { toast.error("Không được nhập số âm"); return; }
                            actions.updateRoom(room.id, { name: trimmedName, rent: parsedRent }); setEditing(false); toast.success("Đã cập nhật phòng"); }} className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background">Lưu</button>
                        </div>
                      </>
                    ) : <InfoGrid rows={[{ label: "Giá thuê", value: formatMoney(room.rent) }, { label: "Trạng thái", value: isRoomOccupied(room) ? "Đang thuê" : "Trống" }]} />}
                  </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Khách thuê</h4>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                    {(tenantMode === "edit" || tenantMode === "add") ? (
                      <div className="space-y-2">
                        {tenantMode === "add" && (
                          <div className="flex gap-2 rounded-lg border border-border p-1">
                            <button type="button" onClick={() => setAddTenantMode("new")} className={`flex-1 rounded-md py-1.5 text-xs font-medium ${addTenantMode === "new" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Tạo mới</button>
                            <button type="button" onClick={() => setAddTenantMode("existing")} className={`flex-1 rounded-md py-1.5 text-xs font-medium ${addTenantMode === "existing" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Chọn người thuê có sẵn</button>
                          </div>
                        )}
                        {tenantMode === "edit" || addTenantMode === "new" ? (
                          <>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Họ tên</label>
                              <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Họ tên" className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Số điện thoại</label>
                              <input type="text" inputMode="numeric" pattern="[0-9]*" value={tenantPhone} onChange={(e) => setTenantPhone(sanitizeDigitsInput(e.target.value))} placeholder="Số điện thoại" className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Địa chỉ</label>
                              <input value={tenantAddress} onChange={(e) => setTenantAddress(e.target.value)} placeholder="Địa chỉ" className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                            </div>
                          </>
                        ) : (
                          <>
                            <label className="mb-1 block text-xs text-muted-foreground">Người thuê có sẵn</label>
                            <select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
                              <option value="">Chọn người thuê</option>
                              {[...existingTenants]
                                .sort((a, b) => Number(blockedTenantIds.has(a.id)) - Number(blockedTenantIds.has(b.id)))
                                .map((tenant) => (
                                  <option key={tenant.id} value={tenant.id} disabled={blockedTenantIds.has(tenant.id)}>
                                    {tenant.full_name} — {blockedTenantIds.has(tenant.id) ? (blockedTenantReason[tenant.id] || "Đang nợ bill") : "Đã thanh toán"}
                                  </option>
                                ))}
                            </select>
                          </>
                        )}
                        {tenantMode === "add" && (
                          <div className="space-y-2">
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Tiền cọc *</label>
                              <input type="text" inputMode="numeric" pattern="[0-9]*" value={tenantDepositAmount} onChange={(e) => setTenantDepositAmount(formatMoneyInput(e.target.value))} className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                              <p className="mt-1 text-xs text-muted-foreground">Mặc định bằng 1 tháng tiền thuê, có thể chỉnh sửa.</p>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">Ghi chú tiền cọc</label>
                              <input value={tenantDepositNote} onChange={(e) => setTenantDepositNote(e.target.value)} className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setTenantMode("none")} className="flex-1 rounded-lg border border-border py-2 text-sm">Huỷ</button>
                          <button type="button" onClick={async () => {
                            try {
                              if (!room) return;
                              const trimmedTenantName = tenantName.trim();
                              const trimmedTenantPhone = tenantPhone.trim();
                              const trimmedTenantAddress = tenantAddress.trim();
                              if ((tenantMode === "edit" || (tenantMode === "add" && addTenantMode === "new")) && !trimmedTenantName) {
                                toast.error("Họ tên người thuê không được để trống");
                                return;
                              }
                              if (trimmedTenantPhone && !isDigitsOnly(trimmedTenantPhone)) {
                                toast.error("Số điện thoại chỉ được chứa chữ số");
                                return;
                              }
                              if (tenantMode === "edit" && room.tenantInfo) await update(room.tenantInfo.id, { fullName: trimmedTenantName, phone: trimmedTenantPhone || undefined, address: trimmedTenantAddress || undefined });
                              if (tenantMode === "add") {
                                const parsedDepositAmount = parseMoneyInput(tenantDepositAmount);
                                if (parsedDepositAmount == null) {
                                  toast.error("Không được nhập số âm");
                                  return;
                                }
                                if (addTenantMode === "existing") {
                                  if (!selectedTenantId || blockedTenantIds.has(selectedTenantId)) {
                                    toast.error("Người thuê đang nợ bill, không thể gán phòng");
                                    return;
                                  }
                                  await assignExisting(room.id, selectedTenantId, { amount: parsedDepositAmount, note: tenantDepositNote.trim() || undefined });
                                } else {
                                  const userId = actions.getUserId(); if (!userId) throw new Error("Không tìm thấy người dùng đăng nhập");
                                  await createAndAssign(room.id, { userId, fullName: trimmedTenantName, phone: trimmedTenantPhone || undefined, address: trimmedTenantAddress || undefined }, { amount: parsedDepositAmount, note: tenantDepositNote.trim() || undefined });
                                }
                              }
                              setTenantName(room.tenantInfo?.fullName || "");
                              setTenantPhone(room.tenantInfo?.phone || "");
                              setTenantAddress(room.tenantInfo?.address || "");
                              setTenantMode("none"); toast.success("Đã lưu người thuê");
                            } catch { toast.error("Không thể lưu thông tin người thuê"); }
                          }} className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background">Lưu</button>
                        </div>
                      </div>
                    ) : tenantMode === "change" ? (
                      <div className="space-y-2">
                        <select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
                          <option value="">Chọn người thuê có sẵn</option>
                          {existingTenants.filter((t) => t.id !== room?.tenantInfo?.id).map((tenant) => (
                            <option key={tenant.id} value={tenant.id} disabled={blockedTenantIds.has(tenant.id)}>
                              {tenant.full_name} {tenant.phone ? `- ${tenant.phone}` : ""} {blockedTenantIds.has(tenant.id) ? "(Còn nợ bill phòng khác)" : ""}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground">Người thuê đang nợ bill sẽ không thể chọn.</p>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">Tiền cọc *</label>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={tenantDepositAmount} onChange={(e) => setTenantDepositAmount(formatMoneyInput(e.target.value))} className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setTenantMode("none")} className="flex-1 rounded-lg border border-border py-2 text-sm">Huỷ</button>
                          <button type="button" onClick={async () => {
                            try {
                              if (!room || !selectedTenantId) return;
                              if (blockedTenantIds.has(selectedTenantId)) {
                                toast.error("Không thể đổi người thuê đang nợ bill");
                                return;
                              }
                              const parsedDepositAmount = parseMoneyInput(tenantDepositAmount);
                              if (parsedDepositAmount == null) {
                                toast.error("Không được nhập số âm");
                                return;
                              }
                              await assignExisting(room.id, selectedTenantId, { amount: parsedDepositAmount, note: tenantDepositNote.trim() || undefined });
                              setTenantName(room.tenantInfo?.fullName || "");
                              setTenantPhone(room.tenantInfo?.phone || "");
                              setTenantAddress(room.tenantInfo?.address || "");
                              setTenantMode("none");
                              toast.success("Đã đổi người thuê");
                            } catch { toast.error("Không thể đổi người thuê"); }
                          }} className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background">Lưu</button>
                        </div>
                      </div>
                    ) : room.tenantInfo ? (
                      <div className="space-y-2">
                        <Row label="Họ tên" value={room.tenantInfo.fullName} />
                        <Row label="Số điện thoại" value={room.tenantInfo.phone || "—"} />
                        <Row label="Địa chỉ" value={room.tenantInfo.address || "—"} />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Row label="Họ tên" value="—" />
                        <Row label="Số điện thoại" value="—" />
                        <Row label="Địa chỉ" value="—" />
                        <p className="pt-1 text-xs text-muted-foreground/80">Chưa có thông tin khách thuê cho phòng này.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiền cọc</h4>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm space-y-1.5">
                    <Row label="Đã cọc" value={roomDeposit ? formatMoney(roomDeposit.amount) : "—"} />
                    <Row label="Trạng thái" value={roomDeposit ? getDepositStatusLabel(roomDeposit.status) : "—"} />
                  </div>
                </div>

                <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Hóa đơn tháng {cycleId.split("-")[1]}/{cycleId.split("-")[0]}
                    </h4>
                  {bill ? (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Trạng thái</span>
                        <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium">
                          {bill.status === "draft" ? "Nháp" : bill.status === "paid" ? "Đã thu" : "Chưa thu"}
                        </span>
                      </div>
                      <Row label="Tiền thuê" value={formatMoney(bill.rentAmount)} />
                      <Row label="Tiền điện" value={formatMoney(bill.electricityAmount)} />
                      <Row label="Nước" value={formatMoney(bill.waterAmount)} />
                      <Row label="Wifi" value={formatMoney(bill.wifiAmount)} />
                      <Row label="Vệ sinh" value={formatMoney(bill.cleaningAmount)} />
                      <div className="border-t border-border pt-2 font-bold">
                        <Row label="Tổng" value={formatMoney(bill.totalAmount)} />
                      </div>
                      <Row label="Đã thu" value={formatMoney(bill.paidAmount)} />
                      {debt > 0 && (
                        <Row label="Còn thiếu" value={formatMoney(debt)} className="text-rose-600 font-semibold" />
                      )}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">Chưa có hóa đơn</p>}
                  </div>

                </div>

                <div className="space-y-2 lg:sticky lg:top-2 lg:self-start rounded-xl border border-border bg-card p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thao tác nhanh</h4>
                  <button type="button" onClick={() => setEditing(true)} className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background">Sửa phòng</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!bill) return;
                      onClose();
                      onOpenBillDetail?.(room.id, cycleId);
                    }}
                    disabled={!bill}
                    className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    Thông tin hoá đơn
                  </button>
                  {!bill && <p className="text-xs text-muted-foreground">Chưa có hóa đơn tháng này</p>}
                  {room.tenantInfo ? (
                    <>
                      <button type="button" onClick={() => setTenantMode("edit")} className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30">Sửa người thuê</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasActiveDeposit) {
                            setCheckoutConfirmOpen(true);
                            return;
                          }
                          if (!confirm("Trả phòng cho người thuê này?")) return;
                          void handleCheckout();
                        }}
                        disabled={!canMutateTenant}
                        className="w-full rounded-lg border border-destructive/40 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
                      >Trả phòng</button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!canMutateTenant) {
                            toast.error("Chỉ đổi người thuê khi hóa đơn tháng này đã thanh toán đủ");
                            return;
                          }
                          try {
                            await loadTenants();
                            setTenantMode("change");
                          } catch {
                            toast.error("Không tải được danh sách người thuê");
                          }
                        }}
                        disabled={!canMutateTenant}
                      className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30 disabled:opacity-50"
                      >Đổi người thuê</button>
                      {!canMutateTenant && (
                        <p className="text-xs text-muted-foreground">Chỉ thao tác người thuê khi hóa đơn tháng này đã thanh toán đủ</p>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await loadTenants();
                          setTenantMode("add");
                        } catch {
                          toast.error("Không tải được danh sách người thuê");
                        }
                      }}
                      className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30"
                    >Thêm người thuê</button>
                  )}
                </div>
              </div>

              <AlertDialog open={checkoutConfirmOpen} onOpenChange={setCheckoutConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Trả phòng và giữ cọc chờ quyết toán?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Người thuê này còn tiền cọc chưa quyết toán.</p>
                        <p>Bạn vẫn có thể trả phòng để giải phóng phòng.</p>
                        <p>Khoản cọc sẽ được chuyển sang danh sách chờ quyết toán và xử lý sau.</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Huỷ</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleCheckout()}>Trả phòng, giữ cọc chờ quyết toán</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </>
        )}
      </DialogContent>
    </Dialog>
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
  onCreate: (payload: {
    name: string;
    rent: number;
    floor: number | null;
    addTenantNow: boolean;
    tenantFullName: string;
    tenantPhone?: string;
    tenantAddress?: string;
    depositAmount: number;
    depositNote?: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [rent, setRent] = useState("");
  const [floor, setFloor] = useState("");
  const [isFloorManual, setIsFloorManual] = useState(false);
  const [addTenantNow, setAddTenantNow] = useState(false);
  const [tenantFullName, setTenantFullName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantAddress, setTenantAddress] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [isDepositManual, setIsDepositManual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const parsedFloor = floor.trim() === "" ? null : Number.parseInt(floor, 10);
  const parsedRent = parseMoneyInput(rent);
  const parsedDeposit = parseMoneyInput(depositAmount);
  const valid = Boolean(name.trim()) && parsedRent !== null && (!addTenantNow || (Boolean(tenantFullName.trim()) && parsedDeposit !== null));

  const onRoomNameChange = (value: string) => {
    setName(value);
    if (isFloorManual) return;

    const detectedFloor = detectFloorFromRoomName(value);
    setFloor(detectedFloor === null ? "" : String(detectedFloor));
  };

  useEffect(() => {
    if (!addTenantNow) return;
    if (!isDepositManual) {
      setDepositAmount(rent);
    }
  }, [rent, addTenantNow, isDepositManual]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Thêm phòng mới</h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin phòng</h4>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tên phòng *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => onRoomNameChange(e.target.value)}
            placeholder="VD: Phòng 302"
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Giá thuê *</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={rent}
            onChange={(e) => setRent(formatMoneyInput(e.target.value))}
            placeholder="VD: 4000000"
            className="num mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tầng</label>
          <input
            type="number"
            min={0}
            value={floor}
            onChange={(e) => {
              setIsFloorManual(true);
              setFloor(e.target.value);
            }}
            placeholder="Tự nhận diện từ tên phòng"
            className="num mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <input type="checkbox" checked={addTenantNow} onChange={(e) => setAddTenantNow(e.target.checked)} />
            Thêm người thuê ngay
          </label>
        </div>
      </div>
      {addTenantNow && (
        <div className="mt-3 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin người thuê</h4>
          <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Họ tên người thuê *</label>
            <input
              value={tenantFullName}
              onChange={(e) => setTenantFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Số điện thoại</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tenantPhone}
              onChange={(e) => setTenantPhone(sanitizeDigitsInput(e.target.value))}
              placeholder="VD: 090..."
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Địa chỉ</label>
            <input
              value={tenantAddress}
              onChange={(e) => setTenantAddress(e.target.value)}
              placeholder="Tuỳ chọn"
              className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          </div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiền cọc</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tiền cọc *</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={depositAmount} onChange={(e) => { setIsDepositManual(true); setDepositAmount(formatMoneyInput(e.target.value)); }} className="num mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
              <p className="mt-1 text-xs text-muted-foreground">Mặc định bằng 1 tháng tiền thuê, có thể chỉnh sửa.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ghi chú tiền cọc</label>
              <input value={depositNote} onChange={(e) => setDepositNote(e.target.value)} placeholder="Tuỳ chọn" className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            </div>
          </div>
        </div>
      )}
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
          disabled={!valid || submitting}
          onClick={async () => {
            const trimmedRoomName = name.trim();
            const trimmedTenantName = tenantFullName.trim();
            const trimmedPhone = tenantPhone.trim();
            if (!trimmedRoomName) { toast.error("Tên phòng không được để trống"); return; }
            if (parsedRent === null) { toast.error("Không được nhập số âm"); return; }
            if (addTenantNow) {
              if (!trimmedTenantName) { toast.error("Họ tên người thuê không được để trống"); return; }
              if (trimmedPhone && !isDigitsOnly(trimmedPhone)) { toast.error("Số điện thoại chỉ được chứa chữ số"); return; }
              if (parsedDeposit === null) { toast.error("Vui lòng nhập tiền cọc hợp lệ"); return; }
            }
            setSubmitting(true);
            try {
              await onCreate({
                name: trimmedRoomName,
                rent: parsedRent,
                floor: Number.isNaN(parsedFloor as number) ? null : parsedFloor,
                addTenantNow,
                tenantFullName: trimmedTenantName,
                tenantPhone: trimmedPhone || undefined,
                tenantAddress: tenantAddress.trim() || undefined,
                depositAmount: parsedDeposit ?? 0,
                depositNote: depositNote.trim() || undefined,
              });
            } finally {
              setSubmitting(false);
            }
          }}
          className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          {submitting ? "Đang lưu..." : "Thêm phòng"}
        </button>
      </div>
    </div>
  );
}
