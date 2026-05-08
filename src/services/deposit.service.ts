import { supabase } from "@/integrations/supabase/client";
import { occupancyService } from "@/services/occupancy.service";
import { depositTransactionService } from "@/services/rental/deposit.service";

export type CreateDepositInput = {
  tenantId: string;
  roomId: string;
  occupancyId: string;
  amount: number;
  note?: string;
};

export type RentalDeposit = {
  id: string;
  tenant_id: string;
  room_id: string;
  occupancy_id: string | null;
  amount: number;
  status: "active" | "pending_settlement" | "settled";
  note: string | null;
  collected_at: string;
  settled_at: string | null;
  vacated_at: string | null;
  settlement_note: string | null;
  created_at: string;
};

export type RentalDepositForTab = RentalDeposit & {
  tenant_full_name: string;
  tenant_phone: string | null;
  room_name: string;
  occupancy_started_at: string | null;
  occupancy_ended_at: string | null;
};

type DepositJoinRow = RentalDeposit & {
  rental_tenants?: { full_name?: string | null; phone?: string | null } | { full_name?: string | null; phone?: string | null }[] | null;
  rental_rooms?: { name?: string | null } | { name?: string | null }[] | null;
  rental_occupancies?: { started_at?: string | null; ended_at?: string | null } | { started_at?: string | null; ended_at?: string | null }[] | null;
};

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapDepositForTab(row: DepositJoinRow): RentalDepositForTab {
  const tenant = firstJoin(row.rental_tenants);
  const room = firstJoin(row.rental_rooms);
  const occupancy = firstJoin(row.rental_occupancies);

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    room_id: row.room_id,
    occupancy_id: row.occupancy_id ?? null,
    amount: Number(row.amount ?? 0),
    status: row.status,
    note: row.note ?? null,
    collected_at: row.collected_at,
    settled_at: row.settled_at ?? null,
    vacated_at: row.vacated_at ?? null,
    settlement_note: row.settlement_note ?? null,
    created_at: row.created_at,
    tenant_full_name: tenant?.full_name || "—",
    tenant_phone: tenant?.phone ?? null,
    room_name: room?.name || "—",
    occupancy_started_at: occupancy?.started_at ?? null,
    occupancy_ended_at: occupancy?.ended_at ?? null,
  };
}

export const depositService = {
  async createDeposit(input: CreateDepositInput): Promise<RentalDeposit> {
    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .insert({
        tenant_id: input.tenantId,
        room_id: input.roomId,
        occupancy_id: input.occupancyId,
        amount: input.amount,
        note: input.note ?? null,
        status: "active",
      })
      .select("*")
      .single();

    if (error) throw error;

    const deposit = data as RentalDeposit;

    try {
      await depositTransactionService.createDepositTransaction({
        depositId: deposit.id,
        roomId: deposit.room_id,
        tenantId: deposit.tenant_id,
        occupancyId: input.occupancyId,
        transactionType: "create",
        amount: deposit.amount,
        note: deposit.note ?? undefined,
      });
    } catch (transactionError) {
      await (supabase as any).from("rental_deposits").delete().eq("id", deposit.id);
      throw transactionError;
    }

    return deposit;
  },

  async deleteDepositForRollback(depositId: string): Promise<void> {
    const { error: transactionError } = await (supabase as any)
      .from("rental_deposit_transactions")
      .delete()
      .eq("deposit_id", depositId);

    if (transactionError) throw transactionError;

    const { error } = await (supabase as any)
      .from("rental_deposits")
      .delete()
      .eq("id", depositId);

    if (error) throw error;
  },

  async getActiveDepositByTenant(tenantId: string): Promise<RentalDeposit | null> {
    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as RentalDeposit | null) ?? null;
  },

  async getActiveDepositByOccupancy(occupancyId: string): Promise<RentalDeposit | null> {
    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .select("*")
      .eq("occupancy_id", occupancyId)
      .eq("status", "active")
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as RentalDeposit | null) ?? null;
  },

  async listCurrentActiveDepositsByOccupancyIds(occupancyIds: string[]): Promise<RentalDeposit[]> {
    if (!occupancyIds.length) return [];

    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .select("*")
      .in("occupancy_id", occupancyIds)
      .eq("status", "active")
      .order("collected_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as RentalDeposit[];
  },

  async getCurrentRoomDepositByActiveOccupancy(roomId: string): Promise<RentalDeposit | null> {
    const activeOccupancy = await occupancyService.getActiveOccupancyByRoom(roomId);
    if (!activeOccupancy) return null;

    return depositService.getActiveDepositByOccupancy(activeOccupancy.id);
  },

  async getActiveDepositByRoom(roomId: string): Promise<RentalDeposit | null> {
    return depositService.getCurrentRoomDepositByActiveOccupancy(roomId);
  },

  async listCurrentActiveDepositsByRoomIds(roomIds: string[]): Promise<RentalDeposit[]> {
    if (!roomIds.length) return [];

    const activeOccupancies = await occupancyService.listActiveOccupanciesByRoomIds(roomIds);
    return depositService.listCurrentActiveDepositsByOccupancyIds(
      activeOccupancies.map((occupancy) => occupancy.id),
    );
  },

  async listDepositsForTab(): Promise<RentalDepositForTab[]> {
    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .select(`
        id,
        tenant_id,
        room_id,
        amount,
        occupancy_id,
        status,
        note,
        collected_at,
        settled_at,
        vacated_at,
        settlement_note,
        created_at,
        rental_tenants:tenant_id(full_name, phone),
        rental_rooms:room_id(name),
        rental_occupancies:occupancy_id(started_at, ended_at)
      `)
      .in("status", ["active", "pending_settlement", "settled"])
      .order("collected_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as DepositJoinRow[]).map(mapDepositForTab);
  },

  async moveActiveOccupancyDepositToPendingSettlement(
    occupancyId: string,
    vacatedAt = new Date().toISOString(),
  ): Promise<RentalDeposit | null> {
    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .update({ status: "pending_settlement", vacated_at: vacatedAt })
      .eq("occupancy_id", occupancyId)
      .eq("status", "active")
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return (data as RentalDeposit | null) ?? null;
  },

  async moveActiveRoomDepositToPendingSettlement(
    roomId: string,
    vacatedAt = new Date().toISOString(),
  ): Promise<RentalDeposit | null> {
    const activeOccupancy = await occupancyService.getActiveOccupancyByRoom(roomId);
    if (!activeOccupancy) return null;

    return depositService.moveActiveOccupancyDepositToPendingSettlement(activeOccupancy.id, vacatedAt);
  },

  async restoreDepositToActive(depositId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_deposits")
      .update({ status: "active", vacated_at: null })
      .eq("id", depositId);

    if (error) throw error;
  },
};
