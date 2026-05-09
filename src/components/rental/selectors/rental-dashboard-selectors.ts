import type {
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
  cycleId: string,
): Record<string, RentalRoomBill | undefined> {
  return Object.fromEntries(
    rooms.map((room) => {
      const activeOccupancy = activeOccupancyByRoomId[room.id];
      const bill = activeOccupancy
        ? roomBills.find(
            (candidate) =>
              candidate.occupancyId === activeOccupancy.id && candidate.cycleId === cycleId,
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
  cycleId: string,
): Record<string, RentalElectricityReading | undefined> {
  return Object.fromEntries(
    rooms.map((room) => {
      const activeOccupancy = activeOccupancyByRoomId[room.id];
      const reading = activeOccupancy
        ? electricityReadings.find(
            (candidate) =>
              candidate.occupancyId === activeOccupancy.id && candidate.cycleId === cycleId,
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
  cycleId,
}: {
  rooms: RentalRoom[];
  roomBills: RentalRoomBill[];
  electricityReadings: RentalElectricityReading[];
  activeOccupancyByRoomId: ActiveOccupancyByRoomId;
  cycleId: string;
}): RentalDashboardSummary {
  const occupiedRoomIds = selectActiveOccupiedRoomIds(rooms, activeOccupancyByRoomId);
  const emptyRoomIds = selectEmptyRoomIds(rooms, activeOccupancyByRoomId);
  const currentBillByRoomId = selectCurrentBillByRoomId(
    rooms,
    roomBills,
    activeOccupancyByRoomId,
    cycleId,
  );
  const currentReadingByRoomId = selectCurrentReadingByRoomId(
    rooms,
    electricityReadings,
    activeOccupancyByRoomId,
    cycleId,
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

export function selectRentalDashboardTrend(
  roomBills: RentalRoomBill[],
  referenceDate: Date,
): RentalDashboardTrendPoint[] {
  const months: RentalDashboardTrendPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const cycleId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bills = roomBills.filter((bill) => bill.cycleId === cycleId);
    const revenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const collected = bills.reduce((sum, bill) => sum + bill.paidAmount, 0);

    months.push({ month: `T${date.getMonth() + 1}`, revenue, collected });
  }

  return months;
}
