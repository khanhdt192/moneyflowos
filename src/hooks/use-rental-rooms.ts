import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RentalBillStatus = "draft" | "confirmed" | "partial_paid" | "paid" | string;

type RentalRoomOverviewRow = {
  room_id: string;
  name: string;
  tenant: string | null;
  floor: number | null;
  bill_id: string | null;
  bill_status: RentalBillStatus | null;
  total_amount: number | null;
  electricity_amount: number | null;
  water_amount: number | null;
  wifi_amount: number | null;
  cleaning_amount: number | null;
  other_amount: number | null;
};

type RentalBillUi = {
  id: string;
  status: RentalBillStatus;
  total: number;
  electricity: number;
  water: number;
  wifi: number;
  cleaning: number;
  other: number;
};

export type RentalRoomUiModel = {
  room_id: string;
  name: string;
  tenant: string | null;
  floor: number | null;
  bill_id: string | null;
  bill_status: RentalBillStatus | null;
  total_amount: number | null;
  bill: RentalBillUi | null;
  ui: {
    status: "missing" | "ready" | "confirmed" | "partial" | "paid";
    can_confirm: boolean;
    can_pay: boolean;
  };
};

function getActions(row: Pick<RentalRoomOverviewRow, "bill_id" | "bill_status">) {
  if (!row.bill_id) {
    return {
      can_confirm: false,
      can_pay: false,
    };
  }

  if (row.bill_status === "draft") {
    return {
      can_confirm: true,
      can_pay: false,
    };
  }

  if (row.bill_status === "confirmed") {
    return {
      can_confirm: false,
      can_pay: true,
    };
  }

  if (row.bill_status === "paid") {
    return {
      can_confirm: false,
      can_pay: false,
    };
  }

  return {
    can_confirm: false,
    can_pay: false,
  };
}

export function mapRoom(row: RentalRoomOverviewRow): RentalRoomUiModel {
  const uiStatus: RentalRoomUiModel["ui"]["status"] = !row.bill_id
    ? "missing"
    : row.bill_status === "draft"
      ? "ready"
      : row.bill_status === "confirmed"
        ? "confirmed"
        : row.bill_status === "partial_paid"
          ? "partial"
          : row.bill_status === "paid"
            ? "paid"
            : "missing";

  const bill = row.bill_id
    ? {
        id: row.bill_id,
        status: row.bill_status ?? "draft",
        total: row.total_amount ?? 0,
        electricity: row.electricity_amount ?? 0,
        water: row.water_amount ?? 0,
        wifi: row.wifi_amount ?? 0,
        cleaning: row.cleaning_amount ?? 0,
        other: row.other_amount ?? 0,
      }
    : null;

  const mappedRow: RentalRoomUiModel = {
    room_id: row.room_id,
    name: row.name,
    tenant: row.tenant,
    floor: row.floor,
    bill_id: row.bill_id,
    bill_status: row.bill_status,
    total_amount: row.total_amount,
    bill,
    ui: {
      status: uiStatus,
      ...getActions(row),
    },
  };

  return mappedRow;
}

export function useRentalRooms(currentCycleId: string | null | undefined) {
  const [rooms, setRooms] = useState<RentalRoomUiModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchRooms() {
    if (!currentCycleId) {
      setRooms([]);
      return;
    }

    setLoading(true);
    setError(null);

    let cycleId = currentCycleId;
    if (/^\d{4}-\d{2}$/.test(currentCycleId)) {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setError("Not logged in");
        setRooms([]);
        setLoading(false);
        return;
      }
      const [year, month] = currentCycleId.split("-").map(Number);
      const { data: cycleRow, error: cycleError } = await supabase
        .from("rental_billing_cycles")
        .select("id")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month)
        .single();
      if (cycleError) {
        setError(cycleError.message);
        setRooms([]);
        setLoading(false);
        return;
      }
      cycleId = cycleRow.id;
    }

    console.log("cycleId UUID:", cycleId);

    if (!cycleId) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
        .from("rental_room_overview")
        .select("*")
        .eq("cycle_id", cycleId);

    if (fetchError) {
        setError(fetchError.message);
        setRooms([]);
        setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => mapRoom(row as RentalRoomOverviewRow));
    setRooms(data ? [...mapped] : []);
    setLoading(false);
  }

  useEffect(() => {
    void fetchRooms();
  }, [currentCycleId]);

  return {
    rooms,
    loading,
    error,
    refetch: fetchRooms,
  };
}
