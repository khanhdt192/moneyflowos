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
