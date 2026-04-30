import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Pencil, Trash2, Check, DoorOpen, DoorClosed, Home } from "lucide-react";
import { toast } from "sonner";
import { useFinance, useFinanceActions } from "@/lib/finance-store";
import type { RentalRoom } from "@/lib/finance-types";
import { formatCompact, formatVND } from "@/lib/format";

export function RentalBoard() {
  const state = useFinance();
  const actions = useFinanceActions();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const now = new Date();
  const [cycleMonth, setCycleMonth] = useState(now.getMonth() + 1);
  const [cycleYear, setCycleYear] = useState(now.getFullYear());
  const cycleId = `${cycleYear}-${String(cycleMonth).padStart(2, "0")}`;

  const stats = useMemo(() => {
    const rooms = state.rental.rooms;
    const occupied = rooms.filter((r) => r.occupied);
    const monthlyIncome = occupied.reduce((s, r) => s + r.rent, 0);
    const potentialIncome = rooms.reduce((s, r) => s + r.rent, 0);
    const occupancy = rooms.length > 0 ? (occupied.length / rooms.length) * 100 : 0;
    return {
      total: rooms.length,
      occupied: occupied.length,
      empty: rooms.length - occupied.length,
      monthlyIncome,
      potentialIncome,
      missedIncome: potentialIncome - monthlyIncome,
      occupancy,
    };
  }, [state.rental.rooms]);

  const billingPreview = useMemo(() => {
    const roomBills = state.rental.roomBills.filter((b) => b.cycleId === cycleId).map((b) => ({
      roomId: b.roomId,
      roomName: state.rental.rooms.find((r) => r.id === b.roomId)?.name ?? b.roomId,
      rent: b.rentAmount,
      electricity: b.electricityAmount,
      shared: b.waterAmount + b.wifiAmount + b.otherAmount,
      total: b.totalAmount,
    }));
    const totalMustCollect = roomBills.reduce((sum, r) => sum + r.total, 0);
    return { roomBills, totalMustCollect };
  }, [state.rental.roomBills, state.rental.rooms, cycleId]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Tỷ lệ thuê" value={`${stats.occupancy.toFixed(0)}%`} sub={`${stats.occupied}/${stats.total} phòng`} color="var(--income)" />
        <StatCard label="Thu nhập tháng" value={formatCompact(stats.monthlyIncome)} sub="từ phòng đang thuê" color="var(--savings)" />
        <StatCard label="Tiềm năng" value={formatCompact(stats.potentialIncome)} sub="nếu kín 100%" color="var(--investments)" />
        <StatCard label="Bỏ lỡ" value={formatCompact(stats.missedIncome)} sub="từ phòng trống" color="var(--needs)" />
      </div>

      {/* Rooms grid */}
      <RentalSettingsPanel />
      <BillingCyclePanel
        cycleMonth={cycleMonth}
        cycleYear={cycleYear}
        onMonthChange={setCycleMonth}
        onYearChange={setCycleYear}
        onGenerate={() => {
          actions.generateBillingCycle(cycleMonth, cycleYear);
          toast.success(`Đã chốt kỳ ${cycleMonth}/${cycleYear}`);
        }}
      />
      <ElectricityInputPanel cycleId={cycleId} />

      <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Bảng tính tiền tháng (MVP)</h3>
          <span className="text-xs text-muted-foreground">Áp dụng rule tầng 1 + phòng thường</span>
        </div>
        <div className="space-y-2">
          {billingPreview.roomBills.map((bill) => (
            <div key={bill.roomId} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
              <div>
                <div className="text-sm font-semibold">{bill.roomName}</div>
                <div className="text-xs text-muted-foreground">Thuê: {formatVND(bill.rent)} · Tiền điện: {formatVND(bill.electricity)} · Phí DV: {formatVND(bill.shared)}</div>
              </div>
              <div className="num text-sm font-bold">{formatVND(bill.total)}</div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>Tổng phải thu</span>
            <span className="num">{formatVND(billingPreview.totalMustCollect)}</span>
          </div>
        </div>
      </div>
      <RoomBillsList cycleId={cycleId} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {state.rental.rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              isEditing={editing === room.id}
              onEdit={() => setEditing(room.id)}
              onCancel={() => setEditing(null)}
              onToggle={() => {
                actions.setRoomOccupied(room.id, !room.occupied);
                toast.success(
                  !room.occupied ? `${room.name}: Đã có khách thuê` : `${room.name}: Phòng trống`,
                );
              }}
              onSave={(patch) => {
                actions.updateRoom(room.id, patch);
                setEditing(null);
                toast.success("Đã cập nhật phòng");
              }}
              onDelete={() => {
                if (confirm(`Xoá ${room.name}?`)) {
                  actions.removeRoom(room.id);
                  toast.success("Đã xoá phòng", {
                    action: { label: "Hoàn tác", onClick: () => actions.undo() },
                  });
                }
              }}
            />
          ))}
        </AnimatePresence>

        {adding ? (
          <NewRoomCard
            onCancel={() => setAdding(false)}
            onCreate={(name, rent) => {
              actions.addRoom(name, rent);
              setAdding(false);
              toast.success(`Đã thêm phòng ${name}`);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-all hover:border-foreground/30 hover:bg-card/70 hover:text-foreground"
          >
            <Plus className="h-5 w-5" strokeWidth={2.4} />
            <span className="text-sm font-semibold">Thêm phòng</span>
          </button>
        )}
      </div>
    </div>
  );
}

function BillingCyclePanel({ cycleMonth, cycleYear, onMonthChange, onYearChange, onGenerate }: { cycleMonth: number; cycleYear: number; onMonthChange: (m: number) => void; onYearChange: (y: number) => void; onGenerate: () => void; }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-sm font-semibold">Chốt kỳ hóa đơn</h3>
      <div className="flex items-end gap-2">
        <label className="text-xs">Tháng<input type="number" min={1} max={12} value={cycleMonth} onChange={(e) => onMonthChange(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} className="num mt-1 h-10 w-20 rounded-xl border border-border bg-background px-2" /></label>
        <label className="text-xs">Năm<input type="number" value={cycleYear} onChange={(e) => onYearChange(Number(e.target.value) || new Date().getFullYear())} className="num mt-1 h-10 w-24 rounded-xl border border-border bg-background px-2" /></label>
        <button type="button" onClick={onGenerate} className="h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background">Chốt tiền tháng</button>
      </div>
    </div>
  );
}

function ElectricityInputPanel({ cycleId }: { cycleId: string }) {
  const state = useFinance();
  const actions = useFinanceActions();
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-sm font-semibold">Nhập điện theo phòng ({cycleId})</h3>
      <div className="space-y-2">
        {state.rental.rooms.filter((r) => r.occupied).map((room) => {
          const existing = state.rental.electricityReadings.find((x) => x.roomId === room.id && x.cycleId === cycleId);
          return <ElectricityRow key={room.id} room={room} initialStart={existing?.startIndex ?? 0} initialEnd={existing?.endIndex ?? 0} initialWater={existing?.waterUsageM3 ?? 0} initialManualElectric={existing?.manualElectricityAmount ?? 0} onSave={(start, end, water, manualElectric) => actions.upsertElectricityReading(room.id, cycleId, start, end, water, manualElectric)} />;
        })}
      </div>
    </div>
  );
}

function ElectricityRow({ room, initialStart, initialEnd, initialWater, initialManualElectric, onSave }: { room: RentalRoom; initialStart: number; initialEnd: number; initialWater: number; initialManualElectric: number; onSave: (start: number, end: number, water: number, manualElectric?: number) => void; }) {
  const [start, setStart] = useState(String(initialStart));
  const [end, setEnd] = useState(String(initialEnd));
  const [water, setWater] = useState(String(initialWater));
  const [manualElectric, setManualElectric] = useState(String(initialManualElectric));
  return <div className="flex items-end gap-2 rounded-xl border border-border/60 p-2"><div className="min-w-32 text-sm font-semibold">{room.name}</div>{room.floor === 1 ? <input type="number" value={manualElectric} onChange={(e) => setManualElectric(e.target.value)} className="num h-9 w-28 rounded-lg border border-border px-2" placeholder="Tiền điện" /> : <><input type="number" value={start} onChange={(e) => setStart(e.target.value)} className="num h-9 w-24 rounded-lg border border-border px-2" placeholder="Số cũ" /><input type="number" value={end} onChange={(e) => setEnd(e.target.value)} className="num h-9 w-24 rounded-lg border border-border px-2" placeholder="Số mới" /></>}<input type="number" value={water} onChange={(e) => setWater(e.target.value)} className="num h-9 w-24 rounded-lg border border-border px-2" placeholder="Nước m3" /><button type="button" className="h-9 rounded-lg border border-border px-3 text-xs" onClick={() => onSave(Number(start) || 0, Number(end) || 0, Number(water) || 0, Number(manualElectric) || 0)}>Lưu</button></div>;
}

function RoomBillsList({ cycleId }: { cycleId: string }) {
  const state = useFinance();
  const actions = useFinanceActions();
  const roomMap = Object.fromEntries(state.rental.rooms.map((r) => [r.id, r]));
  const bills = state.rental.roomBills.filter((b) => b.cycleId === cycleId);
  return <div className="rounded-3xl border border-border bg-card p-4 shadow-card"><h3 className="mb-3 text-sm font-semibold">Danh sách hóa đơn ({cycleId})</h3><div className="space-y-2">{bills.map((b) => { const remaining = Math.max(b.totalAmount - b.paidAmount, 0); return <div key={b.id} className="rounded-xl border border-border/60 p-3"><div className="flex items-center justify-between"><div className="text-sm font-semibold">{roomMap[b.roomId]?.name ?? b.roomId}</div><div className="num text-sm font-bold">{formatVND(b.totalAmount)}</div></div><div className="mt-1 text-xs text-muted-foreground">Đã thu: {formatVND(b.paidAmount)} · Còn thiếu: {formatVND(remaining)}</div><button type="button" className="mt-2 h-8 rounded-lg border border-border px-2 text-xs" onClick={() => actions.markRoomBillPaid(b.id, b.totalAmount)}>Đánh dấu đã thu đủ</button></div>; })}</div></div>;
}

function RentalSettingsPanel() {
  const state = useFinance();
  const actions = useFinanceActions();
  const settings = state.rental.settings;

  const fields: Array<{ key: "defaultElectricityRate" | "waterTotal" | "wifiTotal" | "cleaningTotal" | "otherTotal"; label: string }> = [
    { key: "defaultElectricityRate", label: "Giá điện mặc định (đ/kWh)" },
    { key: "waterTotal", label: "Nước chung/tháng" },
    { key: "wifiTotal", label: "Wifi chung/tháng" },
    { key: "cleaningTotal", label: "Dọn vệ sinh/tháng" },
    { key: "otherTotal", label: "Phụ phí khác/tháng" },
  ];

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Cấu hình chi phí cho thuê</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((f) => (
          <label key={f.key} className="text-xs text-muted-foreground">
            {f.label}
            <input
              type="number"
              value={settings[f.key]}
              onChange={(e) => actions.updateRentalSettings({ [f.key]: Number(e.target.value) || 0 })}
              className="num mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-right text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="num mt-2 text-xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function RoomCard({
  room,
  isEditing,
  onEdit,
  onCancel,
  onToggle,
  onSave,
  onDelete,
}: {
  room: RentalRoom;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onToggle: () => void;
  onSave: (patch: Partial<RentalRoom>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [rent, setRent] = useState(String(room.rent));
  const [tenant, setTenant] = useState(room.tenant ?? "");

  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="rounded-3xl border border-border bg-card p-5 shadow-card"
      >
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Chỉnh sửa phòng
          </span>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onCancel}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên phòng"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40"
          />
          <input
            type="number"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            placeholder="Giá thuê / tháng"
            className="num h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <input
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="Tên người thuê (tuỳ chọn)"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={onDelete}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onSave({ name, rent: parseFloat(rent) || 0, tenant: tenant.trim() || undefined })}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground text-sm font-semibold text-background"
            >
              <Check className="h-4 w-4" />
              Lưu
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl"
            style={{
              background: room.occupied
                ? "color-mix(in oklab, var(--income) 14%, transparent)"
                : "color-mix(in oklab, var(--needs) 12%, transparent)",
              color: room.occupied ? "var(--income)" : "var(--needs)",
            }}
          >
            <Home className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <h3 className="text-base font-bold tracking-tight text-foreground">{room.name}</h3>
            <div className="text-[11px] text-muted-foreground">
              {room.occupied ? room.tenant ?? "Đang thuê" : "Trống"}
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Chỉnh sửa"
          onClick={onEdit}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-foreground/[0.05] hover:text-foreground group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        <span className="num text-2xl font-bold tabular-nums text-foreground">
          {formatVND(room.rent)}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">/ tháng</span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[12px] font-semibold transition-all ${
          room.occupied
            ? "border-income/40 bg-income/10 text-income hover:bg-income/15"
            : "border-border bg-background/40 text-muted-foreground hover:bg-foreground/[0.04]"
        }`}
      >
        {room.occupied ? <DoorClosed className="h-3.5 w-3.5" /> : <DoorOpen className="h-3.5 w-3.5" />}
        {room.occupied ? "Đang có khách" : "Đánh dấu đã thuê"}
      </button>
    </motion.div>
  );
}

function NewRoomCard({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (name: string, rent: number) => void;
}) {
  const [name, setName] = useState("");
  const [rent, setRent] = useState("");
  const valid = name.trim() && parseFloat(rent) > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-3xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-center justify-between pb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Phòng mới
        </span>
        <button
          type="button"
          aria-label="Huỷ"
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Phòng 202"
          autoFocus
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40"
        />
        <input
          type="number"
          value={rent}
          onChange={(e) => setRent(e.target.value)}
          placeholder="Giá thuê / tháng"
          className="num h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="button"
          disabled={!valid}
          onClick={() => onCreate(name.trim(), parseFloat(rent))}
          className="h-10 w-full rounded-xl bg-foreground text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          Thêm phòng
        </button>
      </div>
    </motion.div>
  );
}
