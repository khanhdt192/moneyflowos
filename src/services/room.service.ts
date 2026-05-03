import { supabase } from "@/integrations/supabase/client";

export const roomService = {
  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_rooms")
      .delete()
      .eq("id", roomId);

    if (error) throw error;
  },

  async assignTenant(roomId: string, tenantId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_rooms")
      .update({ tenant_id: tenantId })
      .eq("id", roomId);

    if (error) throw error;
  },

  async removeTenant(roomId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_rooms")
      .update({ tenant_id: null })
      .eq("id", roomId);

    if (error) throw error;
  },
};
