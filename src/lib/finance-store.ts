import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  type BudgetItem,
  type CategoryKey,
  type FinanceState,
  type Goal,
  type InvoiceSettings,
  type MonthData,
  type RentalBillStatus,
  type RentalRoom,
  type RentalSettings,
  type RentalRoomBill,
  type Transaction,
  emptyMonth,
  monthKey,
  shiftMonth,
} from "./finance-types";
import { supabase } from "@/integrations/supabase/client";
import { cloud, fetchAllForUser } from "./supabase-data";

const UNDO_LIMIT = 25;

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tmp-${Math.random().toString(36).slice(2, 11)}`;

/* ─── empty state ─────────────────────────────────────────── */

function emptyState(): FinanceState {
  const m = monthKey();
  return {
    activeMonth: m,
    months: { [m]: emptyMonth() },
    goals: [],
    rental: {
      rooms: [],
      settings: {
        defaultElectricityRate: 3500,
        waterRatePerM3: 24000,
        wifiPerRoom: 0,
        cleaningPerRoom: 0,
        otherPerRoom: 0,
        otherName: "Phụ phí",
        allocationRule: "equal_occupied",
        t1ElectricityBill: 0,
        t1HasWifi: false,
        t1WifiPerRoom: 0,
        t1Cleaning: 0,
        t1OtherName: "Phụ phí",
        t1OtherPerRoom: 0,
        bankName: "",
        bankAccount: "",
        bankHolder: "",
        bankQrUrl: "",
        bankNoteTemplate: "Phong {room} T{month}/{year}",
      },
      invoiceSettings: {
        propertyName: "",
        address: "",
        contactPhone: "",
        logoUrl: "",
        footerNote: "Cảm ơn quý khách đã thanh toán đúng hạn.",
      },
      billingCycles: [],
      roomBills: [],
      electricityReadings: [],
      payments: [],
      autoSyncToIncome: true,
    },
    settings: { name: "Bạn", currency: "VND" },
  };
}

/* ─── helpers ─────────────────────────────────────────────── */

function mapBillRowToState(b: any, cycleId: string): RentalRoomBill {
  return {
    id: b.id,
    roomId: b.room_id,
    cycleId,
    rentAmount: Number(b.rent_amount ?? 0),
    electricityAmount: Number(b.electricity_amount ?? 0),
    waterAmount: Number(b.water_amount ?? 0),
    wifiAmount: Number(b.wifi_amount ?? 0),
    cleaningAmount: Number(b.cleaning_amount ?? 0),
    otherAmount: Number(b.other_amount ?? 0),
    totalAmount: Number(b.total_amount ?? 0),
    paidAmount: Number(b.paid_amount ?? 0),
    status: (b.status as RentalBillStatus) ?? "draft",
    confirmedAt: b.confirmed_at ?? undefined,
    paidAt: b.paid_at ?? undefined,
    note: b.note ?? undefined,
  };
}

/* ─── store ───────────────────────────────────────────────── */

type Listener = () => void;

class FinanceStore {
  private state: FinanceState = emptyState();
  private listeners = new Set<Listener>();
  private undoStack: FinanceState[] = [];
  private serverSnapshot: FinanceState = emptyState();
  private userId: string | null = null;
  private hydrating = false;
  private realtimeCh: ReturnType<typeof supabase.channel> | null = null;

  getSnapshot = () => this.state;
  getServerSnapshot = () => this.serverSnapshot;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  private commit(next: FinanceState, recordUndo = true) {
    if (recordUndo) {
      this.undoStack.push(this.state);
      if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    }
    this.state = next;
    this.emit();
  }

  private mutateMonth(mutator: (m: MonthData) => MonthData, recordUndo = true) {
    const key = this.state.activeMonth;
    const month = this.state.months[key] ?? emptyMonth();
    this.commit({ ...this.state, months: { ...this.state.months, [key]: mutator(month) } }, recordUndo);
  }

  private mutateRental(patch: Partial<FinanceState["rental"]>, recordUndo = true) {
    this.commit({ ...this.state, rental: { ...this.state.rental, ...patch } }, recordUndo);
  }

  /* ─── lifecycle ────────────────────────────────────────── */

  async hydrateForUser(userId: string) {
    if (this.hydrating) return;
    this.hydrating = true;
    this.userId = userId;
    try {
      const next = await fetchAllForUser(userId);
      this.undoStack = [];
      this.commit(next, false);
      this.subscribeRealtime(userId);
    } catch (err) {
      console.error("[finance-store] hydrate failed", err);
      toast.error("Không tải được dữ liệu — kiểm tra kết nối");
    } finally {
      this.hydrating = false;
    }
  }

  signOut() {
    this.userId = null;
    if (this.realtimeCh) {
      supabase.removeChannel(this.realtimeCh);
      this.realtimeCh = null;
    }
    this.undoStack = [];
    this.commit(emptyState(), false);
  }

  private subscribeRealtime(userId: string) {
    if (this.realtimeCh) supabase.removeChannel(this.realtimeCh);
    this.realtimeCh = supabase
      .channel(`mfos-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` }, () => this.refetchSilent())
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_items", filter: `user_id=eq.${userId}` }, () => this.refetchSilent())
      .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${userId}` }, () => this.refetchSilent())
      .on("postgres_changes", { event: "*", schema: "public", table: "rental_rooms", filter: `user_id=eq.${userId}` }, () => this.refetchSilent())
      .on("postgres_changes", { event: "*", schema: "public", table: "rental_room_bills", filter: `user_id=eq.${userId}` }, () => this.refetchSilent())
      .on("postgres_changes", { event: "*", schema: "public", table: "rental_payments", filter: `user_id=eq.${userId}` }, () => this.refetchSilent())
      .subscribe();
  }

  private refetchTimer: ReturnType<typeof setTimeout> | null = null;
  private refetchSilent() {
    if (!this.userId) return;
    if (this.refetchTimer) clearTimeout(this.refetchTimer);
    this.refetchTimer = setTimeout(async () => {
      if (!this.userId) return;
      try {
        const next = await fetchAllForUser(this.userId);
        this.commit({ ...next, activeMonth: this.state.activeMonth }, false);
      } catch { /* noop */ }
    }, 300);
  }

  /** Force a full refetch and return the fresh state */
  async refetch(): Promise<void> {
    if (!this.userId) return;
    try {
      const next = await fetchAllForUser(this.userId);
      this.commit({ ...next, activeMonth: this.state.activeMonth }, false);
    } catch (err) {
      console.error("[finance-store] refetch failed", err);
    }
  }

  /* ─── months ────────────────────────────────────────────── */

  setActiveMonth(key: string) {
    if (key === this.state.activeMonth) return;
    const months = { ...this.state.months };
    if (!months[key]) months[key] = emptyMonth();
    this.commit({ ...this.state, activeMonth: key, months }, false);
    if (this.userId) void cloud.updateProfile(this.userId, { active_month: key });
  }

  duplicateMonthFromPrev() {
    if (!this.userId) return;
    const key = this.state.activeMonth;
    const prev = shiftMonth(key, -1);
    const source = this.state.months[prev];
    if (!source) return;
    const tasks: Promise<unknown>[] = [];
    (["income", "needs", "wants", "savings"] as CategoryKey[]).forEach((cat) => {
      source[cat].forEach((item, idx) => {
        tasks.push(cloud.insertBudgetItem(this.userId!, key, cat, item.name, item.amount, idx));
      });
    });
    void Promise.all(tasks).then(() => this.refetchSilent());
  }

  /* ─── budget ────────────────────────────────────────────── */

  addBudgetItem(cat: CategoryKey, name: string, amount: number) {
    if (!this.userId) return;
    const tempId = uid();
    this.mutateMonth((m) => ({ ...m, [cat]: [...m[cat], { id: tempId, name, amount }] }));
    void cloud.insertBudgetItem(this.userId, this.state.activeMonth, cat, name, amount)
      .then((row) => {
        this.mutateMonth((m) => ({ ...m, [cat]: m[cat].map((i) => (i.id === tempId ? { ...i, id: row.id } : i)) }), false);
      })
      .catch(() => { toast.error("Không lưu được hạng mục"); this.refetchSilent(); });
  }

  updateBudgetItem(cat: CategoryKey, id: string, patch: Partial<BudgetItem>) {
    this.mutateMonth((m) => ({ ...m, [cat]: m[cat].map((i) => (i.id === id ? { ...i, ...patch } : i)) }), false);
    if (id.startsWith("tmp-") || !this.userId) return;
    const dbPatch: { name?: string; amount?: number } = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.amount !== undefined) dbPatch.amount = patch.amount;
    void cloud.updateBudgetItem(id, dbPatch).catch(() => { toast.error("Không lưu được thay đổi"); this.refetchSilent(); });
  }

  removeBudgetItem(cat: CategoryKey, id: string) {
    this.mutateMonth((m) => ({ ...m, [cat]: m[cat].filter((i) => i.id !== id) }));
    if (!this.userId) return;
    void cloud.deleteBudgetItem(id).catch(() => this.refetchSilent());
  }

  /* ─── transactions ──────────────────────────────────────── */

  addTransaction(tx: Omit<Transaction, "id">) {
    if (!this.userId) return;
    const tempId = uid();
    const targetMonth = monthKey(tx.date);
    const next = { ...this.state };
    next.months = { ...next.months };
    if (!next.months[targetMonth]) next.months[targetMonth] = emptyMonth();
    const m = next.months[targetMonth];
    next.months[targetMonth] = { ...m, transactions: [{ ...tx, id: tempId }, ...m.transactions] };
    this.commit(next);
    void cloud.insertTransaction(this.userId, tx)
      .then((row) => {
        this.mutateMonth((m2) =>
          m2 === next.months[targetMonth]
            ? { ...m2, transactions: m2.transactions.map((t) => (t.id === tempId ? { ...t, id: row.id } : t)) }
            : m2, false,
        );
        this.refetchSilent();
      })
      .catch(() => { toast.error("Không lưu được giao dịch"); this.refetchSilent(); });
  }

  removeTransaction(id: string) {
    const next = { ...this.state };
    next.months = { ...next.months };
    for (const k of Object.keys(next.months)) {
      const m = next.months[k];
      if (m.transactions.some((t) => t.id === id)) {
        next.months[k] = { ...m, transactions: m.transactions.filter((t) => t.id !== id) };
      }
    }
    this.commit(next);
    if (!this.userId || id.startsWith("tmp-")) return;
    void cloud.deleteTransaction(id).catch(() => this.refetchSilent());
  }

  /* ─── goals ─────────────────────────────────────────────── */

  addGoal(g: Omit<Goal, "id">) {
    if (!this.userId) return;
    const tempId = uid();
    this.commit({ ...this.state, goals: [...this.state.goals, { ...g, id: tempId }] });
    void cloud.insertGoal(this.userId, g)
      .then((row) => {
        this.commit({ ...this.state, goals: this.state.goals.map((x) => (x.id === tempId ? { ...x, id: row.id } : x)) }, false);
      })
      .catch(() => { toast.error("Không lưu được mục tiêu"); this.refetchSilent(); });
  }

  updateGoal(id: string, patch: Partial<Goal>) {
    this.commit({ ...this.state, goals: this.state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
    if (!this.userId || id.startsWith("tmp-")) return;
    void cloud.updateGoal(id, patch).catch(() => this.refetchSilent());
  }

  removeGoal(id: string) {
    this.commit({ ...this.state, goals: this.state.goals.filter((g) => g.id !== id) });
    if (!this.userId || id.startsWith("tmp-")) return;
    void cloud.deleteGoal(id).catch(() => this.refetchSilent());
  }

  /* ─── rooms ─────────────────────────────────────────────── */

  addRoom(name: string, rent: number) {
    if (!this.userId) return;
    const tempId = uid();
    const room: RentalRoom = { id: tempId, name, rent, occupied: false };
    this.mutateRental({ rooms: [...this.state.rental.rooms, room] });
    void cloud.insertRoom(this.userId, name, rent)
      .then((row) => {
        this.mutateRental({ rooms: this.state.rental.rooms.map((r) => (r.id === tempId ? { ...r, id: row.id } : r)) }, false);
      })
      .catch(() => { toast.error("Không lưu được phòng"); this.refetchSilent(); });
  }

  updateRoom(id: string, patch: Partial<RentalRoom>) {
    this.mutateRental({ rooms: this.state.rental.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
    if (!this.userId || id.startsWith("tmp-")) return;
    void cloud.updateRoom(id, patch).catch(() => this.refetchSilent());
  }

  removeRoom(id: string) {
    this.mutateRental({ rooms: this.state.rental.rooms.filter((r) => r.id !== id) });
    if (!this.userId || id.startsWith("tmp-")) return;
    void cloud.deleteRoom(id).catch(() => this.refetchSilent());
  }

  setRoomOccupied(id: string, occupied: boolean) {
    this.updateRoom(id, { occupied });
  }

  /* ─── rental settings ───────────────────────────────────── */

  updateRentalSettings(patch: Partial<RentalSettings>) {
    const merged = { ...this.state.rental.settings, ...patch };
    this.mutateRental({ settings: merged });
    if (!this.userId) return;
    void cloud.upsertRentalSettings(this.userId, merged).catch(() => {
      toast.error("Không lưu được cài đặt");
      this.refetchSilent();
    });
  }

  updateInvoiceSettings(patch: Partial<InvoiceSettings>) {
    const merged = { ...this.state.rental.invoiceSettings, ...patch };
    this.mutateRental({ invoiceSettings: merged });
    if (!this.userId) return;
    void cloud.upsertInvoiceSettings(this.userId, merged).catch(() => {
      toast.error("Không lưu được cài đặt hóa đơn");
      this.refetchSilent();
    });
  }

  /* ─── electricity readings ──────────────────────────────── */

  async upsertElectricityReading(roomId: string, cycleId: string, startIndex: number, endIndex: number, waterM3 = 0) {
    if (!this.userId) return;
    const [year, month] = cycleId.split("-").map(Number);
    const consumptionKwh = Math.max(endIndex - startIndex, 0);
    const prevReadings = this.state.rental.electricityReadings;
    const prevBills = this.state.rental.roomBills;

    // Optimistic update
    const existing = this.state.rental.electricityReadings.find((r) => r.roomId === roomId && r.cycleId === cycleId);
    const nextReading = { id: existing?.id ?? `${cycleId}:${roomId}`, roomId, cycleId, startIndex, endIndex, consumptionKwh, waterM3: waterM3 > 0 ? waterM3 : (existing?.waterM3 ?? 0) };
    this.mutateRental({
      electricityReadings: existing
        ? this.state.rental.electricityReadings.map((r) => (r.roomId === roomId && r.cycleId === cycleId ? nextReading : r))
        : [...this.state.rental.electricityReadings, nextReading],
    });

    try {
      // Ensure cycle exists
      const dbCycleId = await cloud.upsertCycle(this.userId, month, year);
      const row = await cloud.upsertReading(this.userId, roomId, dbCycleId, startIndex, endIndex, waterM3);
      // Update the reading id from temp to real; keep cycleId as formatted "YYYY-MM" string (not the UUID)
      const final = { ...nextReading, id: row.id, cycleId: cycleId, consumptionKwh: Math.max(row.end_index - row.start_index, 0), waterM3: row.water_m3 ?? 0 };
      this.mutateRental({
        electricityReadings: this.state.rental.electricityReadings.map((r) => (r.id === nextReading.id ? final : r)),
      }, false);
      const billRow = await cloud.getRoomBillByRoomAndCycle(this.userId, roomId, dbCycleId);
      if (billRow) {
        const nextBill = mapBillRowToState(billRow, cycleId);
        const existingIdx = this.state.rental.roomBills.findIndex((b) => b.id === nextBill.id || (b.roomId === roomId && b.cycleId === cycleId));
        const updatedBills = [...this.state.rental.roomBills];
        if (existingIdx >= 0) updatedBills[existingIdx] = nextBill;
        else updatedBills.push(nextBill);
        this.mutateRental({ roomBills: updatedBills }, false);
      }
      await this.refetch();
    } catch (err) {
      console.error("[store] upsertReading failed", err);
      toast.error("Không lưu được số đo");
      this.mutateRental({ electricityReadings: prevReadings, roomBills: prevBills }, false);
      throw err;
    }
  }

  /* ─── billing: draft creation ───────────────────────────── */

  /**
   * Create or recalculate draft bills for all occupied rooms.
   * - Never overwrites confirmed/paid/partial_paid bills.
   * - If a room already has a draft, recalculates amounts.
   * Returns { created, skipped }.
   */
  async createDraftBills(month: number, year: number): Promise<{ created: number; skipped: number }> {
    if (!this.userId) throw new Error("Not logged in");
    await cloud.upsertCycle(this.userId, month, year);
    await this.refetch();
    return { created: 0, skipped: 0 };
  }

  /**
   * Confirm all draft bills for the given month.
   * Bills that are already confirmed/paid are left untouched.
   */
  async confirmBills(month: number, year: number): Promise<{ confirmed: number; alreadyDone: number }> {
    if (!this.userId) throw new Error("Not logged in");
    const cycleId = `${year}-${String(month).padStart(2, "0")}`;
    const draftBills = this.state.rental.roomBills.filter((b) => b.cycleId === cycleId && b.status === "draft");
    const doneBills = this.state.rental.roomBills.filter((b) => b.cycleId === cycleId && b.status !== "draft" && b.status !== "cancelled");

    for (const bill of draftBills) {
      await cloud.confirmBill(bill.id);
    }

    if (draftBills.length > 0) await this.refetch();
    return { confirmed: draftBills.length, alreadyDone: doneBills.length };
  }

  /**
   * Confirm a single bill by ID. No-op if already confirmed.
   */
  async confirmSingleBill(billId: string): Promise<void> {
    if (!this.userId) return;
    const bill = this.state.rental.roomBills.find((b) => b.id === billId);
    if (!bill || bill.status !== "ready") return;

    // Optimistic update
    this.mutateRental({
      roomBills: this.state.rental.roomBills.map((b) =>
        b.id === billId ? { ...b, status: "confirmed" as RentalBillStatus, confirmedAt: new Date().toISOString() } : b,
      ),
    });

    try {
      await cloud.confirmBill(billId);
    } catch {
      toast.error("Không chốt được hóa đơn");
      this.refetchSilent();
    }
  }

  /* ─── payments ──────────────────────────────────────────── */

  /**
   * Record a payment against a bill.
   * Automatically updates bill status and paid_amount.
   */
  async recordPayment(billId: string, amount: number, method = "cash", note?: string): Promise<void> {
    if (!this.userId) return;
    const bill = this.state.rental.roomBills.find((b) => b.id === billId);
    if (!bill) return;

    const newPaid = Math.min(bill.paidAmount + amount, bill.totalAmount);
    const remaining = bill.totalAmount - newPaid;
    let newStatus: RentalBillStatus = "confirmed";
    if (remaining <= 0) newStatus = "paid";
    else if (newPaid > 0) newStatus = "partial_paid";

    // Optimistic update
    this.mutateRental({
      roomBills: this.state.rental.roomBills.map((b) =>
        b.id === billId
          ? { ...b, paidAmount: newPaid, status: newStatus, paidAt: remaining <= 0 ? new Date().toISOString() : b.paidAt }
          : b,
      ),
    });

    try {
      await cloud.insertPayment(this.userId, billId, bill.roomId, amount, method, note);
      await cloud.updateBillPayment(billId, newPaid, bill.totalAmount);
      await this.refetch();
    } catch (err) {
      console.error("[store] recordPayment failed", err);
      toast.error("Không lưu được thanh toán");
      this.refetchSilent();
    }
  }

  async rollbackBill(billId: string): Promise<void> {
    if (!this.userId) return;
    const bill = this.state.rental.roomBills.find((b) => b.id === billId);
    if (!bill || bill.status === "paid" || bill.status === "draft") return;
    this.mutateRental({
      roomBills: this.state.rental.roomBills.map((b) => b.id === billId ? { ...b, status: "draft", paidAmount: 0, paidAt: undefined, confirmedAt: undefined } : b),
      payments: this.state.rental.payments.filter((p) => p.billId !== billId),
    });
    try {
      await cloud.resetBillToDraft(billId);
      await cloud.deletePaymentsByBill(billId);
      await this.refetch();
    } catch {
      toast.error("Không hoàn tác được hóa đơn");
      this.refetchSilent();
    }
  }

  /** Legacy compat — will migrate to recordPayment */
  markRoomBillPaid(roomBillId: string, paidAmount: number) {
    const bill = this.state.rental.roomBills.find((b) => b.id === roomBillId);
    if (!bill) return;
    const delta = Math.max(0, paidAmount - bill.paidAmount);
    if (delta > 0) void this.recordPayment(roomBillId, delta);
  }

  /** generateBillingCycle compatibility shim → creates drafts then confirms */
  generateBillingCycle(month: number, year: number) {
    void this.createDraftBills(month, year);
  }

  /* ─── app settings ──────────────────────────────────────── */

  updateSettings(patch: Partial<FinanceState["settings"]>) {
    this.commit({ ...this.state, settings: { ...this.state.settings, ...patch } });
    if (!this.userId) return;
    void cloud.updateProfile(this.userId, { full_name: patch.name, currency: patch.currency }).catch(() => toast.error("Không lưu được cài đặt"));
  }

  /* ─── undo / reset ──────────────────────────────────────── */

  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.state = prev;
    this.emit();
    this.refetchSilent();
    return true;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  async resetAll() {
    if (!this.userId) return;
    try {
      await cloud.wipe(this.userId);
      await cloud.seedDemo(this.userId);
      await this.hydrateForUser(this.userId);
      toast.success("Đã khôi phục dữ liệu mẫu");
    } catch (err) {
      console.error(err);
      toast.error("Không thể khôi phục dữ liệu");
    }
  }

  async wipeAll() {
    if (!this.userId) return;
    try {
      await cloud.wipe(this.userId);
      await this.hydrateForUser(this.userId);
      toast.success("Đã xoá toàn bộ dữ liệu");
    } catch {
      toast.error("Không thể xoá dữ liệu");
    }
  }

  getUserId() {
    return this.userId;
  }
}

export const financeStore = new FinanceStore();

/* ─── hooks ───────────────────────────────────────────────── */

export function useFinance(): FinanceState {
  return useSyncExternalStore(financeStore.subscribe, financeStore.getSnapshot, financeStore.getServerSnapshot);
}

export function useActiveMonth(): MonthData {
  const state = useFinance();
  return state.months[state.activeMonth] ?? emptyMonth();
}

export function useFinanceActions() {
  return financeStore;
}
