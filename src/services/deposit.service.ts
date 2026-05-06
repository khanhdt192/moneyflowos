import { supabase } from "@/integrations/supabase/client";
import { depositTransactionService } from "@/services/rental/deposit.service";

export type CreateDepositInput = {
  tenantId: string;
  roomId: string;
  amount: number;
  note?: string;
};

export type RentalDeposit = {
  id: string;
  tenant_id: string;
  room_id: string;
  amount: number;
  status: "active" | "settled";
  note: string | null;
  collected_at: string;
  settled_at: string | null;
  created_at: string;
};

export const depositService = {
  async createDeposit(input: CreateDepositInput): Promise<RentalDeposit> {
    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .insert({
        tenant_id: input.tenantId,
        room_id: input.roomId,
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

  async getActiveDepositByRoom(roomId: string): Promise<RentalDeposit | null> {
    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .select("*")
      .eq("room_id", roomId)
      .eq("status", "active")
      .order("collected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as RentalDeposit | null) ?? null;
  },

  async listActiveDepositsByRoomIds(roomIds: string[]): Promise<RentalDeposit[]> {
    if (!roomIds.length) return [];
    const { data, error } = await (supabase as any)
      .from("rental_deposits")
      .select("*")
      .in("room_id", roomIds)
      .eq("status", "active")
      .order("collected_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as RentalDeposit[];
  },
};
