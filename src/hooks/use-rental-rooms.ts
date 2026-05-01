import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type RentalBillStatus = "draft" | "confirmed" | "partial_paid" | "paid" | string;

type RentalRoomOverviewRow = {
  room_id: string;
  name: string;
  tenant: string | null;
  floor: number | null;
  start_index: number | null;
  end_index: number | null;
  water_m3: number | null;
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
  reading: {
    start: number | null;
    end: number | null;
    water: number | null;
  };
  bill: RentalBillUi | null;
  ui: {
    status: "missing" | "ready" | "confirmed" | "partial" | "paid";
    can_confirm: boolean;
    can_pay: boolean;
  };
};

function mapStatus(row: Pick<RentalRoomOverviewRow, "bill_id" | "bill_status">): RentalRoomUiModel["ui"]["status"] {
  if (!row.bill_id) return "missing";

  switch (row.bill_status) {
    case "draft":
      return "ready";
    case "confirmed":
      return "confirmed";
    case "partial_paid":
      return "partial";
    case "paid":
      return "paid";
    default:
      return "missing";
  }
}

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

  return {
    room_id: row.room_id,
    name: row.name,
    tenant: row.tenant,
    floor: row.floor,
    reading: {
      start: row.start_index,
      end: row.end_index,
      water: row.water_m3,
    },
    bill,
    ui: {
      status: mapStatus(row),
      ...getActions(row),
    },
  };
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

    const { data, error: fetchError } = await supabase
        .from("rental_room_overview")
        .select("*")
        .eq("cycle_id", currentCycleId);

    if (fetchError) {
        setError(fetchError.message);
        setRooms([]);
        setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => mapRoom(row as RentalRoomOverviewRow));
    setRooms(mapped);
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
