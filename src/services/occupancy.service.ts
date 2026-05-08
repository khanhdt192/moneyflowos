import { supabase } from "@/integrations/supabase/client";

export type RentalOccupancyStatus = "active" | "ended";

export type RentalOccupancy = {
  id: string;
  user_id: string;
  room_id: string;
  tenant_id: string;
  status: RentalOccupancyStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type CreateOccupancyInput = {
  userId: string;
  roomId: string;
  tenantId: string;
  startedAt?: string;
};

export const occupancyService = {
  async getActiveOccupancyByRoom(roomId: string): Promise<RentalOccupancy | null> {
    const { data, error } = await (supabase as any)
      .from("rental_occupancies")
      .select("*")
      .eq("room_id", roomId)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;
    return (data as RentalOccupancy | null) ?? null;
  },

  async listActiveOccupanciesByRoomIds(roomIds: string[]): Promise<RentalOccupancy[]> {
    if (!roomIds.length) return [];

    const { data, error } = await (supabase as any)
      .from("rental_occupancies")
      .select("*")
      .in("room_id", roomIds)
      .eq("status", "active");

    if (error) throw error;
    return (data ?? []) as RentalOccupancy[];
  },

  async createOccupancy(input: CreateOccupancyInput): Promise<RentalOccupancy> {
    const activeOccupancy = await occupancyService.getActiveOccupancyByRoom(input.roomId);
    if (activeOccupancy) {
      throw new Error("Phòng đã có lượt ở đang hoạt động");
    }

    const { data, error } = await (supabase as any)
      .from("rental_occupancies")
      .insert({
        user_id: input.userId,
        room_id: input.roomId,
        tenant_id: input.tenantId,
        status: "active",
        started_at: input.startedAt ?? new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as RentalOccupancy;
  },

  async endOccupancy(
    occupancyId: string,
    endedAt = new Date().toISOString(),
  ): Promise<RentalOccupancy> {
    const { data, error } = await (supabase as any)
      .from("rental_occupancies")
      .update({ status: "ended", ended_at: endedAt })
      .eq("id", occupancyId)
      .eq("status", "active")
      .select("*")
      .single();

    if (error) throw error;
    return data as RentalOccupancy;
  },

  async restoreOccupancyToActive(occupancyId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_occupancies")
      .update({ status: "active", ended_at: null })
      .eq("id", occupancyId);

    if (error) throw error;
  },

  async deleteOccupancy(occupancyId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_occupancies")
      .delete()
      .eq("id", occupancyId);

    if (error) throw error;
  },
};
