import { useCallback, useState } from "react";
import { roomService } from "@/services/room.service";
import { tenantService, type CreateTenantInput, type UpdateTenantInput } from "@/services/tenant.service";

type RefetchRooms = () => Promise<unknown>;

export function useTenant(refetchRooms: RefetchRooms) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const createAndAssign = useCallback(
    async (roomId: string, payload: CreateTenantInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const tenant = await tenantService.createTenant(payload);
        await roomService.assignTenant(roomId, tenant.id);
        await refetchRooms();
        return tenant;
      } catch (err) {
        console.error("[useTenant.createAndAssign] failed", err);
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchRooms],
  );

  const update = useCallback(
    async (tenantId: string, payload: UpdateTenantInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const tenant = await tenantService.updateTenant(tenantId, payload);
        await refetchRooms();
        return tenant;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchRooms],
  );

  const remove = useCallback(
    async (roomId: string, tenantId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await roomService.removeTenant(roomId);
        await tenantService.deleteTenant(tenantId);
        await refetchRooms();
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refetchRooms],
  );

  return {
    createAndAssign,
    update,
    remove,
    isLoading,
    error,
  };
}
