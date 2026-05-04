import { supabase } from "@/integrations/supabase/client";

export type RoomTenantAssignment = {
  tenantId: string | null;
  occupied: boolean;
};

export const roomService = {
  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_rooms")
      .delete()
      .eq("id", roomId);

    if (error) throw error;
  },

  async getTenantAssignment(roomId: string): Promise<RoomTenantAssignment> {
    const { data, error } = await (supabase as any)
      .from("rental_rooms")
      .select("tenant_id, occupied")
      .eq("id", roomId)
      .single();

    if (error) throw error;

    return {
      tenantId: (data?.tenant_id as string | null) ?? null,
      occupied: Boolean(data?.occupied),
    };
  },

  async assignTenant(roomId: string, tenantId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_rooms")
      .update({ tenant_id: tenantId, occupied: true })
      .eq("id", roomId);

    if (error) throw error;
  },

  async restoreTenantAssignment(roomId: string, tenantId: string | null): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_rooms")
      .update({ tenant_id: tenantId, occupied: Boolean(tenantId) })
      .eq("id", roomId);

    if (error) throw error;
  },

  async removeTenant(roomId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_rooms")
      .update({ tenant_id: null, occupied: false })
      .eq("id", roomId);

    if (error) throw error;
  },
};
