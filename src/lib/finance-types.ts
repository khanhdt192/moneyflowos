export type CategoryKey = "income" | "needs" | "wants" | "savings";

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
}

export interface MonthData {
  income: BudgetItem[];
  needs: BudgetItem[];
  wants: BudgetItem[];
  savings: BudgetItem[];
  /** Optional actual transactions recorded against this month */
  transactions: Transaction[];
}

export type TxType = "income" | "expense" | "savings" | "investment";

export interface Transaction {
  id: string;
  type: TxType;
  category: string;
  amount: number;
  /** ISO date YYYY-MM-DD */
  date: string;
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  monthlyContribution: number;
  color: string;
  /** Optional deadline ISO date YYYY-MM-DD */
  deadline?: string;
}

export interface RentalRoom {
  id: string;
  name: string;
  floor?: number;
  rent: number;
  occupied: boolean;
  tenant?: string;
  tenantPhone?: string;
  occupants?: number;
  allocationWeight?: number;
  electricityRateOverride?: number;
}

export type RentalAllocationRule = "equal_occupied" | "by_occupants" | "by_weight";

export interface RentalSettings {
  defaultElectricityRate: number;
  waterTotal: number;
  wifiTotal: number;
  cleaningTotal: number;
  otherTotal: number;
  allocationRule: RentalAllocationRule;
}

export type RentalBillingCycleStatus = "draft" | "finalized";

export interface RentalBillingCycle {
  id: string;
  month: number;
  year: number;
  status: RentalBillingCycleStatus;
  closedAt?: string;
}

export interface RentalRoomBill {
  id: string;
  roomId: string;
  cycleId: string;
  rentAmount: number;
  electricityAmount: number;
  waterAmount: number;
  wifiAmount: number;
  cleaningAmount: number;
  otherAmount: number;
  totalAmount: number;
  paidAmount: number;
  note?: string;
}

export interface RentalElectricityReading {
  id: string;
  roomId: string;
  cycleId: string;
  startIndex: number;
  endIndex: number;
  consumptionKwh: number;
  waterUsageM3?: number;
  manualElectricityAmount?: number;
}

export interface RentalState {
  rooms: RentalRoom[];
  settings: RentalSettings;
  billingCycles: RentalBillingCycle[];
  roomBills: RentalRoomBill[];
  electricityReadings: RentalElectricityReading[];
  /** Auto-sync occupied rent into the active month income (true by default) */
  autoSyncToIncome: boolean;
}

export interface Settings {
  name: string;
  currency: string; // unused for now, hardcoded VND
}

export interface FinanceState {
  /** YYYY-MM */
  activeMonth: string;
  months: Record<string, MonthData>;
  goals: Goal[];
  rental: RentalState;
  settings: Settings;
}

export const CATEGORY_META: Record<
  CategoryKey,
  { label: string; short: string; color: string; soft: string; description: string }
> = {
  income: {
    label: "Nguồn Thu Nhập",
    short: "Thu Nhập",
    color: "var(--income)",
    soft: "var(--income-soft)",
    description: "Tiền vào từ lương, đầu tư, kinh doanh",
  },
  needs: {
    label: "Chi Tiêu Thiết Yếu",
    short: "Thiết Yếu",
    color: "var(--needs)",
    soft: "var(--needs-soft)",
    description: "Nhà ở, điện nước, ăn uống, đi lại",
  },
  wants: {
    label: "Chi Tiêu Cá Nhân",
    short: "Cá Nhân",
    color: "var(--wants)",
    soft: "var(--wants-soft)",
    description: "Giải trí, mua sắm, du lịch",
  },
  savings: {
    label: "Tiết Kiệm & Đầu Tư",
    short: "Tiết Kiệm",
    color: "var(--savings)",
    soft: "var(--savings-soft)",
    description: "Quỹ khẩn cấp, đầu tư, mục tiêu dài hạn",
  },
};

/** YYYY-MM key for a Date */
export function monthKey(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const months = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];
  return `${months[m - 1]} ${y}`;
}

export function emptyMonth(): MonthData {
  return { income: [], needs: [], wants: [], savings: [], transactions: [] };
}
