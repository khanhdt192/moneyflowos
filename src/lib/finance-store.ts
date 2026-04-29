import { useSyncExternalStore } from "react";
import {
  type BudgetItem,
  type CategoryKey,
  type FinanceState,
  type Goal,
  type MonthData,
  type RentalRoom,
  type Transaction,
  emptyMonth,
  monthKey,
  shiftMonth,
} from "./finance-types";

const STORAGE_KEY = "moneyflow:state:v2";
const UNDO_LIMIT = 25;

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 9)
    : Math.random().toString(36).slice(2, 11);

/* ---------------------------------- Seed ---------------------------------- */

function seedState(): FinanceState {
  const current = monthKey();
  const prev = shiftMonth(current, -1);

  const seedMonth = (variance = 0): MonthData => ({
    income: [
      { id: uid(), name: "Lương chính", amount: 45_000_000 + variance },
      { id: uid(), name: "Freelance", amount: 12_000_000 + variance / 2 },
      { id: uid(), name: "Cho thuê căn hộ", amount: 8_000_000 },
    ],
    needs: [
      { id: uid(), name: "Tiền nhà", amount: 12_000_000 },
      { id: uid(), name: "Ăn uống", amount: 6_000_000 },
      { id: uid(), name: "Đi lại", amount: 2_500_000 },
      { id: uid(), name: "Điện nước, internet", amount: 1_500_000 },
    ],
    wants: [
      { id: uid(), name: "Cà phê & nhà hàng", amount: 3_000_000 },
      { id: uid(), name: "Giải trí, mua sắm", amount: 4_000_000 },
      { id: uid(), name: "Du lịch", amount: 2_500_000 },
    ],
    savings: [
      { id: uid(), name: "Quỹ khẩn cấp", amount: 6_000_000 },
      { id: uid(), name: "Đầu tư cổ phiếu", amount: 10_000_000 },
      { id: uid(), name: "Quỹ mua nhà", amount: 15_500_000 },
    ],
    transactions: [],
  });

  const today = new Date();
  const isoDate = (d: number) => {
    const dt = new Date(today.getFullYear(), today.getMonth(), d);
    return dt.toISOString().slice(0, 10);
  };

  const initialTx: Transaction[] = [
    { id: uid(), type: "expense", category: "Ăn uống", amount: 185_000, date: isoDate(Math.min(today.getDate(), 1)), note: "Bữa trưa" },
    { id: uid(), type: "expense", category: "Cà phê & nhà hàng", amount: 95_000, date: isoDate(Math.min(today.getDate(), 2)), note: "Cà phê" },
    { id: uid(), type: "income", category: "Freelance", amount: 4_500_000, date: isoDate(Math.min(today.getDate(), 3)), note: "Dự án website" },
  ];

  const currentMonth = seedMonth(0);
  currentMonth.transactions = initialTx;

  return {
    activeMonth: current,
    months: {
      [prev]: seedMonth(-2_000_000),
      [current]: currentMonth,
    },
    goals: [
      {
        id: uid(),
        name: "Quỹ mua nhà",
        emoji: "🏠",
        target: 2_500_000_000,
        saved: 280_000_000,
        monthlyContribution: 15_500_000,
        color: "var(--income)",
      },
      {
        id: uid(),
        name: "Quỹ khẩn cấp",
        emoji: "🛡️",
        target: 180_000_000,
        saved: 96_000_000,
        monthlyContribution: 6_000_000,
        color: "var(--savings)",
      },
      {
        id: uid(),
        name: "Tự do tài chính",
        emoji: "🎯",
        target: 1_000_000_000,
        saved: 145_000_000,
        monthlyContribution: 10_000_000,
        color: "var(--wants)",
      },
    ],
    rental: {
      autoSyncToIncome: true,
      rooms: [
        { id: uid(), name: "Phòng 101", rent: 4_500_000, occupied: true, tenant: "Anh Minh" },
        { id: uid(), name: "Phòng 102", rent: 3_500_000, occupied: true, tenant: "Chị Lan" },
        { id: uid(), name: "Phòng 201", rent: 4_000_000, occupied: false },
      ],
    },
    settings: { name: "Khánh", currency: "VND" },
  };
}

/* ------------------------------ Persistence ------------------------------ */

function loadState(): FinanceState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as FinanceState;
    // Minimal validation
    if (!parsed?.months || !parsed?.activeMonth) return seedState();
    // Ensure active month exists
    if (!parsed.months[parsed.activeMonth]) {
      parsed.months[parsed.activeMonth] = emptyMonth();
    }
    // Backfill optional fields
    parsed.goals ??= [];
    parsed.rental ??= { rooms: [], autoSyncToIncome: true };
    parsed.settings ??= { name: "Khánh", currency: "VND" };
    for (const k of Object.keys(parsed.months)) {
      const m = parsed.months[k];
      m.transactions ??= [];
      m.income ??= [];
      m.needs ??= [];
      m.wants ??= [];
      m.savings ??= [];
    }
    return parsed;
  } catch {
    return seedState();
  }
}

function saveState(state: FinanceState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota/permission errors
  }
}

/* --------------------------------- Store --------------------------------- */

type Listener = () => void;

class FinanceStore {
  private state: FinanceState;
  private listeners = new Set<Listener>();
  private undoStack: FinanceState[] = [];
  private hydrated = false;
  private serverSnapshot: FinanceState;

  constructor() {
    // SSR-safe initial state — same shape every render until hydration
    this.serverSnapshot = seedState();
    this.state = this.serverSnapshot;
  }

  hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    this.state = loadState();
    this.emit();
  }

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
    saveState(next);
    this.emit();
  }

  private mutateMonth(mutator: (m: MonthData) => MonthData, recordUndo = true) {
    const key = this.state.activeMonth;
    const month = this.state.months[key] ?? emptyMonth();
    const nextMonth = mutator(month);
    this.commit(
      {
        ...this.state,
        months: { ...this.state.months, [key]: nextMonth },
      },
      recordUndo,
    );
  }

  /* ------------------------------- Months ------------------------------- */

  setActiveMonth(key: string) {
    if (key === this.state.activeMonth) return;
    const months = { ...this.state.months };
    if (!months[key]) months[key] = emptyMonth();
    this.commit({ ...this.state, activeMonth: key, months }, false);
  }

  duplicateMonthFromPrev() {
    const key = this.state.activeMonth;
    const prev = shiftMonth(key, -1);
    const source = this.state.months[prev];
    if (!source) return;
    const cloneItems = (xs: BudgetItem[]) => xs.map((x) => ({ ...x, id: uid() }));
    const next: MonthData = {
      income: cloneItems(source.income),
      needs: cloneItems(source.needs),
      wants: cloneItems(source.wants),
      savings: cloneItems(source.savings),
      transactions: [],
    };
    this.commit({
      ...this.state,
      months: { ...this.state.months, [key]: next },
    });
  }

  /* ------------------------------- Budget ------------------------------- */

  addBudgetItem(cat: CategoryKey, name: string, amount: number) {
    this.mutateMonth((m) => ({
      ...m,
      [cat]: [...m[cat], { id: uid(), name, amount }],
    }));
  }

  updateBudgetItem(cat: CategoryKey, id: string, patch: Partial<BudgetItem>) {
    this.mutateMonth(
      (m) => ({
        ...m,
        [cat]: m[cat].map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }),
      false, // skip undo for keystroke noise
    );
  }

  removeBudgetItem(cat: CategoryKey, id: string) {
    this.mutateMonth((m) => ({ ...m, [cat]: m[cat].filter((i) => i.id !== id) }));
  }

  /* ----------------------------- Transactions ---------------------------- */

  addTransaction(tx: Omit<Transaction, "id">) {
    const id = uid();
    const targetMonth = monthKey(tx.date);
    const next = { ...this.state };
    next.months = { ...next.months };
    if (!next.months[targetMonth]) next.months[targetMonth] = emptyMonth();
    const month = next.months[targetMonth];
    next.months[targetMonth] = {
      ...month,
      transactions: [{ ...tx, id }, ...month.transactions],
    };
    this.commit(next);
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
  }

  /* -------------------------------- Goals -------------------------------- */

  addGoal(g: Omit<Goal, "id">) {
    this.commit({ ...this.state, goals: [...this.state.goals, { ...g, id: uid() }] });
  }

  updateGoal(id: string, patch: Partial<Goal>) {
    this.commit({
      ...this.state,
      goals: this.state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    });
  }

  removeGoal(id: string) {
    this.commit({ ...this.state, goals: this.state.goals.filter((g) => g.id !== id) });
  }

  /* -------------------------------- Rental ------------------------------- */

  addRoom(name: string, rent: number) {
    const room: RentalRoom = { id: uid(), name, rent, occupied: false };
    this.commit({
      ...this.state,
      rental: { ...this.state.rental, rooms: [...this.state.rental.rooms, room] },
    });
  }

  updateRoom(id: string, patch: Partial<RentalRoom>) {
    this.commit({
      ...this.state,
      rental: {
        ...this.state.rental,
        rooms: this.state.rental.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    });
  }

  removeRoom(id: string) {
    this.commit({
      ...this.state,
      rental: {
        ...this.state.rental,
        rooms: this.state.rental.rooms.filter((r) => r.id !== id),
      },
    });
  }

  setRoomOccupied(id: string, occupied: boolean) {
    this.updateRoom(id, { occupied });
  }

  /* ------------------------------ Settings ------------------------------- */

  updateSettings(patch: Partial<FinanceState["settings"]>) {
    this.commit({ ...this.state, settings: { ...this.state.settings, ...patch } });
  }

  /* -------------------------------- Misc -------------------------------- */

  undo() {
    const prev = this.undoStack.pop();
    if (!prev) return false;
    this.state = prev;
    saveState(prev);
    this.emit();
    return true;
  }

  resetAll() {
    this.undoStack = [];
    this.commit(seedState(), false);
  }

  canUndo() {
    return this.undoStack.length > 0;
  }
}

export const financeStore = new FinanceStore();

/* --------------------------------- Hooks --------------------------------- */

export function useFinance(): FinanceState {
  return useSyncExternalStore(
    financeStore.subscribe,
    financeStore.getSnapshot,
    financeStore.getServerSnapshot,
  );
}

export function useActiveMonth(): MonthData {
  const state = useFinance();
  return state.months[state.activeMonth] ?? emptyMonth();
}

export function useFinanceActions() {
  return financeStore;
}
