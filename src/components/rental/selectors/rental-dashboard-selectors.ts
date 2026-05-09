import type {
  RentalBillingCycle,
  RentalElectricityReading,
  RentalRoom,
  RentalRoomBill,
} from "@/lib/finance-types";
import type { RentalOccupancy } from "@/services/occupancy.service";

export type ActiveOccupancyByRoomId = Record<string, RentalOccupancy | undefined>;

export type RentalDashboardSummary = {
  occupiedCount: number;
  emptyCount: number;
  occupiedRoomIds: string[];
  emptyRoomIds: string[];
  currentBills: RentalRoomBill[];
  totalRevenue: number;
  totalCollected: number;
  totalDebt: number;
  unpaidBills: RentalRoomBill[];
  missingReadings: RentalRoom[];
};

export type RentalDashboardTrendPoint = {
  month: string;
  revenue: number;
  collected: number;
};

export type RentalDashboardCycleContext = {
  /** UI-selected month in YYYY-MM format. */
  uiMonthKey: string;
  /** Billing-cycle database record resolved from the UI month, when it already exists locally. */
  billingCycle?: RentalBillingCycle;
  /**
   * Compatibility lookup key for current frontend bill/reading arrays.
   *
   * The database identity is billingCycle.id, but the current rental frontend state still stores
   * bill.cycleId and reading.cycleId as YYYY-MM strings. Keep that legacy lookup explicit so the
   * dashboard does not conceptually treat the UI month key as a DB cycle UUID.
   */
  frontendCycleKey: string;
};

export type RentalDashboardSelectorInput = {
  rooms: RentalRoom[];
  roomBills: RentalRoomBill[];
  electricityReadings: RentalElectricityReading[];
  activeOccupancyByRoomId: ActiveOccupancyByRoomId;
  uiMonthKey: string;
  billingCycles: RentalBillingCycle[];
  currentBillingCycle?: RentalBillingCycle;
};

export type RentalDashboardTrendInput = {
  roomBills: RentalRoomBill[];
  billingCycles: RentalBillingCycle[];
  referenceDate: Date;
};

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function resolveBillingCycleFromMonthKey(
  billingCycles: RentalBillingCycle[],
  uiMonthKey: string,
): RentalBillingCycle | undefined {
  const [yearText, monthText] = uiMonthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return undefined;
  }

  return billingCycles.find((cycle) => cycle.year === year && cycle.month === month);
}

export function createRentalDashboardCycleContext({
  uiMonthKey,
  billingCycles,
  currentBillingCycle,
}: {
  uiMonthKey: string;
  billingCycles: RentalBillingCycle[];
  currentBillingCycle?: RentalBillingCycle;
}): RentalDashboardCycleContext {
  return {
    uiMonthKey,
    billingCycle: currentBillingCycle ?? resolveBillingCycleFromMonthKey(billingCycles, uiMonthKey),
    frontendCycleKey: uiMonthKey,
  };
}

export function selectActiveOccupiedRoomIds(
  rooms: RentalRoom[],
  activeOccupancyByRoomId: ActiveOccupancyByRoomId,
): string[] {
  return rooms
    .filter((room) => !!activeOccupancyByRoomId[room.id])
    .map((room) => room.id);
}

export function selectEmptyRoomIds(
  rooms: RentalRoom[],
  activeOccupancyByRoomId: ActiveOccupancyByRoomId,
): string[] {
  return rooms
    .filter((room) => !activeOccupancyByRoomId[room.id])
    .map((room) => room.id);
}

export function selectCurrentBillByRoomId(
  rooms: RentalRoom[],
  roomBills: RentalRoomBill[],
  activeOccupancyByRoomId: ActiveOccupancyByRoomId,
  frontendCycleKey: string,
): Record<string, RentalRoomBill | undefined> {
  return Object.fromEntries(
    rooms.map((room) => {
      const activeOccupancy = activeOccupancyByRoomId[room.id];
      const bill = activeOccupancy
        ? roomBills.find(
            (candidate) =>
              candidate.occupancyId === activeOccupancy.id && candidate.cycleId === frontendCycleKey,
          )
        : undefined;

      return [room.id, bill];
    }),
  );
}

export function selectCurrentReadingByRoomId(
  rooms: RentalRoom[],
  electricityReadings: RentalElectricityReading[],
  activeOccupancyByRoomId: ActiveOccupancyByRoomId,
  frontendCycleKey: string,
): Record<string, RentalElectricityReading | undefined> {
  return Object.fromEntries(
    rooms.map((room) => {
      const activeOccupancy = activeOccupancyByRoomId[room.id];
      const reading = activeOccupancy
        ? electricityReadings.find(
            (candidate) =>
              candidate.occupancyId === activeOccupancy.id && candidate.cycleId === frontendCycleKey,
          )
        : undefined;

      return [room.id, reading];
    }),
  );
}

export function selectRentalDashboardSummary({
  rooms,
  roomBills,
  electricityReadings,
  activeOccupancyByRoomId,
  uiMonthKey,
  billingCycles,
  currentBillingCycle,
}: RentalDashboardSelectorInput): RentalDashboardSummary {
  const cycleContext = createRentalDashboardCycleContext({
    uiMonthKey,
    billingCycles,
    currentBillingCycle,
  });
  const occupiedRoomIds = selectActiveOccupiedRoomIds(rooms, activeOccupancyByRoomId);
  const emptyRoomIds = selectEmptyRoomIds(rooms, activeOccupancyByRoomId);
  const currentBillByRoomId = selectCurrentBillByRoomId(
    rooms,
    roomBills,
    activeOccupancyByRoomId,
    cycleContext.frontendCycleKey,
  );
  const currentReadingByRoomId = selectCurrentReadingByRoomId(
    rooms,
    electricityReadings,
    activeOccupancyByRoomId,
    cycleContext.frontendCycleKey,
  );

  const currentBills = occupiedRoomIds
    .map((roomId) => currentBillByRoomId[roomId])
    .filter((bill): bill is RentalRoomBill => !!bill);
  const totalRevenue = currentBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const totalCollected = currentBills.reduce((sum, bill) => sum + bill.paidAmount, 0);
  const unpaidBills = currentBills.filter((bill) => bill.paidAmount < bill.totalAmount);
  const missingReadings = rooms.filter(
    (room) => !!activeOccupancyByRoomId[room.id] && !currentReadingByRoomId[room.id],
  );

  return {
    occupiedCount: occupiedRoomIds.length,
    emptyCount: emptyRoomIds.length,
    occupiedRoomIds,
    emptyRoomIds,
    currentBills,
    totalRevenue,
    totalCollected,
    totalDebt: Math.max(totalRevenue - totalCollected, 0),
    unpaidBills,
    missingReadings,
  };
}

export function selectRentalDashboardTrend({
  roomBills,
  billingCycles,
  referenceDate,
}: RentalDashboardTrendInput): RentalDashboardTrendPoint[] {
  const months: RentalDashboardTrendPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const uiMonthKey = formatMonthKey(date.getFullYear(), date.getMonth() + 1);
    const cycleContext = createRentalDashboardCycleContext({ uiMonthKey, billingCycles });
    const bills = roomBills.filter((bill) => bill.cycleId === cycleContext.frontendCycleKey);
    const revenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const collected = bills.reduce((sum, bill) => sum + bill.paidAmount, 0);

    months.push({ month: `T${date.getMonth() + 1}`, revenue, collected });
  }

  return months;
}
