import { useState } from "react";
import { Plus, X, Check, Trash2, ChevronRight, Home, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import { useTenant } from "@/hooks/useTenant";
import { roomService } from "@/services/room.service";
import type { Tenant } from "@/services/tenant.service";
import type { RentalRoom } from "@/lib/finance-types";
import { formatMoney } from "@/utils/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

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

export function Phong() {
  const state = useFinance();
  const actions = useFinanceActions();
  const [selectedRoom, setSelectedRoom] = useState<RentalRoom | null>(null);
  const [adding, setAdding] = useState(false);
  const { createAndAssign } = useTenant(async () => {
    await actions.refetch();
  });

  const now = new Date();
  const cycleId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const debtMap = Object.fromEntries(
    state.rental.roomBills
      .filter((b) => b.cycleId === cycleId && b.paidAmount < b.totalAmount)
      .map((b) => [b.roomId, b.totalAmount - b.paidAmount]),
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
          onCreate={async ({ name, rent, floor, addTenantNow, tenantFullName, tenantPhone, tenantAddress }) => {
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
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tổng bill</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thanh toán</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nợ</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.rental.rooms.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Chưa có phòng nào — thêm phòng đầu tiên
                </td>
              </tr>
            )}
            {state.rental.rooms.map((room) => {
              const debt = debtMap[room.id] ?? 0;
              const status = getRoomStatus(room, debt > 0);
              const cfg = STATUS_CONFIG[status];
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
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {(() => {
                      const bill = state.rental.roomBills.find((b) => b.roomId === room.id && b.cycleId === cycleId);
                      return bill ? <span className="font-medium text-foreground">{formatMoney(bill.totalAmount)}</span> : <span className="opacity-40">—</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(() => {
                      const bill = state.rental.roomBills.find((b) => b.roomId === room.id && b.cycleId === cycleId);
                      return bill ? <span className="text-emerald-600">{formatMoney(bill.paidAmount)}</span> : <span className="opacity-40">—</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {debt > 0 ? (
                      <span className="font-semibold text-rose-600">{formatMoney(debt)}</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
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
  const [existingTenants, setExistingTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");

  const bill = room ? state.rental.roomBills.find((b) => b.roomId === room.id && b.cycleId === cycleId) : null;

  const handleOpen = (r: RentalRoom | null) => {
    if (r) {
      setName(r.name);
      setRent(String(r.rent));
      setEditing(false);
      setTenantMode("none");
      setTenantName(r.tenantInfo?.fullName || "");
      setTenantPhone(r.tenantInfo?.phone || "");
      setTenantAddress(r.tenantInfo?.address || "");
      setSelectedTenantId("");
    }
  };

  const loadTenants = async () => {
    const userId = actions.getUserId();
    if (!userId) throw new Error("Không tìm thấy người dùng đăng nhập");
    const tenants = await listTenants(userId);
    setExistingTenants(tenants);
    return tenants;
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
                    { label: "Giá thuê", value: formatMoney(room.rent) },
                    {
                      label: "Trạng thái",
                      value: isRoomOccupied(room) ? "Đang thuê" : "Trống",
                    },
                  ]}
                />

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Khách thuê</h4>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
                    {room.tenantInfo ? (
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

                {tenantMode !== "none" && (
                  <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                    {(tenantMode === "edit" || tenantMode === "add") && (
                      <>
                        <input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Họ tên" className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                        <input value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} placeholder="Số điện thoại" className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                        <input value={tenantAddress} onChange={(e) => setTenantAddress(e.target.value)} placeholder="Địa chỉ" className="h-9 w-full rounded-lg border border-border px-3 text-sm" />
                      </>
                    )}
                    {(tenantMode === "change" || tenantMode === "add") && (
                      <select
                        value={selectedTenantId}
                        onChange={(e) => setSelectedTenantId(e.target.value)}
                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      >
                        <option value="">Chọn người thuê có sẵn</option>
                        {existingTenants
                          .filter((tenant) => tenantMode !== "change" || tenant.id !== room?.tenantInfo?.id)
                          .map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.full_name} {tenant.phone ? `- ${tenant.phone}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setTenantMode("none")} className="flex-1 rounded-lg border border-border py-2 text-sm">Huỷ</button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (!room) return;
                            if (tenantMode === "edit" && room.tenantInfo) {
                              await update(room.tenantInfo.id, { fullName: tenantName.trim(), phone: tenantPhone.trim(), address: tenantAddress.trim() });
                              toast.success("Đã cập nhật người thuê");
                            }
                            if (tenantMode === "change" && selectedTenantId) {
                              await assignExisting(room.id, selectedTenantId);
                              toast.success("Đã đổi người thuê");
                            }
                            if (tenantMode === "add") {
                              if (selectedTenantId) {
                                await assignExisting(room.id, selectedTenantId);
                              } else {
                                const userId = actions.getUserId();
                                if (!userId) throw new Error("Không tìm thấy người dùng đăng nhập");
                                await createAndAssign(room.id, {
                                  userId,
                                  fullName: tenantName.trim(),
                                  phone: tenantPhone.trim() || undefined,
                                  address: tenantAddress.trim() || undefined,
                                });
                              }
                              toast.success("Đã thêm người thuê vào phòng");
                            }
                            setTenantMode("none");
                          } catch {
                            toast.error("Không thể lưu thông tin người thuê");
                          }
                        }}
                        className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background"
                      >Lưu</button>
                    </div>
                  </div>
                )}

                {bill && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Hóa đơn tháng này
                    </h4>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-sm">
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
                  {room.tenantInfo ? (
                    <>
                      <button type="button" onClick={() => setTenantMode("edit")} className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30">Sửa người thuê</button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Xóa người thuê khỏi phòng này?")) return;
                          try {
                            await removeFromRoom(room.id);
                            toast.success("Đã xóa người thuê khỏi phòng");
                          } catch {
                            toast.error("Không thể xóa người thuê khỏi phòng");
                          }
                        }}
                        className="w-full rounded-lg border border-destructive/40 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5"
                      >Xóa người thuê khỏi phòng</button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await loadTenants();
                            setTenantMode("change");
                          } catch {
                            toast.error("Không tải được danh sách người thuê");
                          }
                        }}
                        className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted/30"
                      >Đổi người thuê</button>
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
  onCreate: (payload: {
    name: string;
    rent: number;
    floor: number | null;
    addTenantNow: boolean;
    tenantFullName: string;
    tenantPhone?: string;
    tenantAddress?: string;
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
  const [submitting, setSubmitting] = useState(false);
  const parsedFloor = floor.trim() === "" ? null : Number.parseInt(floor, 10);
  const valid = Boolean(name.trim()) && parseFloat(rent) > 0 && (!addTenantNow || Boolean(tenantFullName.trim()));

  const onRoomNameChange = (value: string) => {
    setName(value);
    if (isFloorManual) return;

    const detectedFloor = detectFloorFromRoomName(value);
    setFloor(detectedFloor === null ? "" : String(detectedFloor));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Thêm phòng mới</h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
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
            type="number"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
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
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
              value={tenantPhone}
              onChange={(e) => setTenantPhone(e.target.value)}
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
            setSubmitting(true);
            try {
              await onCreate({
                name: name.trim(),
                rent: parseFloat(rent),
                floor: Number.isNaN(parsedFloor as number) ? null : parsedFloor,
                addTenantNow,
                tenantFullName: tenantFullName.trim(),
                tenantPhone: tenantPhone.trim() || undefined,
                tenantAddress: tenantAddress.trim() || undefined,
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
