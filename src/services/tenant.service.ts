import { supabase } from "@/integrations/supabase/client";

export type Tenant = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
};

export type CreateTenantInput = {
  userId: string;
  fullName: string;
  phone?: string;
  address?: string;
};

export type UpdateTenantInput = {
  fullName?: string;
  phone?: string;
  address?: string;
};

export const tenantService = {
  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    const payload = {
      user_id: input.userId,
      full_name: input.fullName,
      phone: input.phone ?? null,
      address: input.address ?? null,
    };

    const { data, error } = await (supabase as any)
      .from("rental_tenants")
      .insert(payload)
      .select("id, full_name, phone, address")
      .single();

    if (error) throw error;
    return data as Tenant;
  },

  async updateTenant(tenantId: string, input: UpdateTenantInput): Promise<Tenant> {
    const payload: Record<string, string | null> = {};

    if (input.fullName !== undefined) payload.full_name = input.fullName;
    if (input.phone !== undefined) payload.phone = input.phone || null;
    if (input.address !== undefined) payload.address = input.address || null;

    const { data, error } = await (supabase as any)
      .from("rental_tenants")
      .update(payload)
      .eq("id", tenantId)
      .select("id, full_name, phone, address")
      .single();

    if (error) throw error;
    return data as Tenant;
  },

  async deleteTenant(tenantId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("rental_tenants")
      .delete()
      .eq("id", tenantId);

    if (error) throw error;
  },
};
